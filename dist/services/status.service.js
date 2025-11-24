"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusService = void 0;
const axios_1 = __importDefault(require("axios"));
const status_parser_1 = require("./parsers/status.parser");
const client_1 = require("@prisma/client");
const cache_1 = require("../lib/cache");
// Use PrismaClient to interact with the configured DATABASE_URL (Postgres in dev)
const prisma = new client_1.PrismaClient();
class StatusService {
    constructor() {
        var _a, _b, _c, _d;
        this.parser = new status_parser_1.StatusParser();
        this.retryAttempts = Number((_b = (_a = process.env.DB_RETRY_ATTEMPTS) !== null && _a !== void 0 ? _a : process.env.RETRY_ATTEMPTS) !== null && _b !== void 0 ? _b : 5);
        this.retryDelayMs = Number((_d = (_c = process.env.DB_RETRY_DELAY_MS) !== null && _c !== void 0 ? _c : process.env.RETRY_DELAY_MS) !== null && _d !== void 0 ? _d : 300);
    }
    // Simple retry helper with exponential backoff
    async retry(fn, attempts = 3, initialDelayMs = 300) {
        let lastErr;
        let delay = initialDelayMs;
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            }
            catch (err) {
                lastErr = err;
                if (i < attempts - 1) {
                    await new Promise((res) => setTimeout(res, delay));
                    delay *= 2;
                }
            }
        }
        throw lastErr;
    }
    async checkServiceStatus(slug) {
        const service = await prisma.service.findUnique({
            where: { slug },
        });
        if (!service) {
            throw new Error(`Service not found: ${slug}`);
        }
        // Check if this is a custom service - use different logic
        if (service.isCustom) {
            return this.checkCustomService(service);
        }
        const startTime = Date.now();
        try {
            const response = await axios_1.default.get(service.statusUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'StatusWatch/1.0'
                }
            });
            const responseTime = Date.now() - startTime;
            const html = response.data;
            // Parse the status page based on the service
            const status = await this.parser.parse(slug, html);
            // Map parsed status to boolean isUp used by Prisma StatusCheck
            const isUp = status.status === 'operational';
            await this.retry(() => prisma.statusCheck.create({
                data: {
                    serviceId: service.id,
                    isUp,
                    responseTime: responseTime,
                    statusCode: (response && response.status) ? response.status : null,
                    checkedAt: new Date()
                }
            }), this.retryAttempts, this.retryDelayMs);
            return {
                slug: service.slug,
                name: service.name,
                status: status.status,
                message: status.message,
                lastChecked: new Date(),
                responseTime,
                incidents: status.incidents
            };
        }
        catch (error) {
            console.error(`Error checking ${service.name}:`, error);
            // Save failed check
            const responseTime = Date.now() - startTime;
            try {
                await this.retry(() => prisma.statusCheck.create({
                    data: {
                        serviceId: service.id,
                        isUp: false,
                        responseTime,
                        statusCode: null,
                        checkedAt: new Date()
                    }
                }), this.retryAttempts, this.retryDelayMs);
            }
            catch (err) {
                // If even retries fail, log and move on — don't throw from cron tasks
                console.error('Failed to persist failed statusCheck after retries:', err);
            }
            return {
                slug: service.slug,
                name: service.name,
                status: 'unknown',
                message: 'Failed to fetch status',
                lastChecked: new Date()
            };
        }
    }
    // Check custom service - simpler logic, just HTTP status code
    async checkCustomService(service) {
        const startTime = Date.now();
        try {
            const response = await (0, axios_1.default)({
                method: 'GET',
                url: service.statusUrl,
                timeout: service.responseTimeThreshold || 10000,
                validateStatus: () => true, // Don't throw on any status code
                headers: {
                    'User-Agent': 'StatusWatch/1.0'
                },
                maxRedirects: 5,
            });
            const responseTime = Date.now() - startTime;
            // Check if status code matches expected
            const isUp = response.status === service.expectedStatusCode;
            // Check if response time is within threshold
            const isSlowResponse = responseTime > service.responseTimeThreshold;
            // Determine status
            let status;
            let message;
            if (isUp && !isSlowResponse) {
                status = 'operational';
                message = `Service is up (${response.status})`;
            }
            else if (isUp && isSlowResponse) {
                status = 'degraded';
                message = `Service is slow (${responseTime}ms > ${service.responseTimeThreshold}ms threshold)`;
            }
            else {
                status = 'major_outage';
                message = `Service returned ${response.status}, expected ${service.expectedStatusCode}`;
            }
            // Save check result
            await prisma.statusCheck.create({
                data: {
                    serviceId: service.id,
                    isUp: isUp && !isSlowResponse,
                    responseTime,
                    statusCode: response.status,
                    checkedAt: new Date()
                }
            });
            return {
                slug: service.slug,
                name: service.name,
                status,
                message,
                lastChecked: new Date(),
                responseTime,
            };
        }
        catch (error) {
            console.error(`Error checking custom service ${service.name}:`, error);
            // Save failed check
            const responseTime = Date.now() - startTime;
            await prisma.statusCheck.create({
                data: {
                    serviceId: service.id,
                    isUp: false,
                    responseTime,
                    statusCode: null,
                    checkedAt: new Date()
                }
            });
            return {
                slug: service.slug,
                name: service.name,
                status: 'major_outage',
                message: error instanceof Error ? error.message : 'Failed to connect',
                lastChecked: new Date(),
                responseTime,
            };
        }
    }
    async checkAllServices() {
        const services = await prisma.service.findMany({ where: { isActive: true } });
        const statusChecks = await Promise.all(services.map(svc => this.checkServiceStatus(svc.slug)));
        return statusChecks;
    }
    async forceRefresh(slug) {
        return this.checkServiceStatus(slug);
    }
    async getLatestStatus(slug) {
        const cacheKey = `latestStatus:${slug}`;
        const cached = (0, cache_1.cacheGet)(cacheKey);
        if (cached)
            return cached;
        const service = await prisma.service.findUnique({ where: { slug } });
        if (!service)
            return null;
        const latestCheck = await prisma.statusCheck.findFirst({
            where: { serviceId: service.id },
            orderBy: { checkedAt: 'desc' }
        });
        if (!latestCheck)
            return null;
        const result = {
            slug: service.slug,
            name: service.name,
            status: latestCheck.isUp ? 'operational' : 'degraded',
            message: undefined,
            lastChecked: latestCheck.checkedAt,
            responseTime: latestCheck.responseTime || undefined
        };
        // cache latest status for short duration to reduce DB reads
        try {
            (0, cache_1.cacheSet)(cacheKey, result, 30 * 1000); // 30s
        }
        catch {
            // non-fatal
        }
        return result;
    }
}
exports.StatusService = StatusService;

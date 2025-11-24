"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const status_service_1 = require("./status.service");
const notification_service_1 = require("./notification.service");
const db_1 = require("../lib/db");
const statusService = new status_service_1.StatusService();
const notificationService = new notification_service_1.NotificationService();
class CronService {
    constructor() {
        var _a, _b, _c, _d;
        this.tasks = [];
        this.retryAttempts = Number((_b = (_a = process.env.DB_RETRY_ATTEMPTS) !== null && _a !== void 0 ? _a : process.env.RETRY_ATTEMPTS) !== null && _b !== void 0 ? _b : 5);
        this.retryDelayMs = Number((_d = (_c = process.env.DB_RETRY_DELAY_MS) !== null && _c !== void 0 ? _c : process.env.RETRY_DELAY_MS) !== null && _d !== void 0 ? _d : 300);
    }
    // Simple retry helper with exponential backoff (copied locally to avoid cross-service coupling)
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
    // Check all services every 2 minutes
    startStatusMonitoring() {
        const task = node_cron_1.default.schedule('*/2 * * * *', async () => {
            console.log('🔍 Running scheduled status checks...');
            try {
                const statuses = await statusService.checkAllServices();
                console.log(`✅ Checked ${statuses.length} services`);
                // Check for status changes and trigger alerts
                for (const status of statuses) {
                    await this.checkForStatusChange(status);
                }
            }
            catch (error) {
                console.error('❌ Error in scheduled status check:', error);
            }
        });
        this.tasks.push(task);
        console.log('✅ Status monitoring cron job started (every 2 minutes)');
    }
    // Check every 5 minutes for unresolved incidents
    startIncidentMonitoring() {
        const task = node_cron_1.default.schedule('*/5 * * * *', async () => {
            console.log('🔍 Checking for unresolved incidents...');
            try {
                try {
                    const unresolvedIncidents = await this.retry(() => db_1.prisma.incident.findMany({
                        where: {
                            status: {
                                not: 'resolved'
                            }
                        },
                        include: {
                            service: true
                        }
                    }));
                    console.log(`Found ${unresolvedIncidents.length} unresolved incidents`);
                }
                catch (err) {
                    console.error('Failed to fetch unresolved incidents after retries:', err);
                }
            }
            catch (error) {
                console.error('❌ Error checking incidents:', error);
            }
        });
        this.tasks.push(task);
        console.log('✅ Incident monitoring cron job started (every 5 minutes)');
    }
    // Clean up old status checks (keep last 7 days)
    startCleanupTask() {
        // Run daily at 2 AM
        const task = node_cron_1.default.schedule('0 2 * * *', async () => {
            console.log('🧹 Running cleanup task...');
            try {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                try {
                    const deleted = await this.retry(() => db_1.prisma.statusCheck.deleteMany({
                        where: {
                            checkedAt: {
                                lt: sevenDaysAgo
                            }
                        }
                    }));
                    console.log(`✅ Deleted ${deleted.count} old status checks`);
                }
                catch (err) {
                    console.error('Failed cleanup deleteMany after retries:', err);
                }
            }
            catch (error) {
                console.error('❌ Error in cleanup task:', error);
            }
        });
        this.tasks.push(task);
        console.log('✅ Cleanup cron job started (daily at 2 AM)');
    }
    async checkForStatusChange(currentStatus) {
        try {
            const service = await this.retry(() => db_1.prisma.service.findUnique({
                where: { slug: currentStatus.slug },
                include: {
                    statusChecks: {
                        orderBy: { checkedAt: 'desc' },
                        take: 2
                    }
                }
            }));
            if (!service || service.statusChecks.length < 2) {
                return;
            }
            const [current, previous] = service.statusChecks;
            // Compare by isUp boolean (Prisma StatusCheck uses isUp)
            if (current.isUp !== previous.isUp) {
                const prevStatus = previous.isUp ? 'operational' : 'outage';
                const currStatus = current.isUp ? 'operational' : 'outage';
                console.log(`⚠️  Status change detected for ${service.name}: ${prevStatus} → ${currStatus}`);
                // Send notifications to users
                await notificationService.notifyStatusChange(service.id, prevStatus, currStatus, currentStatus.message);
                // Create incident if status degraded
                if (!current.isUp && previous.isUp) {
                    await this.createIncident(service.id, currStatus, currentStatus.message);
                }
                // Resolve incident if service recovered
                if (current.isUp && !previous.isUp) {
                    await this.resolveIncidents(service.id);
                }
            }
        }
        catch (error) {
            console.error('Error checking status change:', error);
        }
    }
    async createIncident(serviceId, status, message) {
        const impact = this.determineImpact(status);
        try {
            await this.retry(() => db_1.prisma.incident.create({
                data: {
                    serviceId,
                    title: `Service ${status.replace('_', ' ')}`,
                    description: message || undefined,
                    status: 'investigating',
                    severity: impact === 'critical' ? 'critical' : impact === 'major' ? 'major' : 'minor',
                    startedAt: new Date(),
                    impact
                }
            }));
            console.log(`📝 Created new incident for service ${serviceId}`);
        }
        catch (err) {
            console.error('Failed to create incident after retries:', err);
        }
    }
    async resolveIncidents(serviceId) {
        try {
            await this.retry(() => db_1.prisma.incident.updateMany({
                where: {
                    serviceId,
                    status: {
                        not: 'resolved'
                    }
                },
                data: {
                    status: 'resolved',
                    resolvedAt: new Date()
                }
            }));
            console.log(`✅ Resolved incidents for service ${serviceId}`);
        }
        catch (err) {
            console.error('Failed to resolve incidents after retries:', err);
        }
    }
    determineImpact(status) {
        switch (status) {
            case 'major_outage':
                return 'critical';
            case 'partial_outage':
                return 'major';
            case 'degraded':
                return 'minor';
            default:
                return 'none';
        }
    }
    startAll() {
        this.startStatusMonitoring();
        this.startIncidentMonitoring();
        this.startCleanupTask();
    }
    stopAll() {
        this.tasks.forEach(task => task.stop());
        console.log('🛑 All cron jobs stopped');
    }
}
exports.CronService = CronService;

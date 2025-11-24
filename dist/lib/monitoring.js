"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const db_1 = require("./db");
const scrapers_1 = require("./scrapers");
class MonitoringService {
    /**
     * Check all active services and update database
     */
    async checkAllServices() {
        const services = await db_1.prisma.service.findMany({
            where: { isActive: true }
        });
        const results = await Promise.allSettled(services.map(service => this.checkService(service.slug)));
        console.log(`Checked ${results.length} services`);
        return results;
    }
    /**
     * Check a single service
     */
    async checkService(serviceSlug) {
        const scraper = scrapers_1.scrapers[serviceSlug];
        if (!scraper) {
            throw new Error(`No scraper found for ${serviceSlug}`);
        }
        try {
            const statusData = await scraper.scrape();
            // Store status check
            await this.storeStatusCheck(serviceSlug, statusData);
            // Process incidents
            await this.processIncidents(serviceSlug, statusData.incidents);
            return statusData;
        }
        catch (error) {
            console.error(`Error checking ${serviceSlug}:`, error);
            throw error;
        }
    }
    /**
     * Store status check result
     */
    async storeStatusCheck(serviceSlug, data) {
        const service = await db_1.prisma.service.findUnique({
            where: { slug: serviceSlug }
        });
        if (!service)
            return;
        await db_1.prisma.statusCheck.create({
            data: {
                serviceId: service.id,
                isUp: data.isUp,
                responseTime: null, // We'll add this later
                statusCode: data.isUp ? 200 : 500,
                checkedAt: new Date()
            }
        });
    }
    /**
     * Process and store incidents
     */
    async processIncidents(serviceSlug, incidents) {
        const service = await db_1.prisma.service.findUnique({
            where: { slug: serviceSlug }
        });
        if (!service)
            return;
        for (const incidentData of incidents) {
            // Check if incident already exists
            const existing = await db_1.prisma.incident.findFirst({
                where: {
                    serviceId: service.id,
                    title: incidentData.title,
                    startedAt: incidentData.startedAt
                }
            });
            if (!existing) {
                // Create new incident
                await db_1.prisma.incident.create({
                    data: {
                        serviceId: service.id,
                        title: incidentData.title,
                        description: incidentData.description,
                        status: incidentData.status,
                        severity: incidentData.severity,
                        startedAt: incidentData.startedAt,
                        updates: {
                            create: incidentData.updates.map((upd) => ({
                                message: upd.message,
                                status: incidentData.status,
                                createdAt: upd.createdAt
                            }))
                        }
                    }
                });
                // Trigger notifications
                await this.triggerNotifications(service.id, incidentData);
            }
        }
    }
    /**
     * Trigger notifications for new incident
     */
    async triggerNotifications(serviceId, incidentData) {
        // Get users monitoring this service
        const monitoredBy = await db_1.prisma.monitoredService.findMany({
            where: { serviceId },
            include: {
                user: {
                    include: {
                        alertPreferences: true
                    }
                }
            }
        });
        for (const monitored of monitoredBy) {
            const prefs = monitored.user.alertPreferences;
            if (!prefs)
                continue;
            // Check if we should send notification based on severity
            if (prefs.severity !== 'all') {
                if (prefs.severity === 'critical' && incidentData.severity !== 'critical') {
                    continue;
                }
                if (prefs.severity === 'major' && !['critical', 'major'].includes(incidentData.severity)) {
                    continue;
                }
            }
            // Create notification (we'll actually send it in a separate job)
            await db_1.prisma.notification.create({
                data: {
                    userId: monitored.userId,
                    type: 'incident_started',
                    channel: 'email', // We'll make this dynamic later
                    sent: false
                }
            });
        }
    }
    /**
     * Calculate uptime percentage for a service
     */
    async calculateUptime(serviceSlug, days = 30) {
        const service = await db_1.prisma.service.findUnique({
            where: { slug: serviceSlug }
        });
        if (!service)
            return 0;
        const since = new Date();
        since.setDate(since.getDate() - days);
        const checks = await db_1.prisma.statusCheck.findMany({
            where: {
                serviceId: service.id,
                checkedAt: { gte: since }
            }
        });
        if (checks.length === 0)
            return 100;
        const upChecks = checks.filter(c => c.isUp).length;
        return (upChecks / checks.length) * 100;
    }
}
exports.MonitoringService = MonitoringService;
exports.monitoringService = new MonitoringService();
exports.default = exports.monitoringService;

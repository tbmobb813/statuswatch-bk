"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// Get user's monitored services
router.get('/services', async (req, res) => {
    try {
        const monitoredServices = await prisma.monitoredService.findMany({
            where: {
                userId: req.userId
            },
            include: {
                service: true
            }
        });
        res.json({
            success: true,
            data: monitoredServices
        });
    }
    catch (error) {
        console.error('Error fetching monitored services:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Add service to monitoring
router.post('/services/:serviceSlug', async (req, res) => {
    try {
        const { serviceSlug } = req.params;
        const service = await prisma.service.findUnique({
            where: { slug: serviceSlug }
        });
        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }
        const monitoredService = await prisma.monitoredService.create({
            data: {
                userId: req.userId,
                serviceId: service.id
            },
            include: {
                service: true
            }
        });
        res.json({
            success: true,
            data: monitoredService
        });
    }
    catch (error) {
        console.error('Error adding monitored service:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Remove service from monitoring
router.delete('/services/:serviceSlug', async (req, res) => {
    try {
        const { serviceSlug } = req.params;
        const service = await prisma.service.findUnique({
            where: { slug: serviceSlug }
        });
        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }
        await prisma.monitoredService.deleteMany({
            where: {
                userId: req.userId,
                serviceId: service.id
            }
        });
        res.json({
            success: true,
            message: 'Service removed from monitoring'
        });
    }
    catch (error) {
        console.error('Error removing monitored service:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get user's alert preferences
router.get('/alerts', async (req, res) => {
    try {
        let alertPreference = await prisma.alertPreference.findUnique({
            where: {
                userId: req.userId
            }
        });
        // Create default preferences if they don't exist
        if (!alertPreference) {
            alertPreference = await prisma.alertPreference.create({
                data: {
                    userId: req.userId
                }
            });
        }
        res.json({
            success: true,
            data: alertPreference
        });
    }
    catch (error) {
        console.error('Error fetching alert preferences:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Update alert preferences
router.put('/alerts', async (req, res) => {
    try {
        const { emailEnabled, slackEnabled, discordEnabled, smsEnabled, onlyMonitored, severity, digestMode, discordWebhook, slackWebhook } = req.body;
        const alertPreference = await prisma.alertPreference.upsert({
            where: {
                userId: req.userId
            },
            update: {
                ...(typeof emailEnabled === 'boolean' && { emailEnabled }),
                ...(typeof slackEnabled === 'boolean' && { slackEnabled }),
                ...(typeof discordEnabled === 'boolean' && { discordEnabled }),
                ...(typeof smsEnabled === 'boolean' && { smsEnabled }),
                ...(typeof onlyMonitored === 'boolean' && { onlyMonitored }),
                ...(severity !== undefined && { severity }),
                ...(typeof digestMode === 'boolean' && { digestMode }),
                ...(discordWebhook !== undefined && { discordWebhook }),
                ...(slackWebhook !== undefined && { slackWebhook })
            },
            create: {
                userId: req.userId,
                emailEnabled: emailEnabled !== null && emailEnabled !== void 0 ? emailEnabled : true,
                slackEnabled: slackEnabled !== null && slackEnabled !== void 0 ? slackEnabled : false,
                discordEnabled: discordEnabled !== null && discordEnabled !== void 0 ? discordEnabled : false,
                smsEnabled: smsEnabled !== null && smsEnabled !== void 0 ? smsEnabled : false,
                onlyMonitored: onlyMonitored !== null && onlyMonitored !== void 0 ? onlyMonitored : true,
                severity: severity !== null && severity !== void 0 ? severity : 'all',
                digestMode: digestMode !== null && digestMode !== void 0 ? digestMode : false,
                discordWebhook: discordWebhook !== null && discordWebhook !== void 0 ? discordWebhook : null,
                slackWebhook: slackWebhook !== null && slackWebhook !== void 0 ? slackWebhook : null
            }
        });
        res.json({
            success: true,
            data: alertPreference
        });
    }
    catch (error) {
        console.error('Error updating alert preferences:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get user's notifications
router.get('/notifications', async (req, res) => {
    try {
        const { limit = '50', unreadOnly = 'false' } = req.query;
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.userId,
                ...(unreadOnly === 'true' && { read: false })
            },
            take: parseInt(limit),
            orderBy: {
                sentAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: notifications
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma.notification.updateMany({
            where: {
                id,
                userId: req.userId
            },
            data: {
                read: true
            }
        });
        res.json({
            success: true,
            data: notification
        });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Mark all notifications as read
router.patch('/notifications/read-all', async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.userId,
                read: false
            },
            data: {
                read: true
            }
        });
        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;

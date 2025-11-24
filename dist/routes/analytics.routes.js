"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_service_1 = require("../services/analytics.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const analyticsService = new analytics_service_1.AnalyticsService();
// Get summary analytics (requires auth for custom services)
router.get('/summary', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                error: 'Days must be between 1 and 365',
            });
        }
        const summary = await analyticsService.getSummaryAnalytics(days);
        res.json({
            success: true,
            data: summary,
        });
    }
    catch (error) {
        console.error('Error fetching summary analytics:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Get Mean Time To Resolution (MTTR)
router.get('/mttr', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const serviceId = req.query.serviceId;
        const days = parseInt(req.query.days) || 30;
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                error: 'Days must be between 1 and 365',
            });
        }
        const mttrData = await analyticsService.calculateMTTR(serviceId, days);
        res.json({
            success: true,
            data: mttrData,
            meta: {
                period: `${days} days`,
                serviceId: serviceId || 'all',
            },
        });
    }
    catch (error) {
        console.error('Error calculating MTTR:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Get Mean Time To Detection (MTTD)
router.get('/mttd', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const serviceId = req.query.serviceId;
        const days = parseInt(req.query.days) || 30;
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                error: 'Days must be between 1 and 365',
            });
        }
        const mttdData = await analyticsService.calculateMTTD(serviceId, days);
        res.json({
            success: true,
            data: mttdData,
            meta: {
                period: `${days} days`,
                serviceId: serviceId || 'all',
            },
        });
    }
    catch (error) {
        console.error('Error calculating MTTD:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Get reliability scores
router.get('/reliability', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const serviceId = req.query.serviceId;
        const days = parseInt(req.query.days) || 30;
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                error: 'Days must be between 1 and 365',
            });
        }
        const reliabilityData = await analyticsService.calculateReliabilityScore(serviceId, days);
        res.json({
            success: true,
            data: reliabilityData,
            meta: {
                period: `${days} days`,
                serviceId: serviceId || 'all',
                scoring: {
                    uptime: '40%',
                    incidentFrequency: '30%',
                    avgResolutionTime: '30%',
                },
            },
        });
    }
    catch (error) {
        console.error('Error calculating reliability:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Get incident trends
router.get('/trends', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const serviceId = req.query.serviceId;
        const days = parseInt(req.query.days) || 30;
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                error: 'Days must be between 1 and 365',
            });
        }
        const trends = await analyticsService.getIncidentTrends(serviceId, days);
        // Calculate summary stats
        const totalIncidents = trends.reduce((sum, t) => sum + t.incidents, 0);
        const criticalIncidents = trends.reduce((sum, t) => sum + t.criticalIncidents, 0);
        const majorIncidents = trends.reduce((sum, t) => sum + t.majorIncidents, 0);
        const minorIncidents = trends.reduce((sum, t) => sum + t.minorIncidents, 0);
        res.json({
            success: true,
            data: trends,
            meta: {
                period: `${days} days`,
                serviceId: serviceId || 'all',
                summary: {
                    totalIncidents,
                    criticalIncidents,
                    majorIncidents,
                    minorIncidents,
                    avgIncidentsPerDay: Math.round((totalIncidents / days) * 100) / 100,
                },
            },
        });
    }
    catch (error) {
        console.error('Error fetching incident trends:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Get SLA compliance
router.get('/sla', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const serviceId = req.query.serviceId;
        const period = req.query.period || 'month';
        const target = parseFloat(req.query.target) || 99.9;
        if (!['day', 'week', 'month', 'quarter'].includes(period)) {
            return res.status(400).json({
                success: false,
                error: 'Period must be one of: day, week, month, quarter',
            });
        }
        if (target < 0 || target > 100) {
            return res.status(400).json({
                success: false,
                error: 'Target must be between 0 and 100',
            });
        }
        const slaData = await analyticsService.calculateSLA(serviceId, period, target);
        const metCount = slaData.filter(s => s.met).length;
        const totalCount = slaData.length;
        res.json({
            success: true,
            data: slaData,
            meta: {
                period,
                target: `${target}%`,
                serviceId: serviceId || 'all',
                summary: {
                    total: totalCount,
                    met: metCount,
                    failed: totalCount - metCount,
                    complianceRate: totalCount > 0 ? Math.round((metCount / totalCount) * 100 * 100) / 100 : 100,
                },
            },
        });
    }
    catch (error) {
        console.error('Error calculating SLA:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Get service comparison (useful for dashboards)
router.get('/comparison', auth_middleware_1.optionalAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        if (days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                error: 'Days must be between 1 and 365',
            });
        }
        const [mttrData, mttdData, reliabilityData] = await Promise.all([
            analyticsService.calculateMTTR(undefined, days),
            analyticsService.calculateMTTD(undefined, days),
            analyticsService.calculateReliabilityScore(undefined, days),
        ]);
        // Combine data by service
        const serviceMap = new Map();
        for (const data of mttrData) {
            serviceMap.set(data.serviceId, {
                serviceId: data.serviceId,
                serviceName: data.serviceName,
                slug: data.slug,
                mttr: data.mttr,
            });
        }
        for (const data of mttdData) {
            const existing = serviceMap.get(data.serviceId);
            if (existing) {
                existing.mttd = data.mttd;
            }
            else {
                serviceMap.set(data.serviceId, {
                    serviceId: data.serviceId,
                    serviceName: data.serviceName,
                    slug: data.slug,
                    mttd: data.mttd,
                });
            }
        }
        for (const data of reliabilityData) {
            const existing = serviceMap.get(data.serviceId);
            if (existing) {
                existing.reliabilityScore = data.score;
                existing.uptime = data.uptime;
                existing.incidentFrequency = data.incidentFrequency;
            }
            else {
                serviceMap.set(data.serviceId, {
                    serviceId: data.serviceId,
                    serviceName: data.serviceName,
                    slug: data.slug,
                    reliabilityScore: data.score,
                    uptime: data.uptime,
                    incidentFrequency: data.incidentFrequency,
                });
            }
        }
        const comparison = Array.from(serviceMap.values()).sort((a, b) => (b.reliabilityScore || 0) - (a.reliabilityScore || 0));
        res.json({
            success: true,
            data: comparison,
            meta: {
                period: `${days} days`,
                metrics: ['mttr', 'mttd', 'reliabilityScore', 'uptime', 'incidentFrequency'],
            },
        });
    }
    catch (error) {
        console.error('Error generating service comparison:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;

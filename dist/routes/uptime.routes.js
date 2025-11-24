"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get uptime statistics
router.get('/', async (req, res) => {
    var _a, _b;
    try {
        const days = ((_a = req.query) === null || _a === void 0 ? void 0 : _a.days) || '90';
        const serviceSlug = (_b = req.query) === null || _b === void 0 ? void 0 : _b.serviceSlug;
        const daysCount = parseInt(days);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysCount);
        const where = serviceSlug
            ? {
                service: {
                    slug: serviceSlug
                },
                checkedAt: {
                    gte: startDate
                }
            }
            : {
                checkedAt: {
                    gte: startDate
                }
            };
        const statusChecks = await prisma.statusCheck.findMany({
            where,
            include: {
                service: {
                    select: {
                        name: true,
                        slug: true
                    }
                }
            },
            orderBy: {
                checkedAt: 'asc'
            }
        });
        const uptimeByService = {};
        statusChecks.forEach(check => {
            const serviceName = check.service.name;
            const date = check.checkedAt.toISOString().split('T')[0];
            if (!uptimeByService[serviceName]) {
                uptimeByService[serviceName] = [];
            }
            const existingDay = uptimeByService[serviceName].find(d => d.date === date);
            if (existingDay) {
                existingDay.total++;
                if (check.isUp) {
                    existingDay.operational++;
                }
            }
            else {
                uptimeByService[serviceName].push({
                    date,
                    total: 1,
                    operational: check.isUp ? 1 : 0,
                    service: serviceName
                });
            }
        });
        // Calculate uptime percentage for each day and build output
        const outputByService = {};
        Object.keys(uptimeByService).forEach((service) => {
            outputByService[service] = uptimeByService[service].map(day => ({
                date: day.date,
                uptime: (day.operational / day.total) * 100,
                service: day.service
            }));
        });
        res.json({
            success: true,
            data: outputByService
        });
    }
    catch (error) {
        console.error('Error fetching uptime data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get overall uptime for a service
router.get('/:slug', async (req, res) => {
    var _a, _b;
    try {
        const slug = (_a = req.params) === null || _a === void 0 ? void 0 : _a.slug;
        const days = ((_b = req.query) === null || _b === void 0 ? void 0 : _b.days) || '30';
        const daysCount = parseInt(days);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysCount);
        const service = await prisma.service.findUnique({
            where: { slug }
        });
        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Service not found'
            });
        }
        const statusChecks = await prisma.statusCheck.findMany({
            where: {
                serviceId: service.id,
                checkedAt: {
                    gte: startDate
                }
            }
        });
        const total = statusChecks.length;
        const operational = statusChecks.filter(c => c.isUp).length;
        const uptime = total > 0 ? (operational / total) * 100 : 0;
        res.json({
            success: true,
            data: {
                service: service.name,
                slug: service.slug,
                uptime: parseFloat(uptime.toFixed(2)),
                totalChecks: total,
                operationalChecks: operational,
                period: `${daysCount} days`
            }
        });
    }
    catch (error) {
        console.error('Error fetching service uptime:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;

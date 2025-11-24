"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const monitoring_1 = require("../lib/monitoring");
const router = (0, express_1.Router)();
// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
    try {
        const services = await db_1.prisma.service.findMany({ take: 10 });
        const data = await Promise.all(services.map(async (s) => {
            var _a, _b, _c, _d, _e;
            const uptime = await monitoring_1.monitoringService.calculateUptime(s.slug, 30);
            const recentChecks = await db_1.prisma.statusCheck.findMany({
                where: { serviceId: s.id },
                orderBy: { checkedAt: 'desc' },
                take: 1,
            });
            return {
                id: s.id,
                slug: s.slug,
                name: s.name,
                category: s.category,
                uptime: Number(uptime.toFixed(2)),
                isUp: (_b = (_a = recentChecks[0]) === null || _a === void 0 ? void 0 : _a.isUp) !== null && _b !== void 0 ? _b : true,
                lastChecked: (_d = (_c = recentChecks[0]) === null || _c === void 0 ? void 0 : _c.checkedAt) !== null && _d !== void 0 ? _d : null,
                // derive a simple status string for the frontend
                status: ((_e = recentChecks[0]) === null || _e === void 0 ? void 0 : _e.isUp) ? 'operational' : 'major_outage'
            };
        }));
        res.json({ success: true, data });
    }
    catch (err) {
        console.error('Error building dashboard summary:', err);
        res.status(500).json({ success: false, error: 'Failed to build dashboard summary' });
    }
});
exports.default = router;

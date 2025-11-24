"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const status_service_1 = require("../services/status.service");
const router = (0, express_1.Router)();
const statusService = new status_service_1.StatusService();
// Get status for a specific service
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const status = await statusService.checkServiceStatus(slug);
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Check all services
router.get('/', async (req, res) => {
    try {
        const statuses = await statusService.checkAllServices();
        res.json({
            success: true,
            data: statuses
        });
    }
    catch (error) {
        console.error('Error checking all statuses:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Force refresh status for a service
router.post('/:slug/refresh', async (req, res) => {
    try {
        const { slug } = req.params;
        const status = await statusService.forceRefresh(slug);
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('Error refreshing status:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;

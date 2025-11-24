"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const incident_schema_1 = require("../schemas/incident.schema");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get recent incidents
router.get('/', async (req, res) => {
    try {
        const { limit = '10', status } = req.query;
        const where = status ? { status: status } : {};
        const incidents = await prisma.incident.findMany({
            where,
            take: parseInt(limit),
            orderBy: { startedAt: 'desc' },
            include: {
                service: {
                    select: {
                        name: true,
                        slug: true
                    }
                },
                updates: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });
        res.json({
            success: true,
            data: incidents
        });
    }
    catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get incident by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const incident = await prisma.incident.findUnique({
            where: { id },
            include: {
                service: true,
                updates: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!incident) {
            return res.status(404).json({
                success: false,
                error: 'Incident not found'
            });
        }
        res.json({
            success: true,
            data: incident
        });
    }
    catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Create incident (admin)
router.post('/', auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, (0, validation_middleware_1.validate)(incident_schema_1.createIncidentSchema), async (req, res) => {
    try {
        const { serviceId, title, description, status, impact } = req.body;
        const incident = await prisma.incident.create({
            data: {
                title,
                description,
                status: status || 'investigating',
                severity: impact || 'minor',
                startedAt: new Date(),
                service: {
                    connect: { id: serviceId }
                }
            },
            include: {
                service: true
            }
        });
        res.json({
            success: true,
            data: incident
        });
    }
    catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.patch('/:id', auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, (0, validation_middleware_1.validate)(incident_schema_1.updateIncidentSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, title, description, impact } = req.body;
        const severity = impact;
        const incident = await prisma.incident.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(title && { title }),
                ...(description && { description }),
                ...(severity && { severity }),
                ...(status === 'resolved' && { resolvedAt: new Date() })
            },
            include: {
                service: true
            }
        });
        res.json({
            success: true,
            data: incident
        });
    }
    catch (error) {
        console.error('Error updating incident:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Add incident update
router.post('/:id/updates', auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, (0, validation_middleware_1.validate)(incident_schema_1.createIncidentUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { message, status } = req.body;
        const update = await prisma.incidentUpdate.create({
            data: {
                incidentId: id,
                message,
                status: status || 'update'
            }
        });
        res.json({
            success: true,
            data: update
        });
    }
    catch (error) {
        console.error('Error adding incident update:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;

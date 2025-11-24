"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const service_schema_1 = require("../schemas/service.schema");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Maximum custom services per user (can be configured based on subscription tier)
const MAX_CUSTOM_SERVICES_FREE = 3;
const MAX_CUSTOM_SERVICES_PRO = 10;
const MAX_CUSTOM_SERVICES_ENTERPRISE = 50;
// Helper to generate slug from name
function generateSlug(name, userId) {
    const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    // Add user ID suffix to ensure uniqueness across users
    const shortUserId = userId.slice(-8);
    return `${baseSlug}-${shortUserId}`;
}
// Helper to get max services for user
function getMaxServicesForUser(user) {
    if (!user.stripePriceId)
        return MAX_CUSTOM_SERVICES_FREE;
    // Check subscription tier (this is simplified - adjust based on your pricing)
    if (user.stripePriceId.includes('enterprise'))
        return MAX_CUSTOM_SERVICES_ENTERPRISE;
    if (user.stripePriceId.includes('pro'))
        return MAX_CUSTOM_SERVICES_PRO;
    return MAX_CUSTOM_SERVICES_FREE;
}
/**
 * @swagger
 * /api/custom-services/test:
 *   post:
 *     tags: [Custom Services]
 *     summary: Test service connectivity
 *     description: Test if a custom service URL is reachable before adding it
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://api.example.com/health
 *               checkType:
 *                 type: string
 *                 enum: [http, https]
 *                 default: http
 *               expectedStatusCode:
 *                 type: integer
 *                 default: 200
 *               timeout:
 *                 type: integer
 *                 default: 5000
 *     responses:
 *       200:
 *         description: Test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isReachable:
 *                       type: boolean
 *                     isUp:
 *                       type: boolean
 *                     statusCode:
 *                       type: integer
 *                     responseTime:
 *                       type: integer
 *                     message:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/test', auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(service_schema_1.testServiceSchema), async (req, res) => {
    try {
        const { url, expectedStatusCode, timeout } = req.body;
        const startTime = Date.now();
        try {
            const response = await (0, axios_1.default)({
                method: 'GET',
                url,
                timeout,
                validateStatus: () => true, // Don't throw on any status code
                maxRedirects: 5,
            });
            const responseTime = Date.now() - startTime;
            const isUp = response.status === expectedStatusCode;
            return res.json({
                success: true,
                data: {
                    isReachable: true,
                    isUp,
                    statusCode: response.status,
                    responseTime,
                    expectedStatusCode,
                    message: isUp
                        ? `Service is reachable and returned expected status ${expectedStatusCode}`
                        : `Service returned ${response.status}, expected ${expectedStatusCode}`,
                }
            });
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return res.json({
                success: true,
                data: {
                    isReachable: false,
                    isUp: false,
                    statusCode: null,
                    responseTime,
                    expectedStatusCode,
                    message: error instanceof Error ? error.message : 'Connection failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                }
            });
        }
    }
    catch (error) {
        console.error('Error testing service:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/custom-services:
 *   get:
 *     tags: [Custom Services]
 *     summary: Get all custom services
 *     description: Retrieve all custom services for the authenticated user with uptime statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of custom services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/CustomService'
 *                       - type: object
 *                         properties:
 *                           uptime:
 *                             type: number
 *                             example: 99.5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const services = await prisma.service.findMany({
            where: {
                isCustom: true,
                userId,
            },
            include: {
                statusChecks: {
                    orderBy: { checkedAt: 'desc' },
                    take: 1,
                },
                incidents: {
                    where: {
                        resolvedAt: null, // Only active incidents
                    },
                    orderBy: { startedAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Calculate uptime for each service
        const servicesWithUptime = await Promise.all(services.map(async (service) => {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const checks = await prisma.statusCheck.findMany({
                where: {
                    serviceId: service.id,
                    checkedAt: { gte: oneDayAgo },
                },
            });
            const upChecks = checks.filter(c => c.isUp).length;
            const uptime = checks.length > 0 ? (upChecks / checks.length) * 100 : 100;
            return {
                ...service,
                uptime: Math.round(uptime * 100) / 100,
                totalChecks: checks.length,
                lastCheck: service.statusChecks[0],
            };
        }));
        res.json({
            success: true,
            data: servicesWithUptime,
        });
    }
    catch (error) {
        console.error('Error fetching custom services:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get single custom service
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const service = await prisma.service.findFirst({
            where: {
                id,
                isCustom: true,
                userId,
            },
            include: {
                statusChecks: {
                    orderBy: { checkedAt: 'desc' },
                    take: 100, // Last 100 checks
                },
                incidents: {
                    orderBy: { startedAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'Custom service not found',
            });
        }
        res.json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        console.error('Error fetching custom service:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Create custom service
router.post('/', auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(service_schema_1.createCustomServiceSchema), async (req, res) => {
    try {
        const userId = req.userId;
        const data = req.body;
        // Get user to check subscription tier
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { stripePriceId: true },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        // Check service limit
        const existingServicesCount = await prisma.service.count({
            where: {
                isCustom: true,
                userId,
            },
        });
        const maxServices = getMaxServicesForUser(user);
        if (existingServicesCount >= maxServices) {
            return res.status(403).json({
                success: false,
                error: `You have reached your limit of ${maxServices} custom services. Upgrade your plan for more.`,
                limit: maxServices,
                current: existingServicesCount,
            });
        }
        // Generate unique slug
        const slug = generateSlug(data.name, userId);
        // Check if slug already exists (shouldn't happen, but just in case)
        const existingSlug = await prisma.service.findUnique({
            where: { slug },
        });
        if (existingSlug) {
            return res.status(400).json({
                success: false,
                error: 'A service with a similar name already exists. Please choose a different name.',
            });
        }
        // Create the custom service
        const service = await prisma.service.create({
            data: {
                name: data.name,
                slug,
                category: data.category || 'Custom',
                statusUrl: data.statusUrl,
                color: data.color || '#3B82F6',
                isCustom: true,
                userId,
                checkInterval: data.checkInterval || 5,
                expectedStatusCode: data.expectedStatusCode || 200,
                responseTimeThreshold: data.responseTimeThreshold || 5000,
                checkType: data.checkType || 'https',
                isActive: true,
            },
        });
        // Automatically add to user's monitored services
        await prisma.monitoredService.create({
            data: {
                userId,
                serviceId: service.id,
            },
        });
        res.status(201).json({
            success: true,
            data: service,
            message: 'Custom service created successfully and added to your monitored services',
        });
    }
    catch (error) {
        console.error('Error creating custom service:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Update custom service
router.patch('/:id', auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(service_schema_1.updateCustomServiceSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const data = req.body;
        // Check if service exists and belongs to user
        const existingService = await prisma.service.findFirst({
            where: {
                id,
                isCustom: true,
                userId,
            },
        });
        if (!existingService) {
            return res.status(404).json({
                success: false,
                error: 'Custom service not found or you do not have permission to modify it',
            });
        }
        // Update the service
        const service = await prisma.service.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.statusUrl && { statusUrl: data.statusUrl }),
                ...(data.category && { category: data.category }),
                ...(data.checkInterval !== undefined && { checkInterval: data.checkInterval }),
                ...(data.expectedStatusCode !== undefined && { expectedStatusCode: data.expectedStatusCode }),
                ...(data.responseTimeThreshold !== undefined && { responseTimeThreshold: data.responseTimeThreshold }),
                ...(data.checkType && { checkType: data.checkType }),
                ...(data.color && { color: data.color }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
        res.json({
            success: true,
            data: service,
            message: 'Custom service updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating custom service:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Delete custom service
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        // Check if service exists and belongs to user
        const existingService = await prisma.service.findFirst({
            where: {
                id,
                isCustom: true,
                userId,
            },
        });
        if (!existingService) {
            return res.status(404).json({
                success: false,
                error: 'Custom service not found or you do not have permission to delete it',
            });
        }
        // Delete the service (cascades to status checks, incidents, etc.)
        await prisma.service.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: 'Custom service deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting custom service:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get service limits for current user
router.get('/limits/info', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { stripePriceId: true },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }
        const currentCount = await prisma.service.count({
            where: {
                isCustom: true,
                userId,
            },
        });
        const maxServices = getMaxServicesForUser(user);
        res.json({
            success: true,
            data: {
                current: currentCount,
                max: maxServices,
                remaining: maxServices - currentCount,
                canAddMore: currentCount < maxServices,
            },
        });
    }
    catch (error) {
        console.error('Error fetching service limits:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;

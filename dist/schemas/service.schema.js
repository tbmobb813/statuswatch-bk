"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testServiceSchema = exports.updateCustomServiceSchema = exports.createCustomServiceSchema = void 0;
const zod_1 = require("zod");
// Validation for creating a custom service
exports.createCustomServiceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Service name must be at least 2 characters').max(100, 'Service name too long'),
    statusUrl: zod_1.z.string().url('Invalid URL format'),
    category: zod_1.z.string().min(2, 'Category must be at least 2 characters').max(50, 'Category too long').default('Custom'),
    checkInterval: zod_1.z.number().int().min(1, 'Check interval must be at least 1 minute').max(60, 'Check interval cannot exceed 60 minutes').default(5),
    expectedStatusCode: zod_1.z.number().int().min(100, 'Invalid status code').max(599, 'Invalid status code').default(200),
    responseTimeThreshold: zod_1.z.number().int().min(100, 'Threshold too low').max(30000, 'Threshold too high (max 30s)').default(5000),
    checkType: zod_1.z.enum(['http', 'https', 'tcp']).default('https'),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use hex like #FF0000)').optional().default('#3B82F6'),
});
// Validation for updating a custom service
exports.updateCustomServiceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Service name must be at least 2 characters').max(100, 'Service name too long').optional(),
    statusUrl: zod_1.z.string().url('Invalid URL format').optional(),
    category: zod_1.z.string().min(2, 'Category must be at least 2 characters').max(50, 'Category too long').optional(),
    checkInterval: zod_1.z.number().int().min(1, 'Check interval must be at least 1 minute').max(60, 'Check interval cannot exceed 60 minutes').optional(),
    expectedStatusCode: zod_1.z.number().int().min(100, 'Invalid status code').max(599, 'Invalid status code').optional(),
    responseTimeThreshold: zod_1.z.number().int().min(100, 'Threshold too low').max(30000, 'Threshold too high (max 30s)').optional(),
    checkType: zod_1.z.enum(['http', 'https', 'tcp']).optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use hex like #FF0000)').optional(),
    isActive: zod_1.z.boolean().optional(),
});
// Test service connectivity
exports.testServiceSchema = zod_1.z.object({
    url: zod_1.z.string().url('Invalid URL format'),
    checkType: zod_1.z.enum(['http', 'https', 'tcp']).default('https'),
    expectedStatusCode: zod_1.z.number().int().min(100).max(599).default(200),
    timeout: zod_1.z.number().int().min(1000).max(30000).default(10000), // milliseconds
});

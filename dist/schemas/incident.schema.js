"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncidentUpdateSchema = exports.updateIncidentSchema = exports.createIncidentSchema = void 0;
const zod_1 = require("zod");
exports.createIncidentSchema = zod_1.z.object({
    serviceId: zod_1.z.string().cuid('Invalid service ID'),
    title: zod_1.z.string().min(5, 'Title must be at least 5 characters'),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['investigating', 'identified', 'monitoring', 'resolved']).default('investigating'),
    impact: zod_1.z.enum(['critical', 'major', 'minor', 'maintenance']).default('minor'),
});
exports.updateIncidentSchema = zod_1.z.object({
    title: zod_1.z.string().min(5, 'Title must be at least 5 characters').optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional(),
    impact: zod_1.z.enum(['critical', 'major', 'minor', 'maintenance']).optional(),
});
exports.createIncidentUpdateSchema = zod_1.z.object({
    message: zod_1.z.string().min(10, 'Update message must be at least 10 characters'),
    status: zod_1.z.string().default('update'),
});

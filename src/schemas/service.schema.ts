import { z } from 'zod';

// Validation for creating a custom service
export const createCustomServiceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters').max(100, 'Service name too long'),
  statusUrl: z.string().url('Invalid URL format'),
  category: z.string().min(2, 'Category must be at least 2 characters').max(50, 'Category too long').default('Custom'),
  checkInterval: z.number().int().min(1, 'Check interval must be at least 1 minute').max(60, 'Check interval cannot exceed 60 minutes').default(5),
  expectedStatusCode: z.number().int().min(100, 'Invalid status code').max(599, 'Invalid status code').default(200),
  responseTimeThreshold: z.number().int().min(100, 'Threshold too low').max(30000, 'Threshold too high (max 30s)').default(5000),
  checkType: z.enum(['http', 'https', 'tcp']).default('https'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use hex like #FF0000)').optional().default('#3B82F6'),
});

// Validation for updating a custom service
export const updateCustomServiceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters').max(100, 'Service name too long').optional(),
  statusUrl: z.string().url('Invalid URL format').optional(),
  category: z.string().min(2, 'Category must be at least 2 characters').max(50, 'Category too long').optional(),
  checkInterval: z.number().int().min(1, 'Check interval must be at least 1 minute').max(60, 'Check interval cannot exceed 60 minutes').optional(),
  expectedStatusCode: z.number().int().min(100, 'Invalid status code').max(599, 'Invalid status code').optional(),
  responseTimeThreshold: z.number().int().min(100, 'Threshold too low').max(30000, 'Threshold too high (max 30s)').optional(),
  checkType: z.enum(['http', 'https', 'tcp']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use hex like #FF0000)').optional(),
  isActive: z.boolean().optional(),
});

// Test service connectivity
export const testServiceSchema = z.object({
  url: z.string().url('Invalid URL format'),
  checkType: z.enum(['http', 'https', 'tcp']).default('https'),
  expectedStatusCode: z.number().int().min(100).max(599).default(200),
  timeout: z.number().int().min(1000).max(30000).default(10000), // milliseconds
});

export type CreateCustomServiceInput = z.infer<typeof createCustomServiceSchema>;
export type UpdateCustomServiceInput = z.infer<typeof updateCustomServiceSchema>;
export type TestServiceInput = z.infer<typeof testServiceSchema>;

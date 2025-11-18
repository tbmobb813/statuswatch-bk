import { z } from 'zod';

export const createIncidentSchema = z.object({
  serviceId: z.string().cuid('Invalid service ID'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).default('investigating'),
  impact: z.enum(['critical', 'major', 'minor', 'maintenance']).default('minor'),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').optional(),
  description: z.string().optional(),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']).optional(),
  impact: z.enum(['critical', 'major', 'minor', 'maintenance']).optional(),
});

export const createIncidentUpdateSchema = z.object({
  message: z.string().min(10, 'Update message must be at least 10 characters'),
  status: z.string().default('update'),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type CreateIncidentUpdateInput = z.infer<typeof createIncidentUpdateSchema>;

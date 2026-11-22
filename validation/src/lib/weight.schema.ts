import { z } from 'zod';

export const createWeightSchema = z.object({
  value: z.number().positive(),

  unit: z.enum(['kg', 'lb']),

  recordedAt: z.string().datetime().optional(),
});

export type CreateWeightInput = z.infer<typeof createWeightSchema>;

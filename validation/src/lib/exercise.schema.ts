import { z } from 'zod';

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(100),

  durationMinutes: z.number().int().positive().max(1440),

  caloriesBurned: z.number().positive().max(10000),

  performedAt: z.string().datetime().optional(),

  notes: z.string().max(500).optional(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

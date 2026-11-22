import { z } from 'zod';

export const userProfileSchema = z.object({
  age: z.number().int().min(13).max(120),

  gender: z.enum(['male', 'female', 'other']),

  height: z.object({
    value: z.number().positive(),

    unit: z.enum(['cm', 'in']),
  }),

  currentWeight: z.object({
    value: z.number().positive(),

    unit: z.enum(['kg', 'lb']),
  }),

  activityLevel: z.enum([
    'sedentary',
    'light',
    'moderate',
    'very_active',
    'extremely_active',
  ]),

  goal: z.enum(['lose', 'maintain', 'gain']),

  targetWeight: z.object({
    value: z.number().positive(),

    unit: z.enum(['kg', 'lb']),
  }),

  dailyCalorieTarget: z.number().int().positive().optional(),

  calorieTargetOverridden: z.boolean().optional(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

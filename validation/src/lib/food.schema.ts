import { z } from 'zod';

export const createFoodSchema = z.object({
  name: z.string().min(1).max(200),

  caloriesPer100g: z.number().nonnegative(),

  proteinPer100g: z.number().nonnegative(),

  carbsPer100g: z.number().nonnegative(),

  fatPer100g: z.number().nonnegative(),

  fiberPer100g: z.number().nonnegative().optional(),

  source: z.enum(['manual', 'usda', 'ai']).optional(),

  externalId: z.string().min(1).optional(),
});

export type FoodInput = z.infer<typeof createFoodSchema>;

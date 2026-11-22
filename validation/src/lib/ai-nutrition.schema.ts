import { z } from 'zod';

export const parsedFoodItemSchema = z.object({
  name: z.string().min(1).max(200),

  quantity: z.number().positive(),

  unit: z.enum(['g', 'kg', 'oz', 'lb', 'piece', 'serving', 'bowl', 'cup']),
});

export const nutritionParseResultSchema = z.object({
  items: z.array(parsedFoodItemSchema).min(1).max(20),
});

export type ParsedFoodItemInput = z.infer<typeof parsedFoodItemSchema>;

export type NutritionParseResultInput = z.infer<
  typeof nutritionParseResultSchema
>;

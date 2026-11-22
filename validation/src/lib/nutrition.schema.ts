import { z } from 'zod';

export const nutritionSearchSchema = z.object({
  query: z.string().min(1).max(200),
});

export const nutritionImportSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1).max(200),

  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),

  fiberPer100g: z.number().nonnegative().optional(),
});

export type NutritionSearchInput = z.infer<typeof nutritionSearchSchema>;

export type NutritionImportInput = z.infer<typeof nutritionImportSchema>;

export const nutritionParseSchema = z.object({
  text: z.string().min(1).max(2000),
});

export type NutritionParseInput = z.infer<typeof nutritionParseSchema>;

export const nutritionResolveItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit: z.enum(['g', 'kg', 'oz', 'lb', 'piece', 'serving', 'bowl', 'cup']),
});

export const nutritionResolveSchema = z.object({
  items: z.array(nutritionResolveItemSchema).min(1).max(20),
});

export type NutritionResolveItemInput = z.infer<
  typeof nutritionResolveItemSchema
>;

export type NutritionResolveInput = z.infer<typeof nutritionResolveSchema>;

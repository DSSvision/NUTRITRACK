import { z } from 'zod';

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const mealUnitSchema = z.enum([
  'g',
  'kg',
  'oz',
  'lb',
  'piece',
  'serving',
  'bowl',
  'cup',
]);

export const mealItemSchema = z.object({
  foodId: z.string().min(1),

  quantity: z.number().positive(),

  unit: mealUnitSchema,
});

export const mealSchema = z.object({
  name: z.string().min(1).max(100),

  eatenAt: z.coerce.date(),

  items: z.array(mealItemSchema).min(1),
});

export type MealInput = z.infer<typeof mealSchema>;

export const createMealSchema = z.object({
  mealType: mealTypeSchema,
  eatenAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const addMealItemSchema = z.object({
  foodId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(['g', 'kg', 'oz', 'lb']),
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type AddMealItemInput = z.infer<typeof addMealItemSchema>;

const existingFoodMealItemSchema = z.object({
  foodId: z.string().min(1),
  quantity: z.number().positive(),
  unit: mealUnitSchema,
  weightGrams: z.number().positive(),
  assumptions: z.string().max(500).optional(),
});

const snapshotMealItemSchema = z.object({
  foodName: z.string().min(1).max(150),
  quantity: z.number().positive(),
  unit: mealUnitSchema,
  weightGrams: z.number().positive(),

  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
  fiberPer100g: z.number().nonnegative().optional(),

  confidence: z.number().min(0).max(1),
  assumptions: z.string().max(500).optional(),

  // Must be explicitly confirmed by the user.
  confirmedByUser: z.literal(true),
});

export const saveNutritionMealItemSchema = z.union([
  existingFoodMealItemSchema,
  snapshotMealItemSchema,
]);

export const saveNutritionMealSchema = z.object({
  mealType: mealTypeSchema,
  eatenAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(saveNutritionMealItemSchema).min(1).max(20),
});

export const updateMealItemSchema = z
  .object({
    foodName: z.string().min(1).max(150),

    quantity: z.number().positive(),
    unit: mealUnitSchema,
    weightGrams: z.number().positive(),

    caloriesPer100g: z.number().nonnegative(),
    proteinPer100g: z.number().nonnegative(),
    carbsPer100g: z.number().nonnegative(),
    fatPer100g: z.number().nonnegative(),
    fiberPer100g: z.number().nonnegative().nullable(),

    assumptions: z.string().max(500).optional(),
  })
  .strict();

export type UpdateMealItemInput = z.infer<typeof updateMealItemSchema>;

export type SaveNutritionMealInput = z.infer<typeof saveNutritionMealSchema>;

import { prisma } from '../prisma';
import { convertWeight } from '@calorie-tracker/nutrition';
import type {
  UpdateMealItemInput,
  SaveNutritionMealInput,
} from '@calorie-tracker/validation';

export interface CreateMealData {
  userId: string;
  mealType: string;
  eatenAt?: string;
  notes?: string;
}

export interface AddMealItemData {
  userId: string;
  mealId: string;
  foodId: string;
  quantity: number;
  unit: 'g' | 'kg' | 'oz' | 'lb';
}

// --------------------------------------------------
// Create meal
// --------------------------------------------------

export async function createMeal(data: CreateMealData) {
  return prisma.meal.create({
    data: {
      userId: data.userId,
      mealType: data.mealType,
      eatenAt: data.eatenAt ? new Date(data.eatenAt) : new Date(),
      notes: data.notes,
    },
    include: {
      items: true,
    },
  });
}

// --------------------------------------------------
// Add existing food to meal
// --------------------------------------------------

export async function addMealItem(data: AddMealItemData) {
  const meal = await prisma.meal.findFirst({
    where: {
      id: data.mealId,
      userId: data.userId,
    },
  });

  if (!meal) {
    throw new Error('Meal not found');
  }

  const food = await prisma.food.findFirst({
    where: {
      id: data.foodId,
      OR: [{ userId: null }, { userId: data.userId }],
    },
  });

  if (!food) {
    throw new Error('Food not found');
  }

  const weightGrams = convertWeight(data.quantity, data.unit, 'g');
  const multiplier = weightGrams / 100;

  const calories = food.caloriesPer100g * multiplier;
  const protein = food.proteinPer100g * multiplier;
  const carbs = food.carbsPer100g * multiplier;
  const fat = food.fatPer100g * multiplier;

  const fiber =
    food.fiberPer100g !== null ? food.fiberPer100g * multiplier : null;

  return prisma.mealItem.create({
    data: {
      mealId: data.mealId,
      foodId: food.id,

      foodName: food.name,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g,

      quantity: data.quantity,
      unit: data.unit,
      weightGrams,

      calories,
      protein,
      carbs,
      fat,
      fiber,

      estimationMethod: food.estimationMethod ?? food.source,
      confidence: food.confidence,

      isEstimated:
        food.source === 'ai' || food.estimationMethod === 'ai_estimate',

      assumptions: food.typicalServingGrams
        ? `Typical serving: ${food.typicalServingGrams}g`
        : null,

      nutritionSource: food.source,
    },
    include: {
      food: true,
    },
  });
}

// --------------------------------------------------
// Get meals for a user
// --------------------------------------------------

export async function getMeals(userId: string, date?: string) {
  const start = date
    ? new Date(`${date}T00:00:00.000`)
    : new Date(new Date().setHours(0, 0, 0, 0));

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return prisma.meal.findMany({
    where: {
      userId,
      eatenAt: {
        gte: start,
        lt: end,
      },
    },
    include: {
      items: {
        include: {
          food: true,
        },
      },
    },
    orderBy: {
      eatenAt: 'asc',
    },
  });
}

// --------------------------------------------------
// Save meal with existing foods or nutrition snapshots
// --------------------------------------------------

export async function saveNutritionMeal(
  userId: string,
  input: SaveNutritionMealInput,
) {
  return prisma.$transaction(async (tx) => {
    // Collect foodIds only from existing-food items.
    const foodIds = [
      ...new Set(
        input.items.flatMap((item) => ('foodId' in item ? [item.foodId] : [])),
      ),
    ];

    // Fetch foods belonging to this user or shared catalogue.
    const foods = await tx.food.findMany({
      where: {
        id: { in: foodIds },
        //OR: [{ userId: null }, { userId }],
      },
    });

    const foodMap = new Map(foods.map((food) => [food.id, food]));

    const missingFoodIds = foodIds.filter((id) => {
      const food = foodMap.get(id);

      if (!food) return true;

      // Allow shared foods and foods owned by this user.
      return food.userId != null && food.userId !== userId;
    });

    if (missingFoodIds.length > 0) {
      throw new Error(
        `Food not found or access denied: ${missingFoodIds.join(', ')}`,
      );
    }

    // Create the meal.
    const meal = await tx.meal.create({
      data: {
        userId,
        mealType: input.mealType,
        eatenAt: input.eatenAt ? new Date(input.eatenAt) : new Date(),
        notes: input.notes,
      },
    });

    // Create each meal item.
    for (const item of input.items) {
      const multiplier = item.weightGrams / 100;

      if ('foodId' in item) {
        // CASE 1: Existing Food record.
        const food = foodMap.get(item.foodId);

        if (!food) {
          throw new Error(`Food not found: ${item.foodId}`);
        }

        await tx.mealItem.create({
          data: {
            mealId: meal.id,
            foodId: food.id,

            foodName: food.name,
            caloriesPer100g: food.caloriesPer100g,
            proteinPer100g: food.proteinPer100g,
            carbsPer100g: food.carbsPer100g,
            fatPer100g: food.fatPer100g,
            fiberPer100g: food.fiberPer100g,

            quantity: item.quantity,
            unit: item.unit,
            weightGrams: item.weightGrams,

            calories: food.caloriesPer100g * multiplier,
            protein: food.proteinPer100g * multiplier,
            carbs: food.carbsPer100g * multiplier,
            fat: food.fatPer100g * multiplier,

            fiber:
              food.fiberPer100g !== null
                ? food.fiberPer100g * multiplier
                : null,

            estimationMethod: food.estimationMethod ?? food.source,

            confidence: food.confidence,

            isEstimated:
              food.source === 'ai' ||
              food.estimationMethod === 'ai_estimate' ||
              Boolean(item.assumptions),

            assumptions:
              item.assumptions ??
              (food.typicalServingGrams
                ? `Typical serving: ${food.typicalServingGrams}g`
                : null),

            nutritionSource: food.source,
          },
        });
      } else {
        // CASE 2: Standalone nutrition snapshot.
        // Validation schema requires confirmedByUser: true.

        if (item.confidence >= 0.5) {
          throw new Error('Snapshot-only items must have confidence below 0.5');
        }

        const snapshot = {
          foodName: item.foodName,
          caloriesPer100g: item.caloriesPer100g,
          proteinPer100g: item.proteinPer100g,
          carbsPer100g: item.carbsPer100g,
          fatPer100g: item.fatPer100g,
          fiberPer100g: item.fiberPer100g ?? null,
        };

        await tx.mealItem.create({
          data: {
            mealId: meal.id,
            foodId: null,

            ...snapshot,

            quantity: item.quantity,
            unit: item.unit,
            weightGrams: item.weightGrams,

            calories: snapshot.caloriesPer100g * multiplier,
            protein: snapshot.proteinPer100g * multiplier,
            carbs: snapshot.carbsPer100g * multiplier,
            fat: snapshot.fatPer100g * multiplier,

            fiber:
              snapshot.fiberPer100g !== null
                ? snapshot.fiberPer100g * multiplier
                : null,

            estimationMethod: 'ai_estimate',
            confidence: item.confidence,
            isEstimated: true,
            assumptions: item.assumptions ?? null,
            nutritionSource: 'ai',

            // Preserve the original AI estimate.
            originalAiConfidence: item.confidence,
            originalAiAssumptions: item.assumptions ?? null,
            originalAiNutrition: snapshot,
          },
        });
      }
    }

    // Return saved meal with related Food records.
    return tx.meal.findUnique({
      where: {
        id: meal.id,
      },
      include: {
        items: {
          include: {
            food: true,
          },
        },
      },
    });
  });
}

export async function updateMealItem(
  userId: string,
  mealId: string,
  itemId: string,
  input: UpdateMealItemInput,
) {
  return prisma.$transaction(async (tx) => {
    // Verify that the meal belongs to the authenticated user.
    const meal = await tx.meal.findFirst({
      where: {
        id: mealId,
        userId,
      },
    });

    if (!meal) {
      throw new Error('Meal not found');
    }

    // Verify that the item belongs to this meal.
    const existingItem = await tx.mealItem.findFirst({
      where: {
        id: itemId,
        mealId,
      },
    });

    if (!existingItem) {
      throw new Error('Meal item not found');
    }

    const multiplier = input.weightGrams / 100;

    // Update the current nutrition snapshot.
    // Original AI provenance fields are intentionally untouched.
    return tx.mealItem.update({
      where: {
        id: itemId,
      },
      data: {
        foodName: input.foodName,
        quantity: input.quantity,
        unit: input.unit,
        weightGrams: input.weightGrams,

        caloriesPer100g: input.caloriesPer100g,
        proteinPer100g: input.proteinPer100g,
        carbsPer100g: input.carbsPer100g,
        fatPer100g: input.fatPer100g,
        fiberPer100g: input.fiberPer100g,

        calories: input.caloriesPer100g * multiplier,
        protein: input.proteinPer100g * multiplier,
        carbs: input.carbsPer100g * multiplier,
        fat: input.fatPer100g * multiplier,
        fiber:
          input.fiberPer100g !== null ? input.fiberPer100g * multiplier : null,

        assumptions: input.assumptions ?? existingItem.assumptions,
      },
      include: {
        food: true,
      },
    });
  });
}

export async function deleteMealItem(
  userId: string,
  mealId: string,
  itemId: string,
) {
  return prisma.$transaction(async (tx) => {
    // Verify that the meal belongs to the user.
    const meal = await tx.meal.findFirst({
      where: {
        id: mealId,
        userId,
      },
    });

    if (!meal) {
      throw new Error('MEAL_NOT_FOUND');
    }

    // Verify that the item belongs to this meal.
    const existingItem = await tx.mealItem.findFirst({
      where: {
        id: itemId,
        mealId,
      },
    });

    if (!existingItem) {
      throw new Error('MEAL_ITEM_NOT_FOUND');
    }

    // Delete only the MealItem, never the Food record.
    return tx.mealItem.delete({
      where: {
        id: itemId,
      },
    });
  });
}

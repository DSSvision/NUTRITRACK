import { prisma } from '../prisma';
import { usdaProvider } from './usda.provider.js';
import { convertFoodQuantityToGrams } from './serving-converter';
import {
  estimateFoodNutrition,
  estimateServingWeight,
} from './gemini.provider';

export async function searchNutrition(userId: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    throw new Error('Food search query is required');
  }

  // 1. Search foods belonging to this user.
  const privateFoods = await prisma.food.findMany({
    where: {
      userId,
      OR: [
        {
          normalizedName: {
            contains: normalizedQuery,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: normalizedQuery,
            mode: 'insensitive',
          },
        },
        {
          aliases: {
            has: normalizedQuery,
          },
        },
      ],
    },
    take: 20,
  });

  // 2. Search shared foods only.
  const sharedFoods = await prisma.food.findMany({
    where: {
      userId: null,
      OR: [
        {
          normalizedName: {
            contains: normalizedQuery,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: normalizedQuery,
            mode: 'insensitive',
          },
        },
        {
          aliases: {
            has: normalizedQuery,
          },
        },
      ],
    },
    take: 20,
  });

  const localFoods = [...privateFoods, ...sharedFoods];

  if (localFoods.length > 0) {
    return {
      source: 'local',
      foods: localFoods,
    };
  }

  // 3. Search USDA only when no local match exists.
  const result = await usdaProvider.searchFood(normalizedQuery);

  return {
    source: 'usda',
    foods: result.foods,
  };
}

export async function importNutritionFood(
  userId: string,
  food: {
    externalId: string;
    name: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    fiberPer100g?: number;
  },
) {
  const existingFood = await prisma.food.findFirst({
    where: {
      source: 'usda',
      externalId: food.externalId,
    },
  });

  if (existingFood) {
    return existingFood;
  }

  return prisma.food.create({
    data: {
      name: food.name.trim(),
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g,
      source: 'usda',
      externalId: food.externalId,
    },
  });
}

export async function resolveNutritionItems(
  userId: string,
  items: Array<{
    name: string;
    quantity: number;
    unit: 'g' | 'kg' | 'oz' | 'lb' | 'piece' | 'serving' | 'bowl' | 'cup';
  }>,
) {
  const resolvedItems = [];

  for (const item of items) {
    const normalizedName = item.name.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!normalizedName) {
      resolvedItems.push({
        name: item.name,
        resolved: false,
        reason: 'Food name is required',
      });
      continue;
    }

    // 1. Search user's private foods first.
    let food = await prisma.food.findFirst({
      where: {
        userId,
        OR: [
          { normalizedName },
          { name: { equals: normalizedName, mode: 'insensitive' } },
          { aliases: { has: normalizedName } },
        ],
      },
    });

    let source = 'local';

    // 2. Search shared foods.
    if (!food) {
      food = await prisma.food.findFirst({
        where: {
          userId: null,
          OR: [
            { normalizedName },
            { name: { equals: normalizedName, mode: 'insensitive' } },
            { aliases: { has: normalizedName } },
          ],
        },
      });
    }

    // 3. Search USDA if no database match exists.
    if (!food) {
      const result = await usdaProvider.searchFood(normalizedName);

      // Initially accept only a close name match.
      const usdaFood = result.foods.find((candidate) => {
        const candidateName = candidate.name
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');

        return (
          candidateName === normalizedName ||
          candidateName.includes(normalizedName) ||
          normalizedName.includes(candidateName)
        );
      });

      if (usdaFood) {
        food = await prisma.food.findFirst({
          where: {
            source: 'usda',
            externalId: usdaFood.externalId,
          },
        });

        if (!food) {
          food = await prisma.food.create({
            data: {
              name: usdaFood.name,
              normalizedName: usdaFood.name
                .trim()
                .toLowerCase()
                .replace(/\s+/g, ' '),
              caloriesPer100g: usdaFood.caloriesPer100g,
              proteinPer100g: usdaFood.proteinPer100g,
              carbsPer100g: usdaFood.carbsPer100g,
              fatPer100g: usdaFood.fatPer100g,
              fiberPer100g: usdaFood.fiberPer100g,
              source: 'usda',
              externalId: usdaFood.externalId,
              estimationMethod: 'usda',
              isVerified: false,
            },
          });
        }

        source = 'usda';
      }
    }

    // 4. AI fallback when no suitable database/USDA match exists.
    if (!food) {
      const estimate = await estimateFoodNutrition(normalizedName);

      const isLowConfidence = estimate.confidence < 0.5;

      // Save only estimates with sufficient confidence.
      if (!isLowConfidence) {
        food = await prisma.food.create({
          data: {
            userId: null,
            name: estimate.name,
            normalizedName: estimate.name
              .trim()
              .toLowerCase()
              .replace(/\s+/g, ' '),
            aliases: estimate.aliases.map((alias) =>
              alias.trim().toLowerCase(),
            ),
            caloriesPer100g: estimate.caloriesPer100g,
            proteinPer100g: estimate.proteinPer100g,
            carbsPer100g: estimate.carbsPer100g,
            fatPer100g: estimate.fatPer100g,
            fiberPer100g: estimate.fiberPer100g,
            typicalServingGrams: estimate.typicalServingGrams,
            source: 'ai',
            estimationMethod: 'ai_estimate',
            confidence: estimate.confidence,
            isVerified: false,
          },
        });
      }

      source = 'ai';

      // Use a temporary nutrition object for low-confidence estimates.
      if (isLowConfidence) {
        const conversion = await resolveServingConversion(
          normalizedName,
          item.quantity,
          item.unit,
          estimate.typicalServingGrams,
        );

        const multiplier = conversion.grams / 100;

        resolvedItems.push({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          weightGrams: conversion.grams,
          estimated: true,
          assumption: conversion.assumption,
          source,
          resolved: true,
          requiresReview: true,
          warning: 'Low-confidence AI estimate; not saved to the database.',
          confidence: estimate.confidence,
          nutrition: {
            calories: estimate.caloriesPer100g * multiplier,
            protein: estimate.proteinPer100g * multiplier,
            carbs: estimate.carbsPer100g * multiplier,
            fat: estimate.fatPer100g * multiplier,
            fiber: estimate.fiberPer100g * multiplier,
          },
        });

        continue;
      }
    }

    // 5. Calculate nutrition from the selected database food.
    const conversion = await resolveServingConversion(
      food!.name,
      item.quantity,
      item.unit,
      food!.typicalServingGrams,
    );

    const multiplier = conversion.grams / 100;

    resolvedItems.push({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      weightGrams: conversion.grams,
      estimated: conversion.estimated || source === 'ai',
      assumption: conversion.assumption,
      source,
      resolved: true,
      requiresReview: source === 'ai',
      confidence: food!.confidence,
      food: {
        id: food!.id,
        name: food!.name,
      },
      nutrition: {
        calories: food!.caloriesPer100g * multiplier,
        protein: food!.proteinPer100g * multiplier,
        carbs: food!.carbsPer100g * multiplier,
        fat: food!.fatPer100g * multiplier,
        fiber:
          food!.fiberPer100g !== null ? food!.fiberPer100g! * multiplier : null,
      },
    });
  }

  return { items: resolvedItems };
}

async function resolveServingConversion(
  foodName: string,
  quantity: number,
  unit: 'g' | 'kg' | 'oz' | 'lb' | 'piece' | 'serving' | 'bowl' | 'cup',
  typicalServingGrams?: number | null,
) {
  try {
    return convertFoodQuantityToGrams(
      foodName,
      quantity,
      unit,
      typicalServingGrams,
    );
  } catch (error) {
    // Only estimate serving weights for non-weight units.
    if (['g', 'kg', 'oz', 'lb'].includes(unit)) {
      throw error;
    }

    const estimate = await estimateServingWeight(
      foodName,
      unit as 'piece' | 'serving' | 'bowl' | 'cup',
    );

    return {
      grams: quantity * estimate.gramsPerUnit,
      estimated: true,
      assumption: estimate.assumption,
    };
  }
}

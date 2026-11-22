import { prisma } from '../prisma';

export interface CreateFoodInput {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  source?: 'manual' | 'usda' | 'ai';
  externalId?: string;
}

export async function createFood(userId: string, input: CreateFoodInput) {
  return prisma.food.create({
    data: {
      userId,
      name: input.name.trim(),
      caloriesPer100g: input.caloriesPer100g,
      proteinPer100g: input.proteinPer100g,
      carbsPer100g: input.carbsPer100g,
      fatPer100g: input.fatPer100g,
      fiberPer100g: input.fiberPer100g,
      source: input.source ?? 'manual',
      externalId: input.externalId,
    },
  });
}

export async function getFoods(search?: string) {
  return prisma.food.findMany({
    where: search
      ? {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }
      : undefined,
    orderBy: {
      name: 'asc',
    },
    take: 50,
  });
}

export async function getFoodById(id: string) {
  return prisma.food.findUnique({
    where: { id },
  });
}

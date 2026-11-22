import { prisma } from '../prisma';
import { convertWeight } from '@calorie-tracker/nutrition';

export interface CreateWeightData {
  userId: string;
  value: number;
  unit: 'kg' | 'lb';
  recordedAt?: string;
}

export async function createWeightEntry(data: CreateWeightData) {
  const weightKg = convertWeight(data.value, data.unit, 'kg');

  return prisma.weightEntry.create({
    data: {
      userId: data.userId,

      value: data.value,

      unit: data.unit,

      weightKg,

      recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
    },
  });
}

export async function getWeightHistory(userId: string) {
  return prisma.weightEntry.findMany({
    where: {
      userId,
    },

    orderBy: {
      recordedAt: 'desc',
    },

    take: 100,
  });
}

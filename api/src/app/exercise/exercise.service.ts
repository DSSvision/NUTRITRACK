import { prisma } from '../prisma';

export interface CreateExerciseData {
  userId: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  performedAt?: string;
  notes?: string;
}

export async function createExercise(data: CreateExerciseData) {
  return prisma.exercise.create({
    data: {
      userId: data.userId,

      name: data.name.trim(),

      durationMinutes: data.durationMinutes,

      caloriesBurned: data.caloriesBurned,

      performedAt: data.performedAt ? new Date(data.performedAt) : new Date(),

      notes: data.notes,
    },
  });
}

export async function getExercises(userId: string, date?: string) {
  const start = date ? new Date(`${date}T00:00:00.000`) : new Date();

  if (!date) {
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return prisma.exercise.findMany({
    where: {
      userId,
      performedAt: {
        gte: start,
        lt: end,
      },
    },
    orderBy: {
      performedAt: 'asc',
    },
  });
}

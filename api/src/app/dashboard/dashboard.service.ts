import { prisma } from '../prisma';
import { calculateMacroTarget } from '@calorie-tracker/nutrition';

export async function getDailyDashboard(userId: string, date?: string) {
  const start = date
    ? new Date(`${date}T00:00:00.000`)
    : new Date(new Date().setHours(0, 0, 0, 0));

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [profile, meals, exercises] = await Promise.all([
    prisma.userProfile.findUnique({
      where: {
        userId,
      },
    }),

    prisma.meal.findMany({
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
    }),

    prisma.exercise.findMany({
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
    }),
  ]);

  if (!profile) {
    throw new Error('Profile not found');
  }

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;

  for (const meal of meals) {
    for (const item of meal.items) {
      calories += item.calories;
      protein += item.protein;
      carbs += item.carbs;
      fat += item.fat;

      if (item.fiber !== null) {
        fiber += item.fiber;
      }
    }
  }

  const exerciseCalories = exercises.reduce(
    (total, exercise) => total + exercise.caloriesBurned,
    0,
  );

  const netCalories = calories - exerciseCalories;

  const macroTarget = calculateMacroTarget({
    calories: profile.dailyCalorieTarget,
  });

  return {
    date: start.toISOString().slice(0, 10),

    calories: {
      target: profile.dailyCalorieTarget,
      consumed: Math.round(calories),
      remaining: Math.round(profile.dailyCalorieTarget - calories),
    },

    macros: {
      protein: {
        target: macroTarget.proteinGrams,
        consumed: Math.round(protein),
      },
      carbs: {
        target: macroTarget.carbsGrams,
        consumed: Math.round(carbs),
      },
      fat: {
        target: macroTarget.fatGrams,
        consumed: Math.round(fat),
      },
      fiber: {
        consumed: Math.round(fiber),
      },
    },

    exercise: {
      caloriesBurned: Math.round(exerciseCalories),
    },

    netCalories: Math.round(netCalories),

    meals,

    exercises,
  };
}

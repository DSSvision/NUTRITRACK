import { prisma } from './prisma';
import {
  calculateCalorieTarget,
  calculateMacroTarget,
  convertWeight,
  convertHeightToCm,
  validateCalorieTarget,
} from '@calorie-tracker/nutrition';
import type { UserProfileInput } from '@calorie-tracker/validation';

export async function getProfile(userId: string) {
  return prisma.userProfile.findUnique({
    where: {
      userId,
    },
  });
}

export async function createOrUpdateProfile(
  userId: string,
  input: UserProfileInput,
) {
  // Convert height to cm for calculations
  const heightCm = convertHeightToCm(input.height.value, input.height.unit);

  // Convert current weight to kg
  const weightKg = convertWeight(
    input.currentWeight.value,
    input.currentWeight.unit,
    'kg',
  );

  // Calculate target calories
  const calculatedCalories = calculateCalorieTarget({
    age: input.age,
    gender: input.gender,
    heightCm,
    weightKg,
    activityLevel: input.activityLevel,
    goal: input.goal,
  });

  // Validate calculated calories
  const safetyResult = validateCalorieTarget(calculatedCalories);

  if (!safetyResult.safe) {
    throw new Error(
      safetyResult.reason ?? 'Calorie target failed safety validation',
    );
  }

  // Determine whether the user wants to override
  const isOverride = input.calorieTargetOverridden === true;

  const dailyCalorieTarget =
    isOverride && input.dailyCalorieTarget
      ? input.dailyCalorieTarget
      : calculatedCalories;

  // Validate the final target as well
  const finalSafetyResult = validateCalorieTarget(dailyCalorieTarget);

  if (!finalSafetyResult.safe) {
    throw new Error(
      finalSafetyResult.reason ?? 'Calorie target failed safety validation',
    );
  }

  // Calculate macros from final calorie target
  const macros = calculateMacroTarget({
    calories: dailyCalorieTarget,
  });

  const profile = await prisma.userProfile.upsert({
    where: {
      userId,
    },

    create: {
      userId,

      age: input.age,
      gender: input.gender,

      heightValue: input.height.value,
      heightUnit: input.height.unit,

      currentWeightValue: input.currentWeight.value,
      currentWeightUnit: input.currentWeight.unit,

      activityLevel: input.activityLevel,
      goal: input.goal,

      targetWeightValue: input.targetWeight.value,
      targetWeightUnit: input.targetWeight.unit,

      dailyCalorieTarget,

      calorieTargetOverridden: isOverride,
    },

    update: {
      age: input.age,
      gender: input.gender,

      heightValue: input.height.value,
      heightUnit: input.height.unit,

      currentWeightValue: input.currentWeight.value,
      currentWeightUnit: input.currentWeight.unit,

      activityLevel: input.activityLevel,
      goal: input.goal,

      targetWeightValue: input.targetWeight.value,
      targetWeightUnit: input.targetWeight.unit,

      dailyCalorieTarget,

      calorieTargetOverridden: isOverride,
    },
  });

  return {
    profile,
    nutrition: {
      calculatedCalorieTarget: calculatedCalories,

      dailyCalorieTarget,

      calorieTargetOverridden: isOverride,

      macros,
    },
  };
}

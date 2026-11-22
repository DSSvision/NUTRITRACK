export interface CalorieSafetyResult {
  safe: boolean;
  calorieTarget: number;
  reason?: string;
}

export interface CalorieSafetyConfig {
  minimumCalories: number;
  maximumCalories: number;
}

const DEFAULT_SAFETY_CONFIG: CalorieSafetyConfig = {
  minimumCalories: 1200,
  maximumCalories: 5000,
};

export function validateCalorieTarget(
  calories: number,
  config: CalorieSafetyConfig = DEFAULT_SAFETY_CONFIG,
): CalorieSafetyResult {
  if (!Number.isFinite(calories)) {
    return {
      safe: false,
      calorieTarget: calories,
      reason: 'Calorie target must be a valid number.',
    };
  }

  if (calories < config.minimumCalories) {
    return {
      safe: false,
      calorieTarget: calories,
      reason: `Calorie target is below the configured minimum of ${config.minimumCalories} kcal.`,
    };
  }

  if (calories > config.maximumCalories) {
    return {
      safe: false,
      calorieTarget: calories,
      reason: `Calorie target exceeds the configured maximum of ${config.maximumCalories} kcal.`,
    };
  }

  return {
    safe: true,
    calorieTarget: Math.round(calories),
  };
}

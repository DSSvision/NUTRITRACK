export interface MacroTarget {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
}

export interface MacroTargetInput {
  calories: number;
  proteinPercentage?: number;
  carbsPercentage?: number;
  fatPercentage?: number;
}

export function calculateMacroTarget({
  calories,
  proteinPercentage = 25,
  carbsPercentage = 45,
  fatPercentage = 30,
}: MacroTargetInput): MacroTarget {
  const proteinCalories = calories * (proteinPercentage / 100);

  const carbsCalories = calories * (carbsPercentage / 100);

  const fatCalories = calories * (fatPercentage / 100);

  return {
    proteinGrams: Math.round(proteinCalories / 4),
    carbsGrams: Math.round(carbsCalories / 4),
    fatGrams: Math.round(fatCalories / 9),

    proteinCalories: Math.round(proteinCalories),
    carbsCalories: Math.round(carbsCalories),
    fatCalories: Math.round(fatCalories),
  };
}

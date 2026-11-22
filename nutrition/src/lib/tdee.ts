import { calculateBmr, type BmrInput } from './bmr.js';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extremely_active';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

export function calculateTdee(
  input: BmrInput & {
    activityLevel: ActivityLevel;
  },
): number {
  const bmr = calculateBmr(input);

  return Math.round(bmr * ACTIVITY_MULTIPLIERS[input.activityLevel]);
}

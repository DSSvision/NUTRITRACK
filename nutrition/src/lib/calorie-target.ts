import type { ActivityLevel } from './tdee.js';
import type { Gender } from './bmr.js';
import { calculateTdee } from './tdee.js';

export type Goal = 'lose' | 'maintain' | 'gain';

export interface CalorieTargetInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
}

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

export function calculateCalorieTarget(input: CalorieTargetInput): number {
  const tdee = calculateTdee(input);

  return Math.round(tdee + GOAL_ADJUSTMENTS[input.goal]);
}

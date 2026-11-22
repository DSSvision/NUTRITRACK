export type Gender = 'male' | 'female' | 'other';

export interface BmrInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}

export function calculateBmr({
  weightKg,
  heightCm,
  age,
  gender,
}: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender === 'male') {
    return Math.round(base + 5);
  }

  if (gender === 'female') {
    return Math.round(base - 161);
  }

  // For "other", use the midpoint of the
  // male and female Mifflin-St Jeor constants.
  return Math.round(base - 78);
}

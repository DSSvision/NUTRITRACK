export type WeightUnit = 'g' | 'kg' | 'oz' | 'lb';

const GRAMS_PER_UNIT: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
};

export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Weight must be a non-negative number');
  }

  const grams = value * GRAMS_PER_UNIT[from];

  return grams / GRAMS_PER_UNIT[to];
}

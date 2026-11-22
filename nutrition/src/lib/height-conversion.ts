export type HeightUnit = 'cm' | 'in';

export function convertHeightToCm(value: number, unit: HeightUnit): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Height must be a positive number');
  }

  if (unit === 'cm') {
    return value;
  }

  return value * 2.54;
}

export interface ServingConversion {
  grams: number;
  estimated: boolean;
  assumption?: string;
}

type ServingUnit = 'piece' | 'serving' | 'bowl' | 'cup';

const DEFAULT_SERVINGS: Record<string, Partial<Record<ServingUnit, number>>> = {
  roti: { piece: 60 },
  chapati: { piece: 60 },
  naan: { piece: 90 },
  paratha: { piece: 100 },

  rice: { bowl: 200, cup: 160 },
  'white rice': { bowl: 200, cup: 160 },

  dal: { bowl: 200, cup: 200 },
  lentils: { bowl: 200, cup: 200 },

  milk: { cup: 240 },
  curd: { bowl: 200, cup: 200 },
  yogurt: { bowl: 200, cup: 200 },

  egg: { piece: 50, serving: 50 },
  banana: { piece: 118, serving: 118 },
  apple: { piece: 182, serving: 182 },
  orange: { piece: 130, serving: 130 },

  chicken: { serving: 100 },
  'chicken breast': { serving: 100 },

  'chicken puff': { piece: 120, serving: 120 },
  puff: { piece: 120, serving: 120 },
  'egg puff': { piece: 120, serving: 120 },
  'veg puff': { piece: 100, serving: 100 },
};

const ALIASES: Record<string, string> = {
  'indian roti': 'roti',
  'indian flatbread': 'roti',
  daal: 'dal',
  lentil: 'lentils',
  eggs: 'egg',
  'boiled eggs': 'egg',
  'boiled egg': 'egg',
  bananas: 'banana',
  apples: 'apple',
  oranges: 'orange',
  'chicken puffs': 'chicken puff',
  puffs: 'puff',
  'egg puffs': 'egg puff',
  'vegetable puff': 'veg puff',
  'vegetable puffs': 'veg puff',
};

function findFoodKey(foodName: string): string {
  const normalized = foodName.trim().toLowerCase();

  if (ALIASES[normalized]) {
    return ALIASES[normalized];
  }

  return normalized;
}

export function convertFoodQuantityToGrams(
  foodName: string,
  quantity: number,
  unit: string,
  typicalServingGrams?: number | null,
): ServingConversion {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Food quantity must be greater than zero');
  }

  // Explicit weight always takes priority.
  switch (unit) {
    case 'g':
      return { grams: quantity, estimated: false };

    case 'kg':
      return { grams: quantity * 1000, estimated: false };

    case 'oz':
      return { grams: quantity * 28.3495, estimated: false };

    case 'lb':
      return { grams: quantity * 453.592, estimated: false };
  }

  const supportedUnits: ServingUnit[] = ['piece', 'serving', 'bowl', 'cup'];

  if (!supportedUnits.includes(unit as ServingUnit)) {
    throw new Error(`Unsupported food unit: ${unit}`);
  }

  // Prefer the serving weight saved in the database.
  if (
    typicalServingGrams != null &&
    Number.isFinite(typicalServingGrams) &&
    typicalServingGrams > 0
  ) {
    return {
      grams: quantity * typicalServingGrams,
      estimated: true,
      assumption: `Using saved typical serving weight of ${typicalServingGrams}g per ${unit}`,
    };
  }

  // Fall back to known common serving sizes.
  const foodKey = findFoodKey(foodName);
  const serving = DEFAULT_SERVINGS[foodKey]?.[unit as ServingUnit];

  if (serving) {
    return {
      grams: quantity * serving,
      estimated: true,
      assumption: `${serving}g per ${unit}`,
    };
  }

  // Do not silently invent a serving size.
  throw new Error(
    `No serving-size assumption available for "${foodName}" (${unit}). A serving estimate is required.`,
  );
}

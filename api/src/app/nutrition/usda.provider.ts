import type {
  NutritionFood,
  NutritionSearchResult,
  NutritionProvider,
} from '@calorie-tracker/nutrition';

interface UsdaFood {
  fdcId: number;
  description: string;
  foodNutrients?: Array<{
    nutrientId: number;
    value: number;
  }>;
  dataType?: string;
}

interface UsdaSearchResponse {
  foods?: UsdaFood[];
}

function getUsdaApiKey(): string {
  const key = process.env.USDA_API_KEY;

  // console.log('USDA_API_KEY configured:', Boolean(process.env.USDA_API_KEY));
  // console.log('USDA_API_KEY length:', process.env.USDA_API_KEY?.length ?? 0);

  if (!key) {
    throw new Error('USDA_API_KEY is not configured');
  }

  return key;
}

function getNutrientValue(food: UsdaFood, nutrientId: number): number {
  return (
    food.foodNutrients?.find((nutrient) => nutrient.nutrientId === nutrientId)
      ?.value ?? 0
  );
}

export const usdaProvider: NutritionProvider = {
  async searchFood(query: string): Promise<NutritionSearchResult> {
    const apiKey = getUsdaApiKey();

    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          query,
          pageSize: 10,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`USDA request failed: ${response.status}`);
    }

    const data = (await response.json()) as UsdaSearchResponse;

    const foods: NutritionFood[] = (data.foods ?? []).map((food) => ({
      externalId: String(food.fdcId),

      name: food.description,

      description: food.description,

      dataType: food.dataType,

      caloriesPer100g: getNutrientValue(food, 1008),

      proteinPer100g: getNutrientValue(food, 1003),

      carbsPer100g: getNutrientValue(food, 1005),

      fatPer100g: getNutrientValue(food, 1004),

      fiberPer100g: getNutrientValue(food, 1079),

      source: 'usda',
    }));

    return {
      foods,
    };
  },
};

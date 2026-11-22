export interface NutritionFood {
  externalId?: string;

  name: string;

  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;

  source: 'usda' | 'ai' | 'manual';
}

export interface NutritionSearchResult {
  foods: NutritionFood[];
}

export interface NutritionProvider {
  searchFood(query: string): Promise<NutritionSearchResult>;
}

export interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: 'g' | 'kg' | 'oz' | 'lb' | 'piece' | 'serving' | 'bowl' | 'cup';
}

export interface NutritionParseResult {
  items: ParsedFoodItem[];
}

export interface NutritionAiProvider {
  parseFoodText(text: string): Promise<NutritionParseResult>;
}

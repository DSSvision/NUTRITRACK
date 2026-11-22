import { GoogleGenAI, Type } from '@google/genai';

import type {
  NutritionAiProvider,
  NutritionParseResult,
} from '@calorie-tracker/nutrition';

import { nutritionParseResultSchema } from '@calorie-tracker/validation';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return new GoogleGenAI({ apiKey });
}

export interface FoodNutritionEstimate {
  name: string;
  aliases: string[];
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  typicalServingGrams: number;
  confidence: number;
  assumptions: string;
}

export const geminiNutritionProvider: NutritionAiProvider = {
  async parseFoodText(text: string): Promise<NutritionParseResult> {
    const client = getGeminiClient();

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: text,
      config: {
        systemInstruction: `
You extract food items from natural language.

Identify food items, quantities, and units only.
Do not calculate or invent nutrition values.

Rules:
- Preserve quantities provided by the user.
- "2 rotis" → quantity 2, unit "piece".
- "150g chicken" → quantity 150, unit "g".
- "one bowl of rice" → quantity 1, unit "bowl".
- "one cup milk" → quantity 1, unit "cup".
- If quantity is missing, use quantity 1 and unit "serving".
- Return simple searchable food names.
        `,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: {
                    type: Type.STRING,
                    enum: [
                      'g',
                      'kg',
                      'oz',
                      'lb',
                      'piece',
                      'serving',
                      'bowl',
                      'cup',
                    ],
                  },
                },
                required: ['name', 'quantity', 'unit'],
              },
            },
          },
          required: ['items'],
        },
      },
    });

    const output = response.text;

    if (!output) {
      throw new Error('Gemini returned an empty response');
    }

    let raw: unknown;

    try {
      raw = JSON.parse(output);
    } catch {
      throw new Error('Gemini returned invalid JSON');
    }

    const parsed = nutritionParseResultSchema.safeParse(raw);

    if (!parsed.success) {
      throw new Error('Gemini returned invalid food data');
    }

    return parsed.data;
  },
};

// Separate AI operation for estimating food nutrition.
export async function estimateFoodNutrition(
  foodName: string,
): Promise<FoodNutritionEstimate> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: `Estimate nutrition for this food: "${foodName}".`,
    config: {
      systemInstruction: `
You are a food nutrition estimation assistant.

Estimate typical nutrition values for the described food.

Rules:
- Return nutrition values per 100 grams.
- Estimate a realistic typical serving size in grams.
- Consider common preparation methods and ingredients.
- For composite foods, estimate the typical combined ingredients.
- Do not confuse raw, cooked, fried, dried or packaged foods.
- Do not invent precision. Use reasonable estimates.
- Confidence must be between 0 and 1.
- Explain important assumptions, especially for foods with variable recipes.
- If the food is too ambiguous to estimate reliably, use low confidence.
      `,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          aliases: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          caloriesPer100g: { type: Type.NUMBER },
          proteinPer100g: { type: Type.NUMBER },
          carbsPer100g: { type: Type.NUMBER },
          fatPer100g: { type: Type.NUMBER },
          fiberPer100g: { type: Type.NUMBER },
          typicalServingGrams: { type: Type.NUMBER },
          confidence: { type: Type.NUMBER },
          assumptions: { type: Type.STRING },
        },
        required: [
          'name',
          'aliases',
          'caloriesPer100g',
          'proteinPer100g',
          'carbsPer100g',
          'fatPer100g',
          'fiberPer100g',
          'typicalServingGrams',
          'confidence',
          'assumptions',
        ],
      },
    },
  });

  const output = response.text;

  if (!output) {
    throw new Error('Gemini returned an empty nutrition estimate');
  }

  let estimate: unknown;

  try {
    estimate = JSON.parse(output);
  } catch {
    throw new Error('Gemini returned invalid nutrition JSON');
  }

  // Validate the returned values before storing them.
  const value = estimate as Record<string, unknown>;

  const numericFields = [
    'caloriesPer100g',
    'proteinPer100g',
    'carbsPer100g',
    'fatPer100g',
    'fiberPer100g',
    'typicalServingGrams',
    'confidence',
  ];

  for (const field of numericFields) {
    if (
      typeof value[field] !== 'number' ||
      !Number.isFinite(value[field] as number) ||
      (value[field] as number) < 0
    ) {
      throw new Error(`Gemini returned an invalid ${field}`);
    }
  }

  if (
    (value.confidence as number) > 1 ||
    (value.typicalServingGrams as number) <= 0 ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.aliases) ||
    typeof value.assumptions !== 'string'
  ) {
    throw new Error('Gemini returned invalid nutrition estimate data');
  }

  return value as unknown as FoodNutritionEstimate;
}

export interface ServingWeightEstimate {
  gramsPerUnit: number;
  assumption: string;
}

export async function estimateServingWeight(
  foodName: string,
  unit: 'piece' | 'serving' | 'bowl' | 'cup',
): Promise<ServingWeightEstimate> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: `Estimate the weight in grams of ONE ${unit} of "${foodName}".`,
    config: {
      systemInstruction: `
You estimate food serving weights.

Rules:
- Estimate the weight of exactly one requested unit.
- Consider typical Indian food portions where applicable.
- For piece, estimate one individual piece.
- For bowl, estimate one typical bowl of prepared food.
- For cup, estimate one standard cup.
- For serving, estimate one typical individual serving.
- Return a realistic weight in grams.
- Explain the serving-size assumption briefly.
- Do not return nutrition values.
      `,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          gramsPerUnit: { type: Type.NUMBER },
          assumption: { type: Type.STRING },
        },
        required: ['gramsPerUnit', 'assumption'],
      },
    },
  });

  const output = response.text;

  if (!output) {
    throw new Error('Gemini returned an empty serving-weight estimate');
  }

  let result: unknown;

  try {
    result = JSON.parse(output);
  } catch {
    throw new Error('Gemini returned invalid serving-weight JSON');
  }

  const value = result as Record<string, unknown>;

  if (
    typeof value.gramsPerUnit !== 'number' ||
    !Number.isFinite(value.gramsPerUnit) ||
    value.gramsPerUnit <= 0 ||
    value.gramsPerUnit > 5000 ||
    typeof value.assumption !== 'string' ||
    !value.assumption.trim()
  ) {
    throw new Error('Gemini returned an invalid serving-weight estimate');
  }

  return {
    gramsPerUnit: value.gramsPerUnit,
    assumption: value.assumption,
  };
}

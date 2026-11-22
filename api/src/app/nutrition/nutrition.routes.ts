import { Router } from 'express';

import {
  nutritionImportSchema,
  nutritionSearchSchema,
  nutritionParseSchema,
  nutritionResolveSchema,
} from '@calorie-tracker/validation';
import { geminiNutritionProvider } from './gemini.provider';

import {
  importNutritionFood,
  searchNutrition,
  resolveNutritionItems,
} from './nutrition.service';

import {
  requireAuth,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';

const router = Router();

router.get(
  '/nutrition/search',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = nutritionSearchSchema.safeParse({
        query: req.query.query,
      });

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A valid food search query is required',
            details: parsed.error.flatten(),
          },
        });
      }

      const result = await searchNutrition(req.userId!, parsed.data.query);

      return res.status(200).json({
        data: result,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: {
          code: 'NUTRITION_SEARCH_FAILED',
          message:
            error instanceof Error ? error.message : 'Nutrition search failed',
        },
      });
    }
  },
);

router.post(
  '/nutrition/import',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required',
          },
        });
      }

      const parsed = nutritionImportSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.message,
          },
        });
      }

      const food = await importNutritionFood(userId, parsed.data);

      return res.status(201).json({
        food,
      });
    } catch (error) {
      console.error('Nutrition import failed:', error);

      return res.status(500).json({
        error: {
          code: 'NUTRITION_IMPORT_FAILED',
          message: 'Failed to import nutrition food',
        },
      });
    }
  },
);

router.post(
  '/nutrition/parse',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = nutritionParseSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid food text',
            details: parsed.error.flatten(),
          },
        });
      }

      const result = await geminiNutritionProvider.parseFoodText(
        parsed.data.text,
      );

      return res.status(200).json({
        data: result,
      });
    } catch (error) {
      console.error('AI nutrition parsing failed:', error);

      return res.status(500).json({
        error: {
          code: 'AI_NUTRITION_PARSE_FAILED',
          message: 'Failed to understand food input',
        },
      });
    }
  },
);

router.post(
  '/nutrition/resolve',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = nutritionResolveSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid nutrition items',
            details: parsed.error.flatten(),
          },
        });
      }

      const result = await resolveNutritionItems(
        req.userId!,
        parsed.data.items,
      );

      return res.status(200).json({
        data: result,
      });
    } catch (error) {
      console.error('Nutrition resolution failed:', error);

      const message =
        error instanceof Error ? error.message : 'Failed to resolve nutrition';

      return res.status(500).json({
        error: {
          code: 'NUTRITION_RESOLUTION_FAILED',
          message,
        },
      });
    }
  },
);

export default router;

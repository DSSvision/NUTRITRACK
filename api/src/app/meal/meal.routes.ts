import { Router } from 'express';

import {
  createMealSchema,
  addMealItemSchema,
  saveNutritionMealSchema,
  updateMealItemSchema,
} from '@calorie-tracker/validation';

import {
  createMeal,
  addMealItem,
  getMeals,
  saveNutritionMeal,
  updateMealItem,
  deleteMealItem,
} from './meal.service';

import {
  requireAuth,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';

const router = Router();

router.post('/meals', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = createMealSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid meal data',
          details: parsed.error.flatten(),
        },
      });
    }

    const meal = await createMeal({
      userId: req.userId!,
      ...parsed.data,
    });

    return res.status(201).json({
      data: meal,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: {
        code: 'MEAL_CREATE_FAILED',
        message: 'Failed to create meal',
      },
    });
  }
});

router.post(
  '/meals/:mealId/items',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = addMealItemSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid meal item data',
            details: parsed.error.flatten(),
          },
        });
      }

      const mealId = req.params.mealId;

      if (typeof mealId !== 'string') {
        return res.status(400).json({
          error: {
            code: 'INVALID_MEAL_ID',
            message: 'Invalid meal ID',
          },
        });
      }

      const item = await addMealItem({
        userId: req.userId!,
        mealId,
        ...parsed.data,
      });

      return res.status(201).json({
        data: item,
      });
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error ? error.message : 'Failed to add meal item';

      if (message === 'Meal not found' || message === 'Food not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message,
          },
        });
      }
      return res.status(500).json({
        error: {
          code: 'MEAL_ITEM_CREATE_FAILED',
          message,
        },
      });

      // return res.status(500).json({
      //   error: {
      //     code: 'MEAL_ITEM_CREATE_FAILED',
      //     message: 'Failed to add meal item',
      //   },
      // });
    }
  },
);

router.get('/meals', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const date =
      typeof req.query.date === 'string' ? req.query.date : undefined;

    const meals = await getMeals(req.userId!, date);

    return res.status(200).json({
      data: meals,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: {
        code: 'MEAL_LIST_FAILED',
        message: 'Failed to fetch meals',
      },
    });
  }
});

router.post(
  '/meals/from-nutrition',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = saveNutritionMealSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid nutrition meal data',
            details: parsed.error.flatten(),
          },
        });
      }

      const meal = await saveNutritionMeal(req.userId!, parsed.data);

      return res.status(201).json({
        data: meal,
      });
    } catch (error) {
      console.error('Save nutrition meal failed:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save nutrition meal';

      if (message.includes('Food not found')) {
        return res.status(404).json({
          error: {
            code: 'FOOD_NOT_FOUND',
            message,
          },
        });
      }

      return res.status(500).json({
        error: {
          code: 'MEAL_SAVE_FAILED',
          message: 'Failed to save nutrition meal',
        },
      });
    }
  },
);

router.patch(
  '/meals/:mealId/items/:itemId',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = updateMealItemSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid meal item update data',
            details: parsed.error.flatten(),
          },
        });
      }

      const mealId = req.params.mealId;
      const itemId = req.params.itemId;

      if (typeof mealId !== 'string' || typeof itemId !== 'string') {
        return res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: 'Invalid meal or meal item ID',
          },
        });
      }

      const item = await updateMealItem(
        req.userId!,
        mealId,
        itemId,
        parsed.data,
      );

      return res.status(200).json({
        data: item,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update meal item';

      if (message === 'Meal not found' || message === 'Meal item not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message,
          },
        });
      }

      console.error('Update meal item failed:', error);

      return res.status(500).json({
        error: {
          code: 'MEAL_ITEM_UPDATE_FAILED',
          message: 'Failed to update meal item',
        },
      });
    }
  },
);

router.delete(
  '/meals/:mealId/items/:itemId',
  async (req: AuthenticatedRequest, res) => {
    try {
      const { mealId, itemId } = req.params;

      if (
        typeof mealId !== 'string' ||
        !mealId ||
        typeof itemId !== 'string' ||
        !itemId
      ) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Meal ID and item ID are required',
          },
        });
      }

      const deletedItem = await deleteMealItem(req.userId!, mealId, itemId);

      return res.status(200).json({
        data: deletedItem,
        message: 'Meal item deleted successfully',
      });
    } catch (error) {
      console.error('Delete meal item failed:', error);

      if (error instanceof Error && error.message === 'MEAL_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'MEAL_NOT_FOUND',
            message: 'Meal not found',
          },
        });
      }

      if (error instanceof Error && error.message === 'MEAL_ITEM_NOT_FOUND') {
        return res.status(404).json({
          error: {
            code: 'MEAL_ITEM_NOT_FOUND',
            message: 'Meal item not found',
          },
        });
      }

      return res.status(500).json({
        error: {
          code: 'MEAL_ITEM_DELETE_FAILED',
          message: 'Failed to delete meal item',
        },
      });
    }
  },
);

export default router;

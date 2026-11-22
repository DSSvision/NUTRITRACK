import { Router } from 'express';
import { createFoodSchema } from '@calorie-tracker/validation';

import { createFood, getFoodById, getFoods } from './food.service';

import {
  requireAuth,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';

const router = Router();

router.post('/foods', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = createFoodSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid food data',
          details: parsed.error.flatten(),
        },
      });
    }

    const food = await createFood(req.userId!, parsed.data);

    return res.status(201).json({
      data: food,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: {
        code: 'FOOD_CREATE_FAILED',
        message: 'Failed to create food',
      },
    });
  }
});

router.get('/foods', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;

    const foods = await getFoods(search);

    return res.status(200).json({
      data: foods,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: {
        code: 'FOOD_LIST_FAILED',
        message: 'Failed to fetch foods',
      },
    });
  }
});

router.get(
  '/foods/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const foodId = req.params.id;

      if (typeof foodId !== 'string') {
        return res.status(400).json({
          error: {
            code: 'INVALID_FOOD_ID',
            message: 'Invalid food ID',
          },
        });
      }

      const food = await getFoodById(foodId);

      if (!food) {
        return res.status(404).json({
          error: {
            code: 'FOOD_NOT_FOUND',
            message: 'Food not found',
          },
        });
      }

      return res.status(200).json({
        data: food,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: {
          code: 'FOOD_GET_FAILED',
          message: 'Failed to fetch food',
        },
      });
    }
  },
);

export default router;

import { Router } from 'express';

import { createWeightSchema } from '@calorie-tracker/validation';

import { createWeightEntry, getWeightHistory } from './weight.service';

import {
  requireAuth,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';

const router = Router();

router.post('/weights', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = createWeightSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid weight data',
          details: parsed.error.flatten(),
        },
      });
    }

    const weight = await createWeightEntry({
      userId: req.userId!,
      ...parsed.data,
    });

    return res.status(201).json({
      data: weight,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: {
        code: 'WEIGHT_CREATE_FAILED',
        message: 'Failed to create weight entry',
      },
    });
  }
});

router.get('/weights', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const weights = await getWeightHistory(req.userId!);

    return res.status(200).json({
      data: weights,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: {
        code: 'WEIGHT_LIST_FAILED',
        message: 'Failed to fetch weight history',
      },
    });
  }
});

export default router;

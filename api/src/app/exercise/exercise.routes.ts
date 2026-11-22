import { Router } from 'express';

import { createExerciseSchema } from '@calorie-tracker/validation';

import { createExercise, getExercises } from './exercise.service';

import {
  requireAuth,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';

const router = Router();

router.post(
  '/exercises',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = createExerciseSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid exercise data',
            details: parsed.error.flatten(),
          },
        });
      }

      const exercise = await createExercise({
        userId: req.userId!,
        ...parsed.data,
      });

      return res.status(201).json({
        data: exercise,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: {
          code: 'EXERCISE_CREATE_FAILED',
          message: 'Failed to create exercise',
        },
      });
    }
  },
);

router.get(
  '/exercises',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const date =
        typeof req.query.date === 'string' ? req.query.date : undefined;

      const exercises = await getExercises(req.userId!, date);

      return res.status(200).json({
        data: exercises,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: {
          code: 'EXERCISE_LIST_FAILED',
          message: 'Failed to fetch exercises',
        },
      });
    }
  },
);

export default router;

import { Router } from 'express';

import {
  requireAuth,
  type AuthenticatedRequest,
} from '../auth/auth.middleware';

import { getDailyDashboard } from './dashboard.service';

const router = Router();

router.get(
  '/dashboard/daily',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const date =
        typeof req.query.date === 'string' ? req.query.date : undefined;

      const summary = await getDailyDashboard(req.userId!, date);

      return res.status(200).json({
        data: summary,
      });
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error ? error.message : 'Failed to get daily summary';

      if (message === 'Profile not found') {
        return res.status(404).json({
          error: {
            code: 'PROFILE_NOT_FOUND',
            message,
          },
        });
      }

      return res.status(500).json({
        error: {
          code: 'DASHBOARD_FAILED',
          message: 'Failed to get daily summary',
        },
      });
    }
  },
);

export default router;

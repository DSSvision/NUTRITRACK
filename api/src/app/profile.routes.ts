import { Router } from 'express';
import { userProfileSchema } from '@calorie-tracker/validation';
import { createOrUpdateProfile, getProfile } from './profile.service';
import { requireAuth, type AuthenticatedRequest } from './auth/auth.middleware';

const router = Router();

/**
 * GET /api/v1/profile
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;

    if (typeof userId !== 'string') {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User authentication required',
        },
      });
    }

    const profile = await getProfile(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'User profile not found',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
      error: null,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to retrieve profile',
      },
    });
  }
});

/**
 * PUT /api/v1/profile
 */
router.put('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const parsed = userProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile data',
          fields: parsed.error.flatten().fieldErrors,
        },
      });
    }

    if (typeof userId !== 'string') {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User authentication required',
        },
      });
    }

    const profile = await createOrUpdateProfile(userId, parsed.data);

    return res.status(200).json({
      success: true,
      data: profile,
      error: null,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message:
          error instanceof Error ? error.message : 'Unable to update profile',
      },
    });
  }
});

export default router;

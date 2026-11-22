import { Router, type Response } from 'express';

import { registerSchema, loginSchema } from '@calorie-tracker/validation';

import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
} from './auth.service';

const router = Router();

const REFRESH_COOKIE_NAME = 'refreshToken';

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

function clearRefreshCookie(res: Response) {
  const { maxAge: _maxAge, ...options } = getRefreshCookieOptions();

  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

/**
 * POST /api/v1/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          fields: result.error.flatten().fieldErrors,
        },
      });
    }

    const resultData = await registerUser(result.data);

    setRefreshCookie(res, resultData.refreshToken);

    return res.status(201).json({
      success: true,
      data: {
        user: resultData.user,
        accessToken: resultData.accessToken,
      },
      error: null,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Unable to create account',
      },
    });
  }
});

/**
 * POST /api/v1/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
        },
      });
    }

    const resultData = await loginUser(result.data);

    setRefreshCookie(res, resultData.refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        user: resultData.user,
        accessToken: resultData.accessToken,
      },
      error: null,
    });
  } catch {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (typeof refreshToken !== 'string') {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is required',
        },
      });
    }

    const tokens = await refreshSession(refreshToken);

    setRefreshCookie(res, tokens.refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
      error: null,
    });
  } catch {
    clearRefreshCookie(res);

    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      },
    });
  }
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (typeof refreshToken === 'string') {
      await logoutUser(refreshToken);
    }

    clearRefreshCookie(res);

    return res.status(204).send();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Unable to logout',
      },
    });
  }
});

export default router;

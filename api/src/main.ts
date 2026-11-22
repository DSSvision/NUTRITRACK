import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './app/openapi';

import { checkDatabaseConnection } from './app/health';
import profileRoutes from './app/profile.routes.js';
import authRoutes from './app/auth/auth.routes';
import foodRoutes from './app/food/food.routes';
import mealRoutes from './app/meal/meal.routes';
import dashboardRoutes from './app/dashboard/dashboard.routes';
import exerciseRoutes from './app/exercise/exercise.routes';
import weightRoutes from './app/weight/weight.routes';
import nutritionRoutes from './app/nutrition/nutrition.routes';

const app = express();

app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', foodRoutes);
app.use('/api/v1', mealRoutes);
app.use('/api/v1', dashboardRoutes);
app.use('/api/v1', exerciseRoutes);
app.use('/api/v1', weightRoutes);
app.use('/api/v1', nutritionRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'AI Calorie Tracker API',
    status: 'ok',
    health: '/health',
  });
});

app.get('/health', async (_req, res) => {
  try {
    const database = await checkDatabaseConnection();

    res.json({
      status: 'ok',
      ...database,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: 'error',
      database: 'disconnected',
    });
  }
});

app.use('/api/v1', profileRoutes);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

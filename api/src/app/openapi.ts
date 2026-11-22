export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'NutriTrack API',
    version: '1.0.0',
    description:
      'API documentation for the NutriTrack nutrition tracking application.',
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/profile': {
      get: {
        summary: 'Get user profile',
        tags: ['Profile'],
        responses: {
          '200': { description: 'Profile retrieved successfully' },
          '401': { description: 'Unauthenticated' },
        },
      },
    },
    '/dashboard/daily': {
      get: {
        summary: 'Get daily dashboard',
        tags: ['Dashboard'],
        parameters: [
          {
            name: 'date',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date' },
          },
        ],
        responses: {
          '200': { description: 'Daily dashboard retrieved' },
          '401': { description: 'Unauthenticated' },
        },
      },
    },
  },
};

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StatusWatch API',
      version: '1.0.0',
      description: 'Real-time service monitoring platform API documentation',
      contact: {
        name: 'StatusWatch Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:5555',
        description: 'Development server',
      },
      {
        url: 'https://api.statuswatch.io',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            url: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            status: {
              type: 'string',
              enum: ['operational', 'degraded', 'partial_outage', 'major_outage', 'unknown'],
            },
            uptime: { type: 'number' },
            lastChecked: { type: 'string', format: 'date-time' },
            isCustom: { type: 'boolean' },
          },
        },
        Incident: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: {
              type: 'string',
              enum: ['investigating', 'identified', 'monitoring', 'resolved'],
            },
            impact: {
              type: 'string',
              enum: ['critical', 'major', 'minor', 'maintenance'],
            },
            startedAt: { type: 'string', format: 'date-time' },
            resolvedAt: { type: 'string', format: 'date-time', nullable: true },
            serviceId: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN', 'SUPERADMIN'],
            },
            tier: {
              type: 'string',
              enum: ['FREE', 'PRO', 'ENTERPRISE'],
            },
          },
        },
        CustomService: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            url: { type: 'string' },
            checkInterval: { type: 'number', description: 'Check interval in minutes' },
            expectedStatusCode: { type: 'number', default: 200 },
            responseTimeThreshold: { type: 'number', description: 'Threshold in milliseconds' },
            checkType: { type: 'string', enum: ['http', 'https'], default: 'http' },
            userId: { type: 'string' },
            isCustom: { type: 'boolean', default: true },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Services',
        description: 'Service status monitoring',
      },
      {
        name: 'Custom Services',
        description: 'User-defined custom service monitoring',
      },
      {
        name: 'Incidents',
        description: 'Service incidents and outages',
      },
      {
        name: 'Analytics',
        description: 'Service analytics and metrics',
      },
      {
        name: 'Uptime',
        description: 'Uptime statistics and tracking',
      },
      {
        name: 'Dashboard',
        description: 'Dashboard summary data',
      },
      {
        name: 'User',
        description: 'User profile and preferences',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);

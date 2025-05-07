export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Lottery API',
    version: '1.0.0',
  },
  paths: {
    '/api/list/{id}': {
      get: {
        summary: 'Get lotto by page',
        tags: ['lotto'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'Lottery Overview',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LottoOverview',
                },
              },
            },
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiError',
                },
              },
            },
          },
        },
      },
    },
    '/api/lotto/{id}': {
      get: {
        summary: 'Check lottery status by lottery number',
        tags: ['lotto'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Full Lottery Detail',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LottoDetail',
                },
              },
            },
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiError',
                },
              },
            },
          },
        },
      },
    },
    '/api/latest': {
      get: {
        summary: 'Latest price announcement',
        tags: ['lotto'],
        responses: {
          '200': {
            description: 'Full Lottery Detail',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LottoDetail',
                },
              },
            },
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiError',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      LottoOverview: {
        type: 'object',
        properties: {
          status: { type: 'string', default: 'success' },
          response: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                url: { type: 'string' },
                date: { type: 'string' },
              },
            },
          },
        },
      },
      LottoDetail: {
        type: 'object',
        properties: {
          status: { type: 'string', default: 'success' },
          response: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              endpoint: { type: 'string' },
              prizes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    reward: { type: 'string' },
                    amount: { type: 'number' },
                    number: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              runningNumbers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    reward: { type: 'string' },
                    amount: { type: 'number' },
                    number: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          status: { type: 'string', default: 'crash' },
          response: { type: 'string', default: 'api cannot fulfill your request at this time' },
        },
      },
    },
  },
};
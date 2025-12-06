import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Telecaller Backend API',
      version: '1.0.0',
      description: 'API documentation for Telecaller App',
    },
    servers: [
      { url: 'https://telecallerappbackend.onrender.com' },
      { url: 'http://localhost:8800' }
    ],
  },

  // IMPORTANT: Correct absolute path
  apis: [path.join(__dirname, '../routes/*.js')],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export { swaggerUi, swaggerSpec };

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Threshold API Documentation',
      version: '1.0.0',
      description: 'Documentación oficial de la API del backend de Threshold para gestionar usuarios, flashcards, materias y recordatorios.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local',
      },
      {
        url: 'https://tu-servidor-produccion.com', // Replace with production URL if any
        description: 'Servidor de Producción',
      }
    ],
  },
  // Documentamos todos los endpoints en la carpeta de rutas
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};

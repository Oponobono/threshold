require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, initializeDb } = require('./db');

// Importar rutas
const authRoutes = require('./routes/auth');
const subjectsRoutes = require('./routes/subjects');
const assessmentsRoutes = require('./routes/assessments');
const schedulesRoutes = require('./routes/schedules');
const galleryRoutes = require('./routes/gallery');
const flashcardsRoutes = require('./routes/flashcards');
const audioRoutes = require('./routes/audio');
const youtubeRoutes = require('./routes/youtube');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MAX_PORT_RETRIES = 10;

// Middlewares
app.use(cors());
app.use(express.json());

// Inicializar la base de datos y crear tablas
initializeDb();

// Ruta de estado
app.get('/api/status', (req, res) => {
  const dbType = process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite';
  res.json({ 
    status: 'API funcionando correctamente', 
    db: dbType,
    env: process.env.NODE_ENV || 'development'
  });
});

// Registrar rutas
app.use('/api', authRoutes);
app.use('/api', subjectsRoutes);
app.use('/api', assessmentsRoutes);
app.use('/api', schedulesRoutes);
app.use('/api', galleryRoutes);
app.use('/api', flashcardsRoutes);
app.use('/api', audioRoutes);
app.use('/api', youtubeRoutes);



function startServer(port, retriesLeft) {
  const server = app.listen(port, HOST, () => {
    console.log(`Servidor corriendo en http://${HOST}:${port}`);
    console.log('Para celular, usa la IP local de esta PC (ej: 192.168.x.x).');
  });

  // Mantiene una referencia activa del socket del servidor.
  server.ref();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`Puerto ${port} en uso. Reintentando en ${nextPort}...`);
      startServer(nextPort, retriesLeft - 1);
      return;
    }

    console.error('Error al iniciar el servidor:', err.message);
    process.exit(1);
  });
}

startServer(PORT, MAX_PORT_RETRIES);


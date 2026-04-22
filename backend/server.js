const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { db, initializeDb } = require('./db');

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
  res.json({ status: 'API funcionando correctamente', db: 'SQLite conectado' });
});

// Obtener perfil de usuario por id
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT id, email, name, lastname, username, grading_scale, approval_threshold, major, university, created_at, last_login
    FROM users
    WHERE id = ?
  `;

  db.get(query, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(user);
  });
});

// Ruta de Registro de Usuario
app.post('/api/register', async (req, res) => {
  const { 
    email, 
    password,
    name,
    lastname,
    username,
    grading_scale,
    approval_threshold,
    major,
    university 
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos (email, password)' });
  }

  try {
    // 1. Encriptar la contraseña (salt rounds = 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. Guardar en SQLite
    const query = `INSERT INTO users (email, password_hash, name, lastname, username, grading_scale, approval_threshold, major, university) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [email, passwordHash, name, lastname, username, grading_scale, approval_threshold, major, university], function (err) {
      if (err) {
        // Verificar si el error es porque el correo ya existe
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'El correo ya está registrado.' });
        }
        return res.status(500).json({ error: 'Error interno del servidor.' });
      }

      // 3. Responder con éxito
      res.status(201).json({ 
        message: 'Usuario registrado exitosamente', 
        userId: this.lastID 
      });
    });

  } catch (error) {
    console.error('Error en /api/register:', error);
    res.status(500).json({ error: 'Error al procesar el registro.' });
  }
});

// Ruta de Login de Usuario
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos (email, password)' });
  }

  try {
    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Error interno del servidor.' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      // Comparar contraseña
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      // Actualizar último login
      db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

      res.json({ 
        message: 'Login exitoso', 
        user: { id: user.id, email: user.email } 
      });
    });
  } catch (error) {
    console.error('Error en /api/login:', error);
    res.status(500).json({ error: 'Error al procesar el login.' });
  }
});

// Ruta de Analítica (Visitantes Invitados)
app.post('/api/track-guest', (req, res) => {
  const { device_id } = req.body;

  if (!device_id) {
    return res.status(400).json({ error: 'Se requiere el device_id' });
  }

  // Insertar un nuevo visitante o actualizar su contador de visitas si ya existe
  const query = `
    INSERT INTO app_visitors (device_id, first_seen_at, last_visit_at, visit_count)
    VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
    ON CONFLICT(device_id) DO UPDATE SET
      last_visit_at = CURRENT_TIMESTAMP,
      visit_count = visit_count + 1
  `;

  db.run(query, [device_id], function(err) {
    if (err) {
      console.error('Error rastreando invitado:', err);
      return res.status(500).json({ error: 'Error registrando la visita.' });
    }
    
    res.json({ message: 'Visita registrada correctamente.' });
  });
});

// --- SUBJECTS ENDPOINTS ---

// Obtener todas las materias de un usuario
app.get('/api/subjects/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT s.*,
    COALESCE((
      SELECT AVG(
        CASE
          WHEN a.grade_value IS NOT NULL THEN a.grade_value
          WHEN a.score IS NOT NULL AND a.out_of IS NOT NULL AND a.out_of > 0 THEN (a.score * 1.0 / a.out_of) * 100
          ELSE NULL
        END
      )
      FROM assessments a
      WHERE a.subject_id = s.id
    ), 0) AS avg_score,
    COALESCE((
      SELECT ROUND(
        (SUM(CASE WHEN a.is_completed = 1 OR a.grade_value IS NOT NULL OR a.score IS NOT NULL THEN 1 ELSE 0 END) * 100.0)
        / NULLIF(COUNT(*), 0),
        1
      )
      FROM assessments a
      WHERE a.subject_id = s.id
    ), 0) AS completion_percent
    FROM subjects s WHERE user_id = ?
  `;
  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Agregar una nueva materia
app.post('/api/subjects', (req, res) => {
  const { user_id, code, name, credits, professor, color, icon, target_grade } = req.body;
  if (!user_id || !name) {
    return res.status(400).json({ error: 'Faltan campos requeridos (user_id, name)' });
  }

  const normalizedCode =
    code ||
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') ||
    'SB';

  const query = `
    INSERT INTO subjects (user_id, code, name, credits, professor, color, icon, target_grade)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      user_id,
      normalizedCode,
      name,
      credits || null,
      professor || null,
      color || '#CCCCCC',
      icon || 'book-outline',
      target_grade || null,
    ],
    function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      id: this.lastID,
      user_id,
      code: normalizedCode,
      name,
      credits: credits || null,
      professor: professor || null,
      color: color || '#CCCCCC',
      icon: icon || 'book-outline',
      target_grade: target_grade || null,
      avg_score: 0,
      completion_percent: 0,
      message: 'Materia creada',
    });
  });
});

// --- ASSESSMENTS ENDPOINTS ---

// Obtener evaluaciones por materia
app.get('/api/assessments/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  db.all(`SELECT * FROM assessments WHERE subject_id = ?`, [subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Agregar evaluación
app.post('/api/assessments', (req, res) => {
  const {
    subject_id,
    name,
    type,
    date,
    weight,
    out_of,
    score,
    percentage,
    grade_value,
    is_completed,
  } = req.body;

  const query = `
    INSERT INTO assessments (subject_id, name, type, date, weight, out_of, score, percentage, grade_value, is_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(
    query,
    [
      subject_id,
      name,
      type,
      date,
      weight,
      out_of,
      score,
      percentage ?? null,
      grade_value ?? null,
      is_completed ? 1 : 0,
    ],
    function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Evaluación agregada' });
  });
});

// --- GALLERY ENDPOINTS ---

// Obtener ítems de galería por usuario
app.get('/api/gallery/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(`SELECT * FROM gallery_items WHERE user_id = ? ORDER BY date DESC, time DESC`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Agregar ítem a galería
app.post('/api/gallery', (req, res) => {
  const { user_id, uri, subject, date, time, ocr_text } = req.body;
  const query = `INSERT INTO gallery_items (user_id, uri, subject, date, time, ocr_text) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(query, [user_id, uri, subject, date, time, ocr_text], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Ítem agregado a galería' });
  });
});

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

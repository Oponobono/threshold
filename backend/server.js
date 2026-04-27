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
  const dbType = process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite';
  res.json({ 
    status: 'API funcionando correctamente', 
    db: dbType,
    env: process.env.NODE_ENV || 'development'
  });
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

// POST /api/auth/enroll-biometric
// Guarda el token biométrico para un usuario autenticado.
// Requiere: { userId, biometric_token }
app.post('/api/auth/enroll-biometric', (req, res) => {
  const { userId, biometric_token } = req.body;

  if (!userId || !biometric_token) {
    return res.status(400).json({ error: 'Se requiere userId y biometric_token.' });
  }

  // Validación de longitud mínima para el token (UUID = 36 chars)
  if (typeof biometric_token !== 'string' || biometric_token.length < 32) {
    return res.status(400).json({ error: 'Token biométrico inválido.' });
  }

  db.run(
    `UPDATE users SET biometric_token = ? WHERE id = ?`,
    [biometric_token, userId],
    function (err) {
      if (err) {
        console.error('Error guardando biometric_token:', err.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      res.json({ message: 'Token biométrico registrado correctamente.' });
    }
  );
});

// POST /api/biometric-login
// Autentica a un usuario usando su token biométrico (nunca envía la huella).
// Requiere: { biometric_token }
app.post('/api/biometric-login', (req, res) => {
  const { biometric_token } = req.body;

  if (!biometric_token || typeof biometric_token !== 'string' || biometric_token.length < 32) {
    return res.status(400).json({ error: 'Token biométrico inválido o ausente.' });
  }

  db.get(
    `SELECT id, email, name, lastname, username, grading_scale, approval_threshold FROM users WHERE biometric_token = ?`,
    [biometric_token],
    (err, user) => {
      if (err) {
        console.error('Error en biometric-login:', err.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
      }

      if (!user) {
        // Respuesta genérica para no revelar si el token existe
        return res.status(401).json({ error: 'Autenticación biométrica fallida.' });
      }

      // Actualizar último login
      db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

      res.json({
        message: 'Login biométrico exitoso',
        user: { id: user.id, email: user.email },
      });
    }
  );
});


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

// Obtener una materia específica por su ID
app.get('/api/subject/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  const query = `
    SELECT s.*,
    COALESCE((
      SELECT 
        CASE 
          WHEN SUM(
            CASE WHEN a.percentage IS NOT NULL THEN a.percentage
                 WHEN a.weight IS NOT NULL THEN CAST(REPLACE(a.weight, '%', '') AS REAL)
                 ELSE 0 END
          ) > 0 
          THEN 
            SUM(
              CASE
                WHEN a.grade_value IS NOT NULL THEN a.grade_value
                WHEN a.score IS NOT NULL AND a.out_of IS NOT NULL AND a.out_of > 0 THEN (a.score * 1.0 / a.out_of) * 5.0
                ELSE 0
              END
              * (
                CASE WHEN a.percentage IS NOT NULL THEN (a.percentage / 100.0)
                     WHEN a.weight IS NOT NULL THEN (CAST(REPLACE(a.weight, '%', '') AS REAL) / 100.0)
                     ELSE 0 END
              )
            ) / (
              SUM(
                CASE WHEN a.percentage IS NOT NULL THEN a.percentage
                     WHEN a.weight IS NOT NULL THEN CAST(REPLACE(a.weight, '%', '') AS REAL)
                     ELSE 0 END
              ) / 100.0
            )
          ELSE 0 
        END
      FROM assessments a
      WHERE a.subject_id = s.id AND (a.grade_value IS NOT NULL OR a.score IS NOT NULL)
    ), 0) AS avg_score,
    COALESCE((
      SELECT SUM(
        CASE WHEN a.percentage IS NOT NULL THEN a.percentage
             WHEN a.weight IS NOT NULL THEN CAST(REPLACE(a.weight, '%', '') AS REAL)
             ELSE 0 END
      )
      FROM assessments a
      WHERE a.subject_id = s.id AND (a.grade_value IS NOT NULL OR a.score IS NOT NULL)
    ), 0) AS completion_percent
    FROM subjects s WHERE id = ?
  `;
  db.get(query, [subjectId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Materia no encontrada' });
    res.json(row);
  });
});

// Obtener todas las materias de un usuario
app.get('/api/subjects/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT s.*,
    COALESCE((
      SELECT 
        CASE 
          WHEN SUM(
            CASE WHEN a.percentage IS NOT NULL THEN a.percentage
                 WHEN a.weight IS NOT NULL THEN CAST(REPLACE(a.weight, '%', '') AS REAL)
                 ELSE 0 END
          ) > 0 
          THEN 
            SUM(
              CASE
                WHEN a.grade_value IS NOT NULL THEN a.grade_value
                WHEN a.score IS NOT NULL AND a.out_of IS NOT NULL AND a.out_of > 0 THEN (a.score * 1.0 / a.out_of) * 5.0
                ELSE 0
              END
              * (
                CASE WHEN a.percentage IS NOT NULL THEN (a.percentage / 100.0)
                     WHEN a.weight IS NOT NULL THEN (CAST(REPLACE(a.weight, '%', '') AS REAL) / 100.0)
                     ELSE 0 END
              )
            ) / (
              SUM(
                CASE WHEN a.percentage IS NOT NULL THEN a.percentage
                     WHEN a.weight IS NOT NULL THEN CAST(REPLACE(a.weight, '%', '') AS REAL)
                     ELSE 0 END
              ) / 100.0
            )
          ELSE 0 
        END
      FROM assessments a
      WHERE a.subject_id = s.id AND (a.grade_value IS NOT NULL OR a.score IS NOT NULL)
    ), 0) AS avg_score,
    COALESCE((
      SELECT SUM(
        CASE WHEN a.percentage IS NOT NULL THEN a.percentage
             WHEN a.weight IS NOT NULL THEN CAST(REPLACE(a.weight, '%', '') AS REAL)
             ELSE 0 END
      )
      FROM assessments a
      WHERE a.subject_id = s.id AND (a.grade_value IS NOT NULL OR a.score IS NOT NULL)
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

// Obtener todas las evaluaciones de un usuario
app.get('/api/assessments/user/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT a.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon
    FROM assessments a
    JOIN subjects s ON a.subject_id = s.id
    WHERE s.user_id = ?
    ORDER BY a.date ASC
  `;
  db.all(query, [userId], (err, rows) => {
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

// --- SCHEDULES & PREDICTION ---

// Predecir materia actual por horario
app.get('/api/prediction/:userId', (req, res) => {
  const { userId } = req.params;
  const now = new Date();
  
  // En JS getDay() es 0=Dom, 1=Lun, ..., 6=Sáb. 
  // En nuestra DB usamos 1=Lun, ..., 7=Dom.
  let dayOfWeek = now.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7; // Ajustar Domingo a 7
  
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  const query = `
    SELECT s.subject_id as id, sub.name, sub.icon, sub.color
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    WHERE sub.user_id = ? 
      AND s.day_of_week = ? 
      AND ? BETWEEN s.start_time AND s.end_time
    LIMIT 1
  `;

  db.get(query, [userId, dayOfWeek, currentTime], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

// Obtener todos los horarios de hoy para un usuario
app.get('/api/schedules/today/:userId', (req, res) => {
  const { userId } = req.params;
  const now = new Date();
  let dayOfWeek = now.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7;

  const query = `
    SELECT s.id, s.subject_id, s.start_time, s.end_time, sub.name, sub.icon, sub.color
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    WHERE sub.user_id = ? AND s.day_of_week = ?
    ORDER BY s.start_time ASC
  `;

  db.all(query, [userId, dayOfWeek], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Agregar un horario a una materia
app.post('/api/schedules', (req, res) => {
  const { subject_id, day_of_week, start_time, end_time } = req.body;
  if (!subject_id || !day_of_week || !start_time || !end_time) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  const query = `INSERT INTO schedules (subject_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)`;
  db.run(query, [subject_id, day_of_week, start_time, end_time], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Horario agregado' });
  });
});

// Eliminar un horario
app.delete('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM schedules WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Horario eliminado' });
  });
});

// Obtener horarios por materia
app.get('/api/schedules/subject/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  db.all(`SELECT * FROM schedules WHERE subject_id = ? ORDER BY day_of_week, start_time`, [subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Obtener todos los horarios de un usuario (para la vista semanal)
app.get('/api/schedules/user/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT s.id, s.subject_id, s.day_of_week, s.start_time, s.end_time, sub.name, sub.icon, sub.color
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    WHERE sub.user_id = ?
    ORDER BY s.day_of_week, s.start_time ASC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
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

// --- PHOTOS ENDPOINTS ---

// Obtener todas las fotos de una materia
app.get('/api/photos/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  db.all(`SELECT * FROM photos WHERE subject_id = ? ORDER BY created_at DESC`, [subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Guardar una nueva foto
app.post('/api/photos', (req, res) => {
  const { subject_id, local_uri, es_favorita } = req.body;
  
  if (!subject_id || !local_uri) {
    return res.status(400).json({ error: 'Faltan campos requeridos (subject_id, local_uri)' });
  }

  const query = `
    INSERT INTO photos (subject_id, local_uri, es_favorita)
    VALUES (?, ?, ?)
  `;

  db.run(query, [subject_id, local_uri, es_favorita || 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      id: this.lastID,
      subject_id,
      local_uri,
      es_favorita: es_favorita || 0,
      message: 'Foto registrada en BD'
    });
  });
});


// Marcar/desmarcar foto como favorita
app.patch('/api/photos/:photoId/favorite', (req, res) => {
  const { photoId } = req.params;
  const { es_favorita } = req.body;

  db.run(
    `UPDATE photos SET es_favorita = ? WHERE id = ?`,
    [es_favorita ? 1 : 0, photoId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

// Eliminar una foto
app.delete('/api/photos/:photoId', (req, res) => {
  const { photoId } = req.params;

  db.get(`SELECT local_uri FROM photos WHERE id = ?`, [photoId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Foto no encontrada.' });

    db.run(`DELETE FROM photos WHERE id = ?`, [photoId], function (deleteErr) {
      if (deleteErr) return res.status(500).json({ error: deleteErr.message });
      // Devolvemos la URI para que el cliente pueda borrar el archivo local también
      res.json({ success: true, local_uri: row.local_uri });
    });
  });
});

// --- FLASHCARDS ENDPOINTS ---

// Obtener todos los mazos de un usuario
app.get('/api/flashcard-decks', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'Se requiere user_id' });
  const query = `
    SELECT fd.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon,
    CAST((SELECT COUNT(*) FROM flashcards fc WHERE fc.deck_id = fd.id) AS INTEGER) as card_count,
    CAST((SELECT COUNT(*) FROM flashcards fc WHERE fc.deck_id = fd.id AND fc.status = 'review') AS INTEGER) as review_count,
    CAST((SELECT COUNT(*) FROM flashcards fc WHERE fc.deck_id = fd.id AND fc.status = 'learning') AS INTEGER) as learning_count,
    CAST((SELECT COUNT(*) FROM flashcards fc WHERE fc.deck_id = fd.id AND fc.status = 'new') AS INTEGER) as new_count
    FROM flashcard_decks fd
    JOIN subjects s ON fd.subject_id = s.id
    WHERE s.user_id = ?
    ORDER BY fd.created_at DESC
  `;
  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Crear un mazo nuevo
app.post('/api/flashcard-decks', (req, res) => {
  const { subject_id, user_id, title, description } = req.body;
  if (!subject_id || !title || !user_id) return res.status(400).json({ error: 'Faltan campos requeridos (subject_id, user_id, title).' });
  db.run(
    `INSERT INTO flashcard_decks (subject_id, user_id, title, description) VALUES (?, ?, ?, ?)`,
    [subject_id, user_id, title, description || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, subject_id, user_id, title, description: description || '', card_count: 0 });
    }
  );
});

// Obtener las tarjetas de un mazo
app.get('/api/flashcard-decks/:deckId/cards', (req, res) => {
  const { deckId } = req.params;
  db.all(`SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at ASC`, [deckId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Crear una tarjeta en un mazo
app.post('/api/flashcard-decks/:deckId/cards', (req, res) => {
  const { deckId } = req.params;
  const { front, back } = req.body;
  if (!front || !back) return res.status(400).json({ error: 'Faltan campos requeridos (front, back).' });
  db.run(
    `INSERT INTO flashcards (deck_id, front, back, status) VALUES (?, ?, ?, 'new')`,
    [deckId, front, back],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, deck_id: Number(deckId), front, back, status: 'new' });
    }
  );
});

// Actualizar estado de una tarjeta
app.put('/api/flashcards/:cardId', (req, res) => {
  const { cardId } = req.params;
  const { status } = req.body;
  db.run(`UPDATE flashcards SET status = ? WHERE id = ?`, [status, cardId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Eliminar una tarjeta
app.delete('/api/flashcards/:cardId', (req, res) => {
  const { cardId } = req.params;
  db.run(`DELETE FROM flashcards WHERE id = ?`, [cardId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Eliminar un mazo (y sus tarjetas)
app.delete('/api/flashcard-decks/:deckId', (req, res) => {
  const { deckId } = req.params;
  db.run(`DELETE FROM flashcards WHERE deck_id = ?`, [deckId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run(`DELETE FROM flashcard_decks WHERE id = ?`, [deckId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

// --- AUDIO RECORDINGS ENDPOINTS ---

// Obtener todas las grabaciones de un usuario
app.get('/api/audio-recordings/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT ar.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon,
           at.transcript_uri, at.summary_uri
    FROM audio_recordings ar
    LEFT JOIN subjects s ON ar.subject_id = s.id
    LEFT JOIN audio_transcripts at ON ar.id = at.recording_id
    WHERE ar.user_id = ?
    ORDER BY ar.created_at DESC
  `;
  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Crear una grabación
app.post('/api/audio-recordings', (req, res) => {
  const { user_id, subject_id, name, local_uri, duration } = req.body;
  if (!user_id || !local_uri) {
    return res.status(400).json({ error: 'Faltan campos requeridos (user_id, local_uri)' });
  }

  const query = `
    INSERT INTO audio_recordings (user_id, subject_id, name, local_uri, duration)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.run(query, [user_id, subject_id || null, name || null, local_uri, duration || 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ 
      id: this.lastID, 
      user_id, 
      subject_id: subject_id || null, 
      name: name || null,
      local_uri, 
      duration: duration || 0 
    });
  });
});

// Actualizar una grabación (ej: asociar materia)
app.put('/api/audio-recordings/:id', (req, res) => {
  const { id } = req.params;
  const { subject_id, name } = req.body;
  
  // Actualizamos solo los campos provistos
  const query = `
    UPDATE audio_recordings 
    SET subject_id = COALESCE(?, subject_id),
        name = COALESCE(?, name)
    WHERE id = ?
  `;
  
  db.run(query, [subject_id !== undefined ? subject_id : null, name !== undefined ? name : null, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

// Eliminar una grabación
app.delete('/api/audio-recordings/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM audio_recordings WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

// --- AUDIO TRANSCRIPTS ENDPOINTS ---

// Upsert (Crear o actualizar) transcripción/resumen
app.post('/api/audio-transcripts', (req, res) => {
  const { recording_id, transcript_uri, summary_uri } = req.body;
  
  if (!recording_id) {
    return res.status(400).json({ error: 'Falta recording_id' });
  }

  db.get(`SELECT id FROM audio_transcripts WHERE recording_id = ?`, [recording_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      // Actualizar
      const updateQuery = `
        UPDATE audio_transcripts 
        SET transcript_uri = COALESCE(?, transcript_uri),
            summary_uri = COALESCE(?, summary_uri)
        WHERE recording_id = ?
      `;
      db.run(updateQuery, [transcript_uri, summary_uri, recording_id], function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ success: true, id: row.id, action: 'updated' });
      });
    } else {
      // Crear
      const insertQuery = `
        INSERT INTO audio_transcripts (recording_id, transcript_uri, summary_uri)
        VALUES (?, ?, ?)
      `;
      db.run(insertQuery, [recording_id, transcript_uri, summary_uri], function(insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        res.status(201).json({ success: true, id: this.lastID, action: 'created' });
      });
    }
  });
});

// --- YOUTUBE VIDEOS ENDPOINTS ---

// Obtener todos los videos de YouTube de un usuario
app.get('/api/youtube-videos/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT 
      yv.id,
      yv.user_id,
      yv.subject_id,
      yv.youtube_url,
      yv.video_id,
      yv.title,
      yv.thumbnail_url,
      yv.duration,
      yv.created_at,
      s.name as subject_name,
      s.color as subject_color,
      s.icon as subject_icon,
      yt.transcript_uri,
      yt.summary_uri
    FROM youtube_videos yv
    LEFT JOIN subjects s ON yv.subject_id = s.id
    LEFT JOIN youtube_transcripts yt ON yv.id = yt.video_id
    WHERE yv.user_id = ?
    ORDER BY yv.created_at DESC
  `;
  
  db.all(query, [userId], (err, videos) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(videos || []);
  });
});

// Crear un nuevo video de YouTube
app.post('/api/youtube-videos', (req, res) => {
  const { user_id, subject_id, youtube_url, video_id, title, thumbnail_url, duration } = req.body;
  
  if (!user_id || !youtube_url || !video_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos: user_id, youtube_url, video_id' });
  }

  const query = `
    INSERT INTO youtube_videos (user_id, subject_id, youtube_url, video_id, title, thumbnail_url, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [user_id, subject_id || null, youtube_url, video_id, title || null, thumbnail_url || null, duration || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ success: true, id: this.lastID });
  });
});

// Actualizar un video de YouTube (ej: cambiar materia, título)
app.put('/api/youtube-videos/:id', (req, res) => {
  const { id } = req.params;
  const { subject_id, title } = req.body;
  
  const updateFields = [];
  const updateValues = [];
  
  if (subject_id !== undefined) {
    updateFields.push('subject_id = ?');
    updateValues.push(subject_id);
  }
  
  if (title !== undefined) {
    updateFields.push('title = ?');
    updateValues.push(title);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }
  
  updateValues.push(id);
  const query = `UPDATE youtube_videos SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(query, updateValues, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

// Eliminar un video de YouTube
app.delete('/api/youtube-videos/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM youtube_videos WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

// Upsert transcripción/resumen de YouTube
app.post('/api/youtube-transcripts', (req, res) => {
  const { video_id, transcript_uri, summary_uri } = req.body;
  
  if (!video_id) {
    return res.status(400).json({ error: 'Falta video_id' });
  }

  db.get(`SELECT id FROM youtube_transcripts WHERE video_id = ?`, [video_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      // Actualizar
      const updateQuery = `
        UPDATE youtube_transcripts 
        SET transcript_uri = COALESCE(?, transcript_uri),
            summary_uri = COALESCE(?, summary_uri)
        WHERE video_id = ?
      `;
      db.run(updateQuery, [transcript_uri, summary_uri, video_id], function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        res.json({ success: true, id: row.id, action: 'updated' });
      });
    } else {
      // Crear
      const insertQuery = `
        INSERT INTO youtube_transcripts (video_id, transcript_uri, summary_uri)
        VALUES (?, ?, ?)
      `;
      db.run(insertQuery, [video_id, transcript_uri, summary_uri], function(insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        res.status(201).json({ success: true, id: this.lastID, action: 'created' });
      });
    }
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

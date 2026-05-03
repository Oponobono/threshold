const express = require('express');
const bcrypt = require('bcrypt');
const { db } = require('../db');

const router = express.Router();

// Helper para generar PIN alfanumérico seguro (sin O/0, I/1)
const generateSharePin = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

// Helper para obtener un PIN único
const getUniqueSharePin = () => {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const pin = generateSharePin();
      db.get('SELECT id FROM users WHERE share_pin = ?', [pin], (err, user) => {
        if (err) return reject(err);
        if (user) return attempt(); // Colisión, intentar de nuevo
        resolve(pin);
      });
    };
    attempt();
  });
};

// Obtener perfil de usuario por id
router.get('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT id, email, name, lastname, username, grading_scale, approval_threshold, major, university, created_at, last_login, share_pin, display_name
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

    // Auto-generar share_pin para usuarios antiguos que no lo tienen
    if (!user.share_pin) {
      getUniqueSharePin().then(pin => {
        db.run('UPDATE users SET share_pin = ? WHERE id = ?', [pin, userId], (updateErr) => {
          if (!updateErr) {
            user.share_pin = pin;
          }
          res.json(user);
        });
      }).catch(err => {
        // En caso de error, simplemente devolver el usuario sin PIN
        res.json(user);
      });
    } else {
      res.json(user);
    }
  });
});

// Actualizar perfil de usuario
router.put('/users/:userId', (req, res) => {
  const { userId } = req.params;
  const updates = [];
  const values = [];

  const fields = ['name', 'lastname', 'username', 'university', 'share_pin', 'display_name'];
  
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos para actualizar.' });
  }

  values.push(userId);
  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

  db.run(query, values, function(err) {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ message: 'Perfil actualizado exitosamente' });
  });
});

// Actualizar contraseña
router.put('/users/:userId/password', async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;
  
  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Contraseña actual incorrecta.' });
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId], function(err) {
      if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
      res.json({ message: 'Contraseña actualizada exitosamente' });
    });
  });
});

// Verificar contraseña (para confirmar eliminación de cuenta)
router.post('/users/:userId/password-verify', async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Se requiere contraseña' });
  }
  
  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta.' });
    
    res.json({ message: 'Contraseña verificada correctamente.' });
  });
});

// Obtener información de datos que se perderán (para modal de eliminación)
router.get('/users/:userId/deletion-data-count', (req, res) => {
  const { userId } = req.params;
  
  const counts = {
    subjects: 0,
    recordings: 0,
    videos: 0,
    decks: 0,
    photos: 0,
  };

  db.get('SELECT COUNT(*) as count FROM subjects WHERE user_id = ?', [userId], (err, result) => {
    if (!err && result) counts.subjects = result.count;
    
    db.get('SELECT COUNT(*) as count FROM audio_recordings WHERE user_id = ?', [userId], (err, result) => {
      if (!err && result) counts.recordings = result.count;
      
      db.get('SELECT COUNT(*) as count FROM youtube_videos WHERE user_id = ?', [userId], (err, result) => {
        if (!err && result) counts.videos = result.count;
        
        db.get('SELECT COUNT(*) as count FROM flashcard_decks WHERE user_id = ?', [userId], (err, result) => {
          if (!err && result) counts.decks = result.count;
          
          db.get('SELECT COUNT(*) as count FROM gallery_items WHERE user_id = ?', [userId], (err, result) => {
            if (!err && result) counts.photos = result.count;
            
            res.json(counts);
          });
        });
      });
    });
  });
});

// Eliminar token biométrico
router.delete('/users/:userId/biometric', (req, res) => {
  const { userId } = req.params;
  db.run('UPDATE users SET biometric_token = NULL WHERE id = ?', [userId], function(err) {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
    res.json({ message: 'Token biométrico revocado exitosamente' });
  });
});

// Solicitar eliminación (Soft Delete) - 14 días de gracia
router.delete('/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  // Verificar que el usuario exista y esté activo
  db.get('SELECT id, status FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.status !== 'active') {
      return res.status(400).json({ error: 'La cuenta ya está marcada para eliminación o fue eliminada.' });
    }
    
    // Marcar como pending_deletion y guardar la fecha actual
    const deletionDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // +14 días
    db.run(
      'UPDATE users SET status = ?, deletion_date = ? WHERE id = ?',
      ['pending_deletion', deletionDate.toISOString(), userId],
      function(err) {
        if (err) return res.status(500).json({ error: 'Error al procesar la solicitud de eliminación.' });
        
        res.json({ 
          message: 'Solicitud de eliminación registrada. Tu cuenta será eliminada en 14 días.',
          deletion_date: deletionDate.toISOString()
        });
      }
    );
  });
});

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               lastname:
 *                 type: string
 *               username:
 *                 type: string
 *               grading_scale:
 *                 type: string
 *               approval_threshold:
 *                 type: number
 *               major:
 *                 type: string
 *               university:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Faltan campos requeridos
 *       409:
 *         description: El correo ya está registrado
 *       500:
 *         description: Error interno del servidor
 */
// Ruta de Registro de Usuario
router.post('/register', async (req, res) => {
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

    // 2. Generar PIN de colaboración único
    const sharePin = await getUniqueSharePin();

    // 3. Guardar en SQLite
    const query = `INSERT INTO users (email, password_hash, name, lastname, username, grading_scale, approval_threshold, major, university, share_pin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [email, passwordHash, name, lastname, username, grading_scale, approval_threshold, major, university, sharePin], function (err) {
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

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Inicia sesión con email y contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       400:
 *         description: Faltan campos requeridos
 *       401:
 *         description: Credenciales inválidas o cuenta eliminada
 *       500:
 *         description: Error interno del servidor
 */
// Ruta de Login de Usuario
router.post('/login', async (req, res) => {
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

      // Verificar si la cuenta está pendiente de eliminación
      if (user.status === 'pending_deletion') {
        const deletionDate = new Date(user.deletion_date);
        const now = new Date();
        const daysRemaining = Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24));
        
        return res.status(200).json({
          status: 'pending_deletion',
          message: 'Tu cuenta está programada para eliminarse',
          deletion_date: user.deletion_date,
          days_remaining: Math.max(0, daysRemaining),
          user: { id: user.id, email: user.email, name: user.name }
        });
      }

      // Verificar si la cuenta está completamente eliminada
      if (user.status === 'deleted') {
        return res.status(401).json({ error: 'Esta cuenta ha sido eliminada permanentemente.' });
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

// Reactivar cuenta (cancelar eliminación)
router.post('/users/:userId/reactivate', (req, res) => {
  const { userId } = req.params;
  
  db.get('SELECT id, status, deletion_date FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    
    if (user.status !== 'pending_deletion') {
      return res.status(400).json({ error: 'La cuenta no está pendiente de eliminación.' });
    }
    
    // Verificar que todavía esté dentro del período de 14 días
    const deletionDate = new Date(user.deletion_date);
    const now = new Date();
    if (now > deletionDate) {
      return res.status(400).json({ error: 'El período de 14 días ya ha expirado.' });
    }
    
    // Reactivar la cuenta
    db.run(
      'UPDATE users SET status = ?, deletion_date = NULL WHERE id = ?',
      ['active', userId],
      function(err) {
        if (err) return res.status(500).json({ error: 'Error al reactivar la cuenta.' });
        
        res.json({ message: 'Cuenta reactivada exitosamente.' });
      }
    );
  });
});

// Enroll biométrico
router.post('/auth/enroll-biometric', (req, res) => {
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

// Biometric login
router.post('/biometric-login', (req, res) => {
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

// Track guest visitor
router.post('/track-guest', (req, res) => {
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

module.exports = router;

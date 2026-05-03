const express = require('express');
const { db } = require('../db');

const router = express.Router();

// ================= STUDY SESSIONS =================

/**
 * @swagger
 * /api/learning/sessions/{userId}:
 *   get:
 *     summary: Obtiene todas las sesiones de estudio de un usuario
 *     tags: [Learning]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de sesiones de estudio
 */
// Obtener sesiones de estudio de un usuario
router.get('/learning/sessions/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(
    `SELECT * FROM study_sessions WHERE user_id = ? ORDER BY start_timestamp DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/**
 * @swagger
 * /api/learning/sessions:
 *   post:
 *     summary: Guarda una nueva sesión de estudio terminada
 *     tags: [Learning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - session_type
 *               - duration_seconds
 *             properties:
 *               user_id:
 *                 type: integer
 *               subject_id:
 *                 type: integer
 *               session_type:
 *                 type: string
 *               config_value:
 *                 type: string
 *               duration_seconds:
 *                 type: integer
 *               performance_rating:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Sesión de estudio guardada
 */
// Guardar una nueva sesión de estudio
router.post('/learning/sessions', (req, res) => {
  const { user_id, subject_id, session_type, config_value, duration_seconds, performance_rating } = req.body;
  
  if (!user_id || !session_type || duration_seconds === undefined) {
    return res.status(400).json({ error: 'Faltan campos requeridos para la sesión de estudio.' });
  }

  const query = `
    INSERT INTO study_sessions (user_id, subject_id, session_type, config_value, duration_seconds, performance_rating)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [user_id, subject_id || null, session_type, config_value || null, duration_seconds, performance_rating || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Sesión de estudio guardada.' });
  });
});


// ================= CARD LOGS =================

/**
 * @swagger
 * /api/learning/card_logs/{userId}:
 *   get:
 *     summary: Obtiene el registro de aprendizaje (logs) de las flashcards
 *     tags: [Learning]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de interacciones con tarjetas
 */
// Obtener logs de tarjetas (analytics)
router.get('/learning/card_logs/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(
    `SELECT * FROM card_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 500`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/**
 * @swagger
 * /api/learning/card_logs:
 *   post:
 *     summary: Registra la interacción de un usuario con una flashcard (acierto/error)
 *     tags: [Learning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - card_id
 *               - user_id
 *             properties:
 *               card_id:
 *                 type: integer
 *               user_id:
 *                 type: integer
 *               result:
 *                 type: string
 *               response_time_ms:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Log registrado
 */
// Registrar un log de tarjeta (interacción de estudio)
router.post('/learning/card_logs', (req, res) => {
  const { card_id, user_id, result, response_time_ms } = req.body;
  
  if (!card_id || !user_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos (card_id, user_id).' });
  }

  const query = `
    INSERT INTO card_logs (card_id, user_id, result, response_time_ms)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [card_id, user_id, result || null, response_time_ms || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Log de tarjeta guardado.' });
  });
});


// ================= GROUP MEMBERSHIPS =================

/**
 * @swagger
 * /api/learning/groups/{userId}:
 *   get:
 *     summary: Obtiene los grupos a los que pertenece el usuario
 *     tags: [Learning]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de grupos
 */
// Obtener los grupos de un usuario
router.get('/learning/groups/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(
    `SELECT * FROM group_memberships WHERE user_id = ? ORDER BY joined_at DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/**
 * @swagger
 * /api/learning/groups/join:
 *   post:
 *     summary: Se une a un grupo de estudio mediante un PIN
 *     tags: [Learning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - group_pin_id
 *             properties:
 *               user_id:
 *                 type: integer
 *               group_pin_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Unido exitosamente
 *       400:
 *         description: Error de validación o ya es miembro
 *       404:
 *         description: PIN no encontrado
 */
// Unirse a un grupo mediante PIN
router.post('/learning/groups/join', (req, res) => {
  const { user_id, group_pin_id } = req.body;
  
  if (!user_id || !group_pin_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  // Validar si el PIN existe y pertenece a otro usuario
  db.get(`SELECT id, username, name FROM users WHERE share_pin = ?`, [group_pin_id], (err, targetUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!targetUser) return res.status(404).json({ error: 'PIN de grupo no encontrado. Verifica e inténtalo de nuevo.' });
    if (targetUser.id === user_id) return res.status(400).json({ error: 'No puedes unirte a tu propia cuenta.' });

    // Comprobar si ya es miembro
    db.get(`SELECT id FROM group_memberships WHERE user_id = ? AND group_pin_id = ?`, [user_id, group_pin_id], (err2, row) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (row) return res.status(400).json({ error: 'Ya eres miembro de este grupo.' });

      const query = `
        INSERT INTO group_memberships (user_id, group_pin_id, role)
        VALUES (?, ?, 'member')
      `;

      db.run(query, [user_id, group_pin_id], function(insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        res.status(201).json({ id: this.lastID, message: `Te has unido exitosamente al grupo de ${targetUser.name || targetUser.username}.` });
      });
    });
  });
});

/**
 * @swagger
 * /api/learning/groups/leave:
 *   delete:
 *     summary: Sale de un grupo de estudio
 *     tags: [Learning]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - group_pin_id
 *             properties:
 *               user_id:
 *                 type: integer
 *               group_pin_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ha salido del grupo
 */
// Salir de un grupo
router.delete('/learning/groups/leave', (req, res) => {
  const { user_id, group_pin_id } = req.body;
  
  if (!user_id || !group_pin_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos (user_id, group_pin_id).' });
  }

  const query = `DELETE FROM group_memberships WHERE user_id = ? AND group_pin_id = ?`;

  db.run(query, [user_id, group_pin_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'No se encontró la membresía del grupo.' });
    res.json({ message: 'Has salido del grupo exitosamente.' });
  });
});

module.exports = router;

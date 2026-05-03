const express = require('express');
const { db } = require('../db');

const router = express.Router();

/**
 * @swagger
 * /api/prediction/{userId}:
 *   get:
 *     summary: Predice la materia actual de un usuario basándose en su horario y la hora actual
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Materia actual o nulo si no hay clases en este momento
 */
// Predecir materia actual por horario
router.get('/prediction/:userId', (req, res) => {
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

/**
 * @swagger
 * /api/schedules/today/{userId}:
 *   get:
 *     summary: Obtiene todos los horarios programados para el día actual
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de clases para hoy
 */
// Obtener todos los horarios de hoy para un usuario
router.get('/schedules/today/:userId', (req, res) => {
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

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: Agrega un horario a una materia
 *     tags: [Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject_id
 *               - day_of_week
 *               - start_time
 *               - end_time
 *             properties:
 *               subject_id:
 *                 type: integer
 *               day_of_week:
 *                 type: integer
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *     responses:
 *       201:
 *         description: Horario agregado
 */
// Agregar un horario a una materia
router.post('/schedules', (req, res) => {
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

/**
 * @swagger
 * /api/schedules/{id}:
 *   delete:
 *     summary: Elimina un bloque de horario
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Horario eliminado
 */
// Eliminar un horario
router.delete('/schedules/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM schedules WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Horario eliminado' });
  });
});

/**
 * @swagger
 * /api/schedules/subject/{subjectId}:
 *   get:
 *     summary: Obtiene todos los horarios de una materia específica
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de horarios para la materia
 */
// Obtener horarios por materia
router.get('/schedules/subject/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  db.all(`SELECT * FROM schedules WHERE subject_id = ? ORDER BY day_of_week, start_time`, [subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/schedules/user/{userId}:
 *   get:
 *     summary: Obtiene todos los horarios de todas las materias de un usuario (Vista Semanal)
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista completa de horarios semanales
 */
// Obtener todos los horarios de un usuario (para la vista semanal)
router.get('/schedules/user/:userId', (req, res) => {
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

module.exports = router;

const express = require('express');
const { db } = require('../db');

const router = express.Router();

/**
 * @swagger
 * /api/assessments/{subjectId}:
 *   get:
 *     summary: Obtiene todas las evaluaciones de una materia
 *     tags: [Assessments]
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de evaluaciones
 */
// Obtener evaluaciones por materia
router.get('/assessments/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  db.all(`SELECT * FROM assessments WHERE subject_id = ?`, [subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/assessments/user/{userId}:
 *   get:
 *     summary: Obtiene todas las evaluaciones de todas las materias de un usuario
 *     tags: [Assessments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de evaluaciones consolidadas
 */
// Obtener todas las evaluaciones de un usuario
router.get('/assessments/user/:userId', (req, res) => {
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

/**
 * @swagger
 * /api/assessments:
 *   post:
 *     summary: Agrega una nueva evaluación a una materia
 *     tags: [Assessments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject_id
 *               - name
 *             properties:
 *               subject_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               date:
 *                 type: string
 *               weight:
 *                 type: string
 *               out_of:
 *                 type: number
 *               score:
 *                 type: number
 *               percentage:
 *                 type: number
 *               grade_value:
 *                 type: number
 *               is_completed:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Evaluación agregada
 */
// Agregar evaluación
router.post('/assessments', (req, res) => {
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

/**
 * @swagger
 * /api/assessments/{id}:
 *   delete:
 *     summary: Elimina una evaluación
 *     tags: [Assessments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Evaluación eliminada exitosamente
 */
router.delete('/assessments/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM assessments WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Evaluación no encontrada.' });
    res.json({ message: 'Evaluación eliminada exitosamente' });
  });
});

module.exports = router;

const express = require('express');
const { db } = require('../db');

const router = express.Router();

// --- GALLERY ENDPOINTS ---

/**
 * @swagger
 * /api/gallery/{userId}:
 *   get:
 *     summary: Obtiene todos los ítems de la galería de un usuario
 *     tags: [Gallery]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de ítems de la galería
 */
// Obtener ítems de galería por usuario
router.get('/gallery/:userId', (req, res) => {
  const { userId } = req.params;
  db.all(`SELECT * FROM gallery_items WHERE user_id = ? ORDER BY date DESC, time DESC`, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/gallery:
 *   post:
 *     summary: Agrega un nuevo ítem a la galería
 *     tags: [Gallery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - uri
 *             properties:
 *               user_id:
 *                 type: integer
 *               uri:
 *                 type: string
 *               subject:
 *                 type: string
 *               date:
 *                 type: string
 *               time:
 *                 type: string
 *               ocr_text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ítem agregado
 */
// Agregar ítem a galería
router.post('/gallery', (req, res) => {
  const { user_id, uri, subject, date, time, ocr_text } = req.body;
  const query = `INSERT INTO gallery_items (user_id, uri, subject, date, time, ocr_text) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(query, [user_id, uri, subject, date, time, ocr_text], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, message: 'Ítem agregado a galería' });
  });
});

// --- PHOTOS ENDPOINTS ---

/**
 * @swagger
 * /api/photos/{subjectId}:
 *   get:
 *     summary: Obtiene todas las fotos de una materia
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de fotos
 */
// Obtener todas las fotos de una materia
router.get('/photos/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  db.all(`SELECT * FROM photos WHERE subject_id = ? ORDER BY created_at DESC`, [subjectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/photos:
 *   post:
 *     summary: Guarda una nueva foto de una materia
 *     tags: [Photos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject_id
 *               - local_uri
 *             properties:
 *               subject_id:
 *                 type: integer
 *               local_uri:
 *                 type: string
 *               es_favorita:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Foto guardada
 */
// Guardar una nueva foto
router.post('/photos', (req, res) => {
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

/**
 * @swagger
 * /api/photos/{photoId}/favorite:
 *   patch:
 *     summary: Marca o desmarca una foto como favorita
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               es_favorita:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado de favorita actualizado
 */
// Marcar/desmarcar foto como favorita
router.patch('/photos/:photoId/favorite', (req, res) => {
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

/**
 * @swagger
 * /api/photos/{photoId}:
 *   delete:
 *     summary: Elimina una foto
 *     tags: [Photos]
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Foto eliminada
 */
// Eliminar una foto
router.delete('/photos/:photoId', (req, res) => {
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

module.exports = router;

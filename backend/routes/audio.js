const express = require('express');
const { db } = require('../db');

const router = express.Router();

// --- AUDIO RECORDINGS ENDPOINTS ---

/**
 * @swagger
 * /api/audio-recordings/{userId}:
 *   get:
 *     summary: Obtiene todas las grabaciones de audio de un usuario
 *     tags: [Audio]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de grabaciones
 */
// Obtener todas las grabaciones de un usuario
router.get('/audio-recordings/:userId', (req, res) => {
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

/**
 * @swagger
 * /api/audio-recordings:
 *   post:
 *     summary: Guarda una nueva grabación de audio
 *     tags: [Audio]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - local_uri
 *             properties:
 *               user_id:
 *                 type: integer
 *               subject_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               local_uri:
 *                 type: string
 *               duration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Grabación guardada exitosamente
 */
// Crear una grabación
router.post('/audio-recordings', (req, res) => {
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
router.put('/audio-recordings/:id', (req, res) => {
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
router.delete('/audio-recordings/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM audio_recordings WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

// --- AUDIO TRANSCRIPTS ENDPOINTS ---

/**
 * @swagger
 * /api/audio-transcripts:
 *   post:
 *     summary: Guarda o actualiza la transcripción y el resumen de IA de una grabación
 *     tags: [Audio]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recording_id
 *             properties:
 *               recording_id:
 *                 type: integer
 *               transcript_uri:
 *                 type: string
 *               summary_uri:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transcripción/resumen actualizado
 *       201:
 *         description: Transcripción/resumen creado
 */
// Upsert (Crear o actualizar) transcripción/resumen
router.post('/audio-transcripts', (req, res) => {
  const { recording_id, transcript_uri, summary_uri } = req.body;
  
  if (!recording_id) {
    return res.status(400).json({ error: 'Falta recording_id' });
  }

  db.get(`SELECT id FROM audio_transcripts WHERE recording_id = ?`, [recording_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      // Actualizar - actualizar solo los campos proporcionados
      let updateFields = [];
      let updateValues = [];
      
      if (transcript_uri !== undefined) {
        updateFields.push('transcript_uri = ?');
        updateValues.push(transcript_uri);
      }
      if (summary_uri !== undefined) {
        updateFields.push('summary_uri = ?');
        updateValues.push(summary_uri);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
      }
      
      updateValues.push(recording_id);
      const updateQuery = `UPDATE audio_transcripts SET ${updateFields.join(', ')} WHERE recording_id = ?`;
      
      db.run(updateQuery, updateValues, function(updateErr) {
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

module.exports = router;

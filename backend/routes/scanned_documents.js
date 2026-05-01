const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Obtener documentos escaneados por materia
router.get('/scanned_documents/subject/:subjectId', (req, res) => {
  const { subjectId } = req.params;
  db.all(
    `SELECT * FROM scanned_documents WHERE subject_id = ? ORDER BY created_at DESC`,
    [subjectId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Guardar un nuevo documento escaneado
router.post('/scanned_documents', (req, res) => {
  const { user_id, subject_id, name, local_uri } = req.body;
  
  if (!user_id || !local_uri) {
    return res.status(400).json({ error: 'Faltan campos requeridos (user_id, local_uri)' });
  }

  const query = `
    INSERT INTO scanned_documents (user_id, subject_id, name, local_uri)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [user_id, subject_id || null, name || null, local_uri], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      id: this.lastID,
      user_id,
      subject_id,
      name,
      local_uri,
      message: 'Documento escaneado registrado en BD'
    });
  });
});

// Eliminar un documento escaneado
router.delete('/scanned_documents/:documentId', (req, res) => {
  const { documentId } = req.params;

  db.get(`SELECT local_uri FROM scanned_documents WHERE id = ?`, [documentId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Documento no encontrado.' });

    db.run(`DELETE FROM scanned_documents WHERE id = ?`, [documentId], function (deleteErr) {
      if (deleteErr) return res.status(500).json({ error: deleteErr.message });
      res.json({ success: true, local_uri: row.local_uri });
    });
  });
});

module.exports = router;

const express = require('express');
const { db } = require('../db');

const router = express.Router();

// --- YOUTUBE VIDEOS ENDPOINTS ---

// Obtener todos los videos de YouTube de un usuario
router.get('/youtube-videos/:userId', (req, res) => {
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
router.post('/youtube-videos', (req, res) => {
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
router.put('/youtube-videos/:id', (req, res) => {
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
router.delete('/youtube-videos/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM youtube_videos WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

// Obtener subtítulos de un video de YouTube usando Supadata.ai
router.post('/youtube-captions', async (req, res) => {
  const { video_id, language = 'es' } = req.body;

  if (!video_id) {
    return res.status(400).json({ error: 'Falta video_id' });
  }

  const SUPADATA_KEY = process.env.SUPADATA_API_KEY;
  console.log(`\n====== [YouTube Captions] INICIO ======`);
  console.log(`video_id: ${video_id}, language: ${language}`);
  console.log(`SUPADATA_KEY presente: ${!!SUPADATA_KEY} (${SUPADATA_KEY ? SUPADATA_KEY.substring(0, 8) + '...' : 'VACÍA'})`);

  if (!SUPADATA_KEY) {
    return res.status(500).json({ error: 'SUPADATA_API_KEY no configurada en el servidor.' });
  }

  try {
    // ─── ESTRATEGIA 1: Español ───
    console.log(`[Paso 1] Probando con lang=${language}...`);
    let supadataRes = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${video_id}&text=true&lang=${language}`,
      { headers: { 'x-api-key': SUPADATA_KEY, 'Content-Type': 'application/json' } }
    );
    console.log(`[Paso 1] Status: ${supadataRes.status}`);

    // ─── ESTRATEGIA 2: Inglés como fallback ───
    if (!supadataRes.ok && language !== 'en') {
      console.log(`[Paso 2] Fallback a inglés...`);
      supadataRes = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?videoId=${video_id}&text=true&lang=en`,
        { headers: { 'x-api-key': SUPADATA_KEY, 'Content-Type': 'application/json' } }
      );
      console.log(`[Paso 2] Status: ${supadataRes.status}`);
    }

    // ─── ESTRATEGIA 3: Sin especificar idioma ───
    if (!supadataRes.ok) {
      console.log(`[Paso 3] Sin idioma específico...`);
      supadataRes = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?videoId=${video_id}&text=true`,
        { headers: { 'x-api-key': SUPADATA_KEY, 'Content-Type': 'application/json' } }
      );
      console.log(`[Paso 3] Status: ${supadataRes.status}`);
    }

    if (!supadataRes.ok) {
      const errText = await supadataRes.text();
      console.error(`[Supadata] Error final: ${supadataRes.status} → ${errText}`);
      return res.status(404).json({
        error: 'No se pudieron obtener los subtítulos de este video.',
        details: `Supadata HTTP ${supadataRes.status}: ${errText}`,
      });
    }

    const data = await supadataRes.json();
    console.log(`[Supadata] Respuesta keys: ${Object.keys(data).join(', ')}`);

    let captions = '';
    if (typeof data.content === 'string') {
      captions = data.content.trim();
    } else if (Array.isArray(data.content)) {
      captions = data.content.map(item => item.text || '').join(' ').trim();
    } else if (Array.isArray(data.transcript)) {
      captions = data.transcript.map(item => item.text || '').join(' ').trim();
    }

    console.log(`[Supadata] Texto extraído: ${captions.length} chars`);

    if (captions.length < 10) {
      console.error(`[Supadata] Respuesta vacía. Data completa:`, JSON.stringify(data).substring(0, 300));
      return res.status(404).json({ error: 'Los subtítulos estaban vacíos.', details: JSON.stringify(data).substring(0, 200) });
    }

    console.log(`[✓] Supadata OK`);
    return res.json({ captions, language: data.lang || language, source: 'supadata' });

  } catch (error) {
    console.error(`[YouTube Captions] Error:`, error.message);
    return res.status(500).json({ error: 'Error interno al obtener subtítulos.', details: error.message });
  }
});

// --- YOUTUBE TRANSCRIPTS ENDPOINTS ---

// Upsert transcripción/resumen de YouTube
router.post('/youtube-transcripts', (req, res) => {
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

module.exports = router;

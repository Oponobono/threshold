const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Obtener todos los mazos de un usuario
router.get('/flashcard-decks', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'Se requiere user_id' });
  const query = `
    SELECT fd.*, s.name as subject_name, s.color as subject_color, s.icon as subject_icon,
    u.username as owner_username, u.name as owner_name, fd.user_id as user_id,
    CAST((SELECT COUNT(*) FROM flashcards fc WHERE fc.deck_id = fd.id) AS INTEGER) as card_count,
    CAST((SELECT COUNT(*) FROM flashcards fc WHERE fc.deck_id = fd.id AND fc.status = 'review') AS INTEGER) as review_count,
    CAST((SELECT COUNT(*) FROM flashcards fc WHERE fc.deck_id = fd.id AND fc.status = 'learning') AS INTEGER) as learning_count,
    CAST((SELECT COUNT(*) FROM flashcards fc WHERE fc.deck_id = fd.id AND fc.status = 'new') AS INTEGER) as new_count
    FROM flashcard_decks fd
    JOIN subjects s ON fd.subject_id = s.id
    JOIN users u ON fd.user_id = u.id
    WHERE s.user_id = ? 
       OR s.user_id IN (
         SELECT u2.id FROM users u2
         JOIN group_memberships gm ON gm.group_pin_id = u2.share_pin
         WHERE gm.user_id = ?
       )
    ORDER BY fd.created_at DESC
  `;
  db.all(query, [userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Crear un mazo nuevo
router.post('/flashcard-decks', (req, res) => {
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
router.get('/flashcard-decks/:deckId/cards', (req, res) => {
  const { deckId } = req.params;
  db.all(`SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at ASC`, [deckId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Crear una tarjeta en un mazo
router.post('/flashcard-decks/:deckId/cards', (req, res) => {
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
router.put('/flashcards/:cardId', (req, res) => {
  const { cardId } = req.params;
  const { status } = req.body;
  db.run(`UPDATE flashcards SET status = ? WHERE id = ?`, [status, cardId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Eliminar una tarjeta
router.delete('/flashcards/:cardId', (req, res) => {
  const { cardId } = req.params;
  db.run(`DELETE FROM flashcards WHERE id = ?`, [cardId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Eliminar un mazo (y sus tarjetas)
router.delete('/flashcard-decks/:deckId', (req, res) => {
  const { deckId } = req.params;
  db.run(`DELETE FROM flashcards WHERE deck_id = ?`, [deckId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run(`DELETE FROM flashcard_decks WHERE id = ?`, [deckId], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

// Generar tarjetas automáticamente con Groq
router.post('/flashcard-decks/generate-from-text', async (req, res) => {
  const { text, count, title, subject_id, user_id } = req.body;
  
  if (!text || !count || !title || !subject_id || !user_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos (text, count, title, subject_id, user_id).' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return res.status(500).json({ error: 'Groq API Key no está configurada' });
  }

  try {
    // Llamar a Groq para generar tarjetas
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Actúa como un experto en pedagogía universitaria y especialista en técnicas de estudio de alto rendimiento (Active Recall y Spaced Repetition).

Tu tarea es analizar el texto proporcionado (una transcripción o resumen de clase) y extraer los conceptos más importantes para crear exactamente ${count} tarjetas de repaso.

Reglas de Oro para las Tarjetas:

1. Conceptos Atómicos: Cada tarjeta debe tratar un solo concepto. No mezcles varios temas en una sola pregunta.
2. Dificultad Progresiva: Crea una mezcla de definiciones, comparaciones y aplicaciones prácticas.
3. Claridad: Las preguntas deben ser directas. Las respuestas deben ser explicativas pero concisas.
4. No alucines: Si el texto no tiene suficiente información para el número de tarjetas solicitado, genera solo las que sean posibles con alta calidad.

Formato de Salida (ESTRICTO):
Debes responder EXCLUSIVAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "deck_metadata": { "suggested_title": "Título corto y alusivo" },
  "flashcards": [
    { "question": "¿...?", "answer": "..." }
  ]
}

NO incluyas texto adicional ni markdown. Solo el JSON.`
          },
          {
            role: 'user',
            content: `Por favor, genera exactamente ${count} tarjetas de estudio de alto calidad basadas en este contenido:\n\n${text}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(500).json({ error: 'Error al llamar a Groq API', details: errorData });
    }

    const groqData = await response.json();
    const groqResponse = groqData.choices[0].message.content.trim();

    // Limpiar respuesta JSON (a veces Groq devuelve markdown formatting)
    let jsonString = groqResponse;
    
    // Eliminar markdown code blocks si existen
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7); // Eliminar ```json
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.slice(3); // Eliminar ```
    }
    
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3); // Eliminar ``` final
    }
    
    jsonString = jsonString.trim();

    // Parsear la respuesta JSON de Groq
    let cardsData;
    try {
      cardsData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw response:', groqResponse);
      console.error('Cleaned string:', jsonString);
      return res.status(500).json({ 
        error: 'Respuesta de Groq no es JSON válido', 
        details: groqResponse,
        parseError: parseError.message 
      });
    }

    // Validar estructura
    if (!cardsData.flashcards || !Array.isArray(cardsData.flashcards)) {
      return res.status(500).json({ error: 'Estructura de respuesta de Groq inválida' });
    }

    // Crear el mazo
    db.run(
      `INSERT INTO flashcard_decks (subject_id, user_id, title, description) VALUES (?, ?, ?, ?)`,
      [subject_id, user_id, title, 'Mazo generado con IA'],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        const deckId = this.lastID;
        let insertedCount = 0;
        let insertErrors = [];

        // Insertar cada tarjeta
        cardsData.flashcards.forEach((card) => {
          db.run(
            `INSERT INTO flashcards (deck_id, front, back, status) VALUES (?, ?, ?, 'new')`,
            [deckId, card.question || card.front, card.answer || card.back],
            (err) => {
              if (err) {
                insertErrors.push(err.message);
              } else {
                insertedCount++;
              }
            }
          );
        });

        // Esperar a que se completen las inserciones
        setTimeout(() => {
          if (insertErrors.length > 0) {
            return res.status(500).json({ error: 'Error al insertar tarjetas', details: insertErrors });
          }

          // Retornar el mazo con sus tarjetas
          db.all(
            `SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at ASC`,
            [deckId],
            (err, cards) => {
              if (err) return res.status(500).json({ error: err.message });
              res.status(201).json({
                id: deckId,
                subject_id,
                user_id,
                title,
                description: 'Mazo generado con IA',
                card_count: insertedCount,
                cards: cards
              });
            }
          );
        }, 500);
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Error al generar tarjetas', details: err.message });
  }
});

// Generar tarjetas automáticamente desde imagen (OCR + Generación) con Groq Vision
router.post('/flashcard-decks/generate-from-image', async (req, res) => {
  const { image_base64, count, title, subject_id, user_id } = req.body;
  
  if (!image_base64 || !count || !title || !subject_id || !user_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos (image_base64, count, title, subject_id, user_id).' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return res.status(500).json({ error: 'Groq API Key no está configurada' });
  }

  // Asegurar formato correcto de base64 si no incluye el data:image/...
  let formattedBase64 = image_base64;
  if (!image_base64.startsWith('data:image')) {
    formattedBase64 = `data:image/jpeg;base64,${image_base64}`;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Eres un experto en OCR académico y pedagogía. 
1. Transcribe el texto de esta imagen. 
2. A partir del conocimiento extraído, genera EXACTAMENTE ${count} tarjetas de estudio de alto rendimiento (Pregunta/Respuesta).

Reglas de Oro:
- Conceptos Atómicos: Una tarjeta = Un concepto.
- Si la imagen contiene preguntas y respuestas explícitas, úsalas.
- Si el texto no da para ${count} tarjetas, genera las que puedas con ALTA CALIDAD.

Formato de Salida (ESTRICTO):
Debes responder EXCLUSIVAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "deck_metadata": { "suggested_title": "Título corto" },
  "flashcards": [
    { "question": "¿...?", "answer": "..." }
  ]
}
NO incluyas texto adicional ni markdown fuera del JSON.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: formattedBase64
                }
              }
            ]
          }
        ],
        temperature: 0.5,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(500).json({ error: 'Error al llamar a Groq API Vision', details: errorData });
    }

    const groqData = await response.json();
    const groqResponse = groqData.choices[0].message.content.trim();

    // Limpiar respuesta JSON (a veces Groq devuelve markdown formatting)
    let jsonString = groqResponse;
    if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
    else if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
    if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);
    jsonString = jsonString.trim();

    // Parsear la respuesta JSON de Groq
    let cardsData;
    try {
      cardsData = JSON.parse(jsonString);
    } catch (parseError) {
      return res.status(500).json({ 
        error: 'Respuesta de Groq no es JSON válido', 
        details: groqResponse,
        parseError: parseError.message 
      });
    }

    if (!cardsData.flashcards || !Array.isArray(cardsData.flashcards)) {
      return res.status(500).json({ error: 'Estructura de respuesta de Groq inválida' });
    }

    // Crear el mazo
    db.run(
      `INSERT INTO flashcard_decks (subject_id, user_id, title, description) VALUES (?, ?, ?, ?)`,
      [subject_id, user_id, title, 'Mazo generado con OCR + IA'],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        const deckId = this.lastID;
        let insertedCount = 0;
        let insertErrors = [];

        // Insertar cada tarjeta
        cardsData.flashcards.forEach((card) => {
          db.run(
            `INSERT INTO flashcards (deck_id, front, back, status) VALUES (?, ?, ?, 'new')`,
            [deckId, card.question || card.front, card.answer || card.back],
            (err) => {
              if (err) insertErrors.push(err.message);
              else insertedCount++;
            }
          );
        });

        // Esperar inserciones
        setTimeout(() => {
          if (insertErrors.length > 0) {
            return res.status(500).json({ error: 'Error al insertar tarjetas', details: insertErrors });
          }
          db.all(
            `SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at ASC`,
            [deckId],
            (err, cards) => {
              if (err) return res.status(500).json({ error: err.message });
              res.status(201).json({
                id: deckId,
                subject_id,
                user_id,
                title,
                description: 'Mazo generado con OCR + IA',
                card_count: insertedCount,
                cards: cards
              });
            }
          );
        }, 500);
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Error al generar tarjetas con OCR', details: err.message });
  }
});

module.exports = router;

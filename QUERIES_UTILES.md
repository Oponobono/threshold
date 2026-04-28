# 🔍 Queries Útiles para Threshold

## 📊 Consultas de Análisis

### 1. Promedio de calificaciones por materia
```sql
SELECT 
  s.id,
  s.name,
  s.professor,
  ROUND(AVG(a.grade_value), 2) as promedio,
  COUNT(a.id) as total_evaluaciones,
  SUM(CASE WHEN a.is_completed = 1 THEN 1 ELSE 0 END) as completadas,
  s.target_grade,
  CASE 
    WHEN AVG(a.grade_value) >= s.approval_threshold THEN '✅ Aprobada'
    ELSE '❌ En Riesgo'
  END as estado
FROM subjects s
LEFT JOIN assessments a ON s.id = a.subject_id
WHERE s.user_id = ?
GROUP BY s.id, s.name, s.professor, s.approval_threshold, s.target_grade
ORDER BY s.name;
```

---

### 2. Materias en riesgo académico
```sql
SELECT 
  s.id,
  s.name,
  s.professor,
  ROUND(AVG(a.grade_value), 2) as promedio_actual,
  s.approval_threshold,
  ROUND((s.approval_threshold - AVG(a.grade_value)), 2) as puntos_faltantes,
  COUNT(a.id) as evaluaciones
FROM subjects s
LEFT JOIN assessments a ON s.id = a.subject_id
WHERE s.user_id = ? AND a.is_completed = 1
GROUP BY s.id, s.name, s.professor, s.approval_threshold
HAVING AVG(a.grade_value) < (s.approval_threshold + 0.5)
ORDER BY ROUND(AVG(a.grade_value), 2) ASC;
```

**Resultado:** Muestra materias donde estás cerca de reprobar (menos de 0.5 puntos del umbral)

---

### 3. Progreso general del usuario
```sql
SELECT 
  u.username,
  COUNT(DISTINCT s.id) as total_materias,
  COUNT(DISTINCT a.id) as total_evaluaciones,
  SUM(CASE WHEN a.is_completed = 1 THEN 1 ELSE 0 END) as evaluaciones_completadas,
  ROUND(
    SUM(CASE WHEN a.is_completed = 1 THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(DISTINCT a.id), 0), 1
  ) as porcentaje_completacion,
  COUNT(DISTINCT fd.id) as conjuntos_flashcards,
  COUNT(DISTINCT f.id) as total_flashcards,
  COUNT(DISTINCT ar.id) as grabaciones_audio,
  COUNT(DISTINCT yv.id) as videos_guardados,
  COUNT(DISTINCT p.id) as fotos_apuntes
FROM users u
LEFT JOIN subjects s ON u.id = s.user_id
LEFT JOIN assessments a ON s.id = a.subject_id
LEFT JOIN flashcard_decks fd ON u.id = fd.user_id
LEFT JOIN flashcards f ON fd.id = f.deck_id
LEFT JOIN audio_recordings ar ON u.id = ar.user_id
LEFT JOIN youtube_videos yv ON u.id = yv.user_id
LEFT JOIN photos p ON s.id = p.subject_id
WHERE u.id = ? AND u.status = 'active'
GROUP BY u.id, u.username;
```

---

### 4. Detalle de evaluaciones por materia
```sql
SELECT 
  s.name as materia,
  a.name as evaluacion,
  a.type,
  a.date,
  a.weight,
  a.out_of,
  a.score,
  ROUND(a.percentage, 1) as porcentaje,
  ROUND(a.grade_value, 2) as calificacion,
  CASE WHEN a.is_completed = 1 THEN '✅ Completada' ELSE '⏳ Pendiente' END as estado
FROM assessments a
JOIN subjects s ON a.subject_id = s.id
WHERE s.user_id = ? AND s.id = ?
ORDER BY a.date DESC;
```

---

### 5. Cálculo de nota ponderada por materia
```sql
SELECT 
  s.name as materia,
  ROUND(
    SUM(CASE 
      WHEN a.weight IS NOT NULL THEN (a.percentage / 100) * CAST(REGEXP_SUBSTR(a.weight, '[0-9]+') AS FLOAT) / 100
      ELSE 0
    END), 2
  ) as nota_ponderada,
  ROUND(AVG(a.percentage), 1) as promedio_porcentaje,
  s.approval_threshold as nota_minima,
  s.target_grade as nota_objetivo
FROM subjects s
LEFT JOIN assessments a ON s.id = a.subject_id
WHERE s.user_id = ? AND a.is_completed = 1
GROUP BY s.id, s.name, s.approval_threshold, s.target_grade;
```

---

## 📅 Consultas de Horario

### 6. Horario de clases del usuario
```sql
SELECT 
  s.name as materia,
  s.professor,
  CASE 
    WHEN s.day_of_week = 0 THEN '📍 Lunes'
    WHEN s.day_of_week = 1 THEN '📍 Martes'
    WHEN s.day_of_week = 2 THEN '📍 Miércoles'
    WHEN s.day_of_week = 3 THEN '📍 Jueves'
    WHEN s.day_of_week = 4 THEN '📍 Viernes'
    WHEN s.day_of_week = 5 THEN '📍 Sábado'
    WHEN s.day_of_week = 6 THEN '📍 Domingo'
  END as dia,
  sch.start_time as inicio,
  sch.end_time as fin
FROM subjects s
LEFT JOIN schedules sch ON s.id = sch.subject_id
WHERE s.user_id = ?
ORDER BY s.day_of_week, sch.start_time;
```

---

### 7. Clases de hoy
```sql
SELECT 
  s.name as materia,
  s.professor,
  sch.start_time,
  sch.end_time,
  s.color,
  s.icon
FROM subjects s
JOIN schedules sch ON s.id = sch.subject_id
WHERE s.user_id = ? 
AND sch.day_of_week = DAYOFWEEK(CURDATE()) - 1  -- Ajustar según BD de origen
ORDER BY sch.start_time;
```

---

## 🎙️ Consultas de Multimedia

### 8. Todas las grabaciones de audio con transcripción
```sql
SELECT 
  ar.id,
  ar.name as nombre_grabacion,
  s.name as materia,
  ROUND(ar.duration / 60.0, 1) as duracion_minutos,
  ar.created_at,
  at.transcript_uri,
  at.summary_uri,
  CASE WHEN at.id IS NOT NULL THEN '✅ Transcrita' ELSE '⏳ Pendiente' END as estado
FROM audio_recordings ar
LEFT JOIN audio_transcripts at ON ar.id = at.recording_id
LEFT JOIN subjects s ON ar.subject_id = s.id
WHERE ar.user_id = ?
ORDER BY ar.created_at DESC;
```

---

### 9. Videos de YouTube guardados por materia
```sql
SELECT 
  s.name as materia,
  yv.title,
  yv.youtube_url,
  ROUND(yv.duration / 60.0, 0) as duracion_minutos,
  yv.created_at,
  yv.thumbnail_url,
  CASE WHEN yt.id IS NOT NULL THEN '✅ Transcrita' ELSE '⏳ Sin transcripción' END as transcripcion
FROM youtube_videos yv
LEFT JOIN youtube_transcripts yt ON yv.id = yt.video_id
LEFT JOIN subjects s ON yv.subject_id = s.id
WHERE yv.user_id = ?
ORDER BY s.name, yv.created_at DESC;
```

---

### 10. Fotos/Apuntes por materia con búsqueda
```sql
SELECT 
  p.id,
  s.name as materia,
  p.local_uri,
  p.created_at,
  CASE WHEN p.es_favorita = 1 THEN '⭐ Favorita' ELSE 'Normal' END as tipo,
  COUNT(*) OVER (PARTITION BY s.id) as total_fotos_materia
FROM photos p
JOIN subjects s ON p.subject_id = s.id
WHERE s.user_id = ? AND s.id = ?
ORDER BY p.created_at DESC;
```

---

### 11. Galería completa con OCR
```sql
SELECT 
  gi.id,
  gi.uri,
  gi.subject,
  gi.date,
  gi.time,
  gi.ocr_text,
  CASE WHEN gi.is_starred THEN '⭐ Importante' ELSE 'Normal' END as marcado,
  CASE 
    WHEN gi.ocr_text IS NOT NULL THEN '✅ OCR disponible'
    ELSE '⏳ Sin procesar'
  END as estado_ocr
FROM gallery_items gi
WHERE gi.user_id = ?
ORDER BY gi.date DESC, gi.time DESC;
```

---

## 🎴 Consultas de Flashcards

### 12. Resumen de conjuntos de flashcards
```sql
SELECT 
  fd.id,
  fd.title as conjunto,
  s.name as materia,
  COUNT(f.id) as total_tarjetas,
  SUM(CASE WHEN f.status = 'known' THEN 1 ELSE 0 END) as dominadas,
  SUM(CASE WHEN f.status = 'learning' THEN 1 ELSE 0 END) as estudiando,
  SUM(CASE WHEN f.status = 'new' THEN 1 ELSE 0 END) as nuevas,
  fd.created_at,
  ROUND(
    SUM(CASE WHEN f.status = 'known' THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(f.id), 0), 1
  ) as porcentaje_dominadas
FROM flashcard_decks fd
LEFT JOIN flashcards f ON fd.id = f.deck_id
LEFT JOIN subjects s ON fd.subject_id = s.id
WHERE fd.user_id = ?
GROUP BY fd.id, fd.title
ORDER BY s.name, fd.created_at DESC;
```

---

### 13. Tarjetas por estudiar (status = 'new' o 'learning')
```sql
SELECT 
  fd.title as conjunto,
  s.name as materia,
  f.id,
  f.front as pregunta,
  f.back as respuesta,
  f.status,
  f.created_at
FROM flashcards f
JOIN flashcard_decks fd ON f.deck_id = fd.id
LEFT JOIN subjects s ON fd.subject_id = s.id
WHERE fd.user_id = ? 
AND f.status IN ('new', 'learning')
ORDER BY fd.id, f.created_at;
```

---

### 14. Progreso de estudio en flashcards
```sql
SELECT 
  fd.title as conjunto,
  COUNT(f.id) as total,
  SUM(CASE WHEN f.status = 'new' THEN 1 ELSE 0 END) as nuevas,
  SUM(CASE WHEN f.status = 'learning' THEN 1 ELSE 0 END) as en_progreso,
  SUM(CASE WHEN f.status = 'known' THEN 1 ELSE 0 END) as dominadas,
  ROUND(
    SUM(CASE WHEN f.status = 'known' THEN 1 ELSE 0 END) * 100.0 / 
    COUNT(f.id), 1
  ) as porcentaje_completacion
FROM flashcard_decks fd
LEFT JOIN flashcards f ON fd.id = f.deck_id
WHERE fd.user_id = ?
GROUP BY fd.id, fd.title
ORDER BY porcentaje_completacion DESC;
```

---

## 👥 Consultas de Usuarios

### 15. Actividad de visitantes
```sql
SELECT 
  device_id,
  first_seen_at,
  last_visit_at,
  visit_count,
  ROUND(
    (JULIANDAY(last_visit_at) - JULIANDAY(first_seen_at)), 1
  ) as dias_activo,
  ROUND(
    visit_count / NULLIF(
      ROUND((JULIANDAY(last_visit_at) - JULIANDAY(first_seen_at)) + 1), 1
    ), 1
  ) as visitas_por_dia
FROM app_visitors
ORDER BY visit_count DESC;
```

---

### 16. Historial de usuarios eliminados
```sql
SELECT 
  id,
  email,
  name,
  lastname,
  deleted_at,
  ROUND((JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(deleted_at)), 1) as dias_desde_eliminacion
FROM deleted_users
ORDER BY deleted_at DESC;
```

---

## 🚨 Consultas de Validación

### 17. Datos incompletos o inconsistentes
```sql
SELECT 
  u.id,
  u.username,
  CASE WHEN u.email IS NULL THEN '❌ Email faltante' ELSE '✅' END as email,
  CASE WHEN u.grading_scale IS NULL THEN '❌ Escala faltante' ELSE '✅' END as grading_scale,
  COUNT(DISTINCT s.id) as materias,
  COUNT(DISTINCT a.id) as evaluaciones
FROM users u
LEFT JOIN subjects s ON u.id = s.user_id
LEFT JOIN assessments a ON s.id = a.subject_id
WHERE u.status = 'active'
GROUP BY u.id, u.username;
```

---

### 18. Evaluaciones sin calificación
```sql
SELECT 
  s.name as materia,
  a.name as evaluacion,
  a.type,
  a.date,
  a.out_of,
  DAYS(CURDATE(), DATE(a.date)) as dias_pendiente
FROM assessments a
JOIN subjects s ON a.subject_id = s.id
WHERE a.is_completed = 0 
AND a.score IS NULL
ORDER BY a.date;
```

---

## 📈 Consultas Avanzadas

### 19. Comparación de desempeño entre materias
```sql
SELECT 
  s.name,
  s.code,
  COUNT(a.id) as evaluaciones,
  ROUND(AVG(a.percentage), 1) as porcentaje_promedio,
  MIN(a.percentage) as minimo,
  MAX(a.percentage) as maximo,
  ROUND(STDDEV(a.percentage), 1) as desviacion_estandar,
  CASE 
    WHEN AVG(a.percentage) >= 90 THEN 'A (Excelente)'
    WHEN AVG(a.percentage) >= 80 THEN 'B (Bueno)'
    WHEN AVG(a.percentage) >= 70 THEN 'C (Satisfactorio)'
    WHEN AVG(a.percentage) >= 60 THEN 'D (Mínimo)'
    ELSE 'F (Insuficiente)'
  END as calificacion
FROM subjects s
LEFT JOIN assessments a ON s.id = a.subject_id
WHERE s.user_id = ? AND a.is_completed = 1
GROUP BY s.id, s.name, s.code
ORDER BY ROUND(AVG(a.percentage), 1) DESC;
```

---

### 20. Tendencia de calificaciones en el tiempo
```sql
SELECT 
  s.name as materia,
  DATE(a.date) as fecha,
  ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY a.date) as numero_evaluacion,
  a.percentage,
  ROUND(
    AVG(a.percentage) OVER (
      PARTITION BY s.id 
      ORDER BY a.date 
      ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 1
  ) as promedio_movil_3,
  CASE 
    WHEN a.percentage > LAG(a.percentage) OVER (PARTITION BY s.id ORDER BY a.date) THEN '📈 Mejora'
    WHEN a.percentage < LAG(a.percentage) OVER (PARTITION BY s.id ORDER BY a.date) THEN '📉 Decayó'
    ELSE '➡️ Estable'
  END as tendencia
FROM assessments a
JOIN subjects s ON a.subject_id = s.id
WHERE s.user_id = ? AND a.is_completed = 1
ORDER BY s.id, a.date;
```

---

## 🔧 Notas Importantes

- Reemplaza `?` con el `user_id` correspondiente
- Algunas funciones SQL pueden variar según el motor (SQLite vs PostgreSQL)
- Usa `LIKE '%texto%'` para búsquedas en campos de texto
- Crea índices en campos frecuentemente consultados para mejor performance
- Usa `EXPLAIN QUERY PLAN` para analizar queries lentas (SQLite) o `EXPLAIN` (PostgreSQL)

---

## ⚡ Queries por Performance

### Crear Índices Recomendados:
```sql
CREATE INDEX idx_assessments_completed ON assessments(is_completed);
CREATE INDEX idx_assessments_subject_date ON assessments(subject_id, date);
CREATE INDEX idx_flashcards_status ON flashcards(status);
CREATE INDEX idx_audio_user_date ON audio_recordings(user_id, created_at);
CREATE INDEX idx_photos_subject_date ON photos(subject_id, created_at);
```


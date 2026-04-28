# 📊 Documentación Completa de la Base de Datos - Threshold

## Índice
1. [Estructura General](#estructura-general)
2. [Módulo de Usuarios](#módulo-de-usuarios)
3. [Módulo de Materias y Evaluaciones](#módulo-de-materias-y-evaluaciones)
4. [Módulo de Multimedia](#módulo-de-multimedia)
5. [Relaciones y Restricciones](#relaciones-y-restricciones)
6. [Vistas y Consultas Útiles](#vistas-y-consultas-útiles)
7. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Estructura General

Tu base de datos **Threshold** está organizada en **4 módulos principales** con **14 tablas** en total:

```
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULO DE USUARIOS                        │
│  (users, deleted_users, app_visitors)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              MÓDULO DE MATERIAS Y EVALUACIONES               │
│  (subjects, assessments, schedules)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 MÓDULO DE MULTIMEDIA                         │
│  (photos, audio_recordings, youtube_videos, gallery_items,  │
│   audio_transcripts, youtube_transcripts)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│           MÓDULO DE ESTUDIO (FLASHCARDS)                     │
│  (flashcard_decks, flashcards)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Módulo de Usuarios

### 📋 Tabla: `users`
**Descripción:** Almacena información de usuarios registrados.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | SERIAL | PRIMARY KEY | ID único del usuario |
| `email` | TEXT | UNIQUE, NOT NULL | Email único para login |
| `password_hash` | TEXT | NOT NULL | Contraseña hasheada con bcrypt |
| `name` | TEXT | - | Nombre del usuario |
| `lastname` | TEXT | - | Apellido del usuario |
| `username` | TEXT | UNIQUE | Nombre de usuario personalizado |
| `grading_scale` | TEXT | - | Escala de calificación (ej: "0-5.0") |
| `approval_threshold` | REAL | - | Nota mínima de aprobación |
| `major` | TEXT | - | Carrera/Programa académico |
| `university` | TEXT | - | Universidad |
| `biometric_token` | TEXT | - | Token para autenticación biométrica |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Fecha de creación |
| `last_login` | TIMESTAMP | DEFAULT NOW() | Último acceso |
| `status` | VARCHAR(20) | DEFAULT 'active' | Estado: active, inactive, deleted |
| `deletion_date` | TIMESTAMP | - | Fecha de eliminación (si aplica) |

**Índices:**
```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
```

**Ejemplo de inserción:**
```sql
INSERT INTO users (email, password_hash, name, lastname, username, grading_scale, approval_threshold, major, university)
VALUES ('juan@mail.com', '$2b$10$...', 'Juan', 'Pérez', 'juanperez', '0-5.0', 3.0, 'Ingeniería de Sistemas', 'Universidad Nacional');
```

---

### 🗑️ Tabla: `deleted_users`
**Descripción:** Registro de usuarios eliminados (auditoría).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID del registro |
| `original_user_id` | INTEGER | ID original del usuario eliminado |
| `email` | TEXT | Email del usuario eliminado |
| `name` | TEXT | Nombre del usuario eliminado |
| `lastname` | TEXT | Apellido del usuario eliminado |
| `deleted_at` | TIMESTAMP | Fecha de eliminación |

---

### 👤 Tabla: `app_visitors`
**Descripción:** Seguimiento de usuarios anónimos/visitantes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `device_id` | TEXT | ID único del dispositivo (PRIMARY KEY) |
| `first_seen_at` | TIMESTAMP | Primer acceso registrado |
| `last_visit_at` | TIMESTAMP | Último acceso |
| `visit_count` | INTEGER | Número total de visitas |

---

## Módulo de Materias y Evaluaciones

### 📚 Tabla: `subjects` (Materias)
**Descripción:** Materias/cursos organizados por usuario. Cada usuario puede crear múltiples materias.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | SERIAL | PRIMARY KEY | ID único de la materia |
| `user_id` | INTEGER | FOREIGN KEY (users) | Usuario propietario |
| `code` | TEXT | NOT NULL DEFAULT '' | Código de materia (ej: MAT101) |
| `name` | TEXT | NOT NULL | Nombre de la materia |
| `credits` | INTEGER | - | Número de créditos |
| `professor` | TEXT | - | Nombre del profesor |
| `color` | TEXT | DEFAULT '#CCCCCC' | Color en hexadecimal para UI |
| `icon` | TEXT | DEFAULT 'book-outline' | Ícono (Ionicons) |
| `target_grade` | REAL | - | Calificación objetivo |
| `folder_path` | TEXT | - | Ruta de carpeta local |

**Índices:**
```sql
CREATE INDEX idx_subjects_user_id ON subjects(user_id);
```

**Relaciones:**
- ✅ 1 usuario → Muchas materias
- ✅ 1 materia → Muchas evaluaciones
- ✅ 1 materia → Muchas fotos
- ✅ 1 materia → Múltiples horarios

---

### ✍️ Tabla: `assessments` (Evaluaciones)
**Descripción:** Exámenes, tareas, trabajos, quices de una materia.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `subject_id` | INTEGER | FOREIGN KEY (subjects) |
| `name` | TEXT | Nombre (ej: "Examen Final", "Tarea 1") |
| `type` | TEXT | Tipo: exam, homework, project, quiz |
| `date` | TEXT | Fecha de la evaluación |
| `weight` | TEXT | Peso en calificación (ej: "30%") |
| `out_of` | INTEGER | Puntaje máximo |
| `score` | INTEGER | Puntaje obtenido |
| `percentage` | REAL | Porcentaje (score/out_of * 100) |
| `grade_value` | REAL | Valor en escala de calificación |
| `is_completed` | INTEGER | 0=pendiente, 1=completada |

**Cálculos automáticos:**
```
percentage = (score / out_of) * 100
grade_value = (percentage / 100) * escala_máxima
```

---

### 📅 Tabla: `schedules` (Horarios)
**Descripción:** Horario de clases por materia.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `subject_id` | INTEGER | FOREIGN KEY (subjects) |
| `day_of_week` | INTEGER | 0=Lunes, 1=Martes, ..., 6=Domingo |
| `start_time` | TEXT | Hora inicio (HH:MM) |
| `end_time` | TEXT | Hora fin (HH:MM) |

**Ejemplo:**
```sql
INSERT INTO schedules (subject_id, day_of_week, start_time, end_time)
VALUES (1, 0, '09:00', '11:00'); -- Lunes 9:00-11:00
```

---

## Módulo de Multimedia

### 📸 Tabla: `photos` (Fotos)
**Descripción:** Fotos de apuntes, pizarras, documentos asociados a materias.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `subject_id` | INTEGER | FOREIGN KEY (subjects) ON DELETE CASCADE |
| `local_uri` | TEXT | Ruta local de la imagen |
| `created_at` | TIMESTAMP | Fecha de captura |
| `es_favorita` | INTEGER | 0=normal, 1=favorita |

---

### 🎙️ Tabla: `audio_recordings` (Grabaciones de Audio)
**Descripción:** Grabaciones de clases o notas de audio.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `user_id` | INTEGER | FOREIGN KEY (users) |
| `subject_id` | INTEGER | FOREIGN KEY (subjects) ON DELETE SET NULL |
| `name` | TEXT | Nombre de la grabación |
| `local_uri` | TEXT | Ruta local del archivo |
| `duration` | INTEGER | Duración en segundos |
| `created_at` | TIMESTAMP | Fecha de grabación |

---

### 📝 Tabla: `audio_transcripts` (Transcripciones de Audio)
**Descripción:** Transcripción de texto extraída de grabaciones.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `recording_id` | INTEGER | FOREIGN KEY (audio_recordings) ON DELETE CASCADE |
| `transcript_uri` | TEXT | Ruta del archivo de transcripción |
| `summary_uri` | TEXT | Ruta del resumen procesado |
| `created_at` | TIMESTAMP | Fecha de procesamiento |

**Relación:** 1 grabación → 1 transcripción

---

### 🎥 Tabla: `youtube_videos` (Videos de YouTube)
**Descripción:** Videos guardados de YouTube para estudio.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `user_id` | INTEGER | FOREIGN KEY (users) |
| `subject_id` | INTEGER | FOREIGN KEY (subjects) ON DELETE SET NULL |
| `youtube_url` | TEXT | URL completa del video |
| `video_id` | TEXT | ID del video en YouTube |
| `title` | TEXT | Título del video |
| `thumbnail_url` | TEXT | URL de la miniatura |
| `duration` | INTEGER | Duración en segundos |
| `created_at` | TIMESTAMP | Fecha de guardado |

---

### 📺 Tabla: `youtube_transcripts`
**Descripción:** Transcripción de videos de YouTube.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `video_id` | INTEGER | FOREIGN KEY (youtube_videos) ON DELETE CASCADE |
| `transcript_uri` | TEXT | Ruta del archivo de transcripción |
| `summary_uri` | TEXT | Ruta del resumen |
| `created_at` | TIMESTAMP | Fecha de procesamiento |

---

### 🖼️ Tabla: `gallery_items` (Galería)
**Descripción:** Galería general de imágenes del usuario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `user_id` | INTEGER | FOREIGN KEY (users) |
| `uri` | TEXT | Ruta de la imagen |
| `subject` | TEXT | Materia asociada (opcional) |
| `date` | TEXT | Fecha de captura |
| `time` | TEXT | Hora de captura |
| `ocr_text` | TEXT | Texto extraído con OCR |
| `is_starred` | BOOLEAN | Marcada como favorita |

---

## Módulo de Estudio (Flashcards)

### 📇 Tabla: `flashcard_decks` (Conjuntos de Tarjetas)
**Descripción:** Colecciones de tarjetas de estudio.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `user_id` | INTEGER | FOREIGN KEY (users) |
| `subject_id` | INTEGER | FOREIGN KEY (subjects) ON DELETE CASCADE |
| `title` | TEXT | Nombre del conjunto |
| `description` | TEXT | Descripción |
| `created_at` | TIMESTAMP | Fecha de creación |

---

### 🎴 Tabla: `flashcards` (Tarjetas Individuales)
**Descripción:** Tarjetas de pregunta-respuesta dentro de un conjunto.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único |
| `deck_id` | INTEGER | FOREIGN KEY (flashcard_decks) ON DELETE CASCADE |
| `front` | TEXT | Pregunta/Término |
| `back` | TEXT | Respuesta/Definición |
| `status` | TEXT | Estado: new, learning, known |
| `created_at` | TIMESTAMP | Fecha de creación |

**Ciclo de vida de una tarjeta:**
```
new (nueva) → learning (estudiando) → known (dominada)
```

---

## Relaciones y Restricciones

### Diagrama de Relaciones
```
users (1)
  ├─→ (M) subjects
  │     ├─→ (M) assessments
  │     ├─→ (M) schedules
  │     ├─→ (M) photos
  │     └─→ (M) flashcard_decks
  │           └─→ (M) flashcards
  │
  ├─→ (M) audio_recordings
  │     └─→ (1) audio_transcripts
  │
  ├─→ (M) youtube_videos
  │     └─→ (1) youtube_transcripts
  │
  ├─→ (M) gallery_items
  │
  └─→ (M) deleted_users (histórico)

app_visitors (independiente)
```

### Restricciones de Integridad
1. **ON DELETE CASCADE**: Fotos, evaluaciones se eliminan con la materia
2. **ON DELETE SET NULL**: Audio/videos se desvinculan si se elimina la materia
3. **UNIQUE constraints**: Email y username únicos por usuario
4. **Foreign Keys**: Garantizan integridad referencial

---

## Vistas y Consultas Útiles

### 📊 Vista: Promedio de Calificaciones por Materia
```sql
CREATE VIEW subject_average_grades AS
SELECT 
  s.id,
  s.name,
  s.user_id,
  ROUND(AVG(a.grade_value), 2) as average_grade,
  COUNT(a.id) as total_assessments,
  SUM(CASE WHEN a.is_completed = 1 THEN 1 ELSE 0 END) as completed_assessments
FROM subjects s
LEFT JOIN assessments a ON s.id = a.subject_id
GROUP BY s.id, s.name, s.user_id;
```

**Uso:**
```sql
SELECT * FROM subject_average_grades WHERE user_id = 1;
```

---

### 📈 Vista: Progreso del Usuario
```sql
CREATE VIEW user_progress AS
SELECT 
  u.id,
  u.username,
  COUNT(DISTINCT s.id) as total_subjects,
  COUNT(DISTINCT a.id) as total_assessments,
  COUNT(DISTINCT fd.id) as total_flashcard_decks,
  COUNT(DISTINCT ar.id) as total_audio_recordings,
  COUNT(DISTINCT yv.id) as total_youtube_videos,
  COUNT(DISTINCT p.id) as total_photos
FROM users u
LEFT JOIN subjects s ON u.id = s.user_id
LEFT JOIN assessments a ON s.id = a.subject_id
LEFT JOIN flashcard_decks fd ON u.id = fd.user_id
LEFT JOIN audio_recordings ar ON u.id = ar.user_id
LEFT JOIN youtube_videos yv ON u.id = yv.user_id
LEFT JOIN photos p ON s.id = p.subject_id
WHERE u.status = 'active'
GROUP BY u.id, u.username;
```

---

### 🔍 Consulta: Materias en Riesgo (Bajo promedio)
```sql
SELECT 
  s.id,
  s.name,
  ROUND(AVG(a.grade_value), 2) as current_grade,
  s.target_grade,
  s.approval_threshold,
  CASE 
    WHEN AVG(a.grade_value) < s.approval_threshold THEN '🔴 CRÍTICO'
    WHEN AVG(a.grade_value) < (s.approval_threshold + 0.5) THEN '🟡 RIESGO'
    ELSE '🟢 OK'
  END as status
FROM subjects s
LEFT JOIN assessments a ON s.id = a.subject_id
WHERE s.user_id = ? AND a.is_completed = 1
GROUP BY s.id, s.name
HAVING AVG(a.grade_value) < (s.approval_threshold + 1);
```

---

### 📚 Consulta: Resumen de Recursos por Materia
```sql
SELECT 
  s.id,
  s.name,
  COUNT(DISTINCT p.id) as fotos,
  COUNT(DISTINCT ar.id) as grabaciones_audio,
  COUNT(DISTINCT yv.id) as videos_youtube,
  COUNT(DISTINCT fd.id) as conjuntos_flashcards,
  COUNT(DISTINCT f.id) as total_flashcards
FROM subjects s
LEFT JOIN photos p ON s.id = p.subject_id
LEFT JOIN audio_recordings ar ON s.id = ar.subject_id
LEFT JOIN youtube_videos yv ON s.id = yv.subject_id
LEFT JOIN flashcard_decks fd ON s.id = fd.subject_id
LEFT JOIN flashcards f ON fd.id = f.deck_id
WHERE s.user_id = ?
GROUP BY s.id, s.name
ORDER BY s.name;
```

---

## Ejemplos de Uso

### Ejemplo 1: Crear una materia con evaluaciones
```sql
-- 1. Insertar materia
INSERT INTO subjects (user_id, code, name, credits, professor, color, target_grade, approval_threshold)
VALUES (1, 'CALC101', 'Cálculo I', 4, 'Dr. González', '#FF5733', 4.5, 3.0);

-- 2. Insertar evaluaciones
INSERT INTO assessments (subject_id, name, type, date, weight, out_of, score)
VALUES 
  (1, 'Parcial 1', 'exam', '2024-03-15', '30%', 100, 85),
  (1, 'Tarea 1', 'homework', '2024-03-20', '20%', 50, 48),
  (1, 'Examen Final', 'exam', '2024-05-10', '50%', 100, null);

-- 3. Insertar horario
INSERT INTO schedules (subject_id, day_of_week, start_time, end_time)
VALUES (1, 0, '09:00', '11:00'); -- Lunes
```

### Ejemplo 2: Obtener reporte completo de un usuario
```sql
SELECT 
  u.username,
  up.total_subjects,
  up.total_assessments,
  ROUND((SELECT COUNT(*) FROM assessments WHERE is_completed = 1) * 100.0 / 
        (SELECT COUNT(*) FROM assessments WHERE subject_id IN 
         (SELECT id FROM subjects WHERE user_id = u.id)), 2) as completion_percentage,
  up.total_flashcard_decks,
  up.total_audio_recordings,
  up.total_youtube_videos
FROM users u
JOIN user_progress up ON u.id = up.id
WHERE u.id = 1;
```

### Ejemplo 3: Obtener todas las transcripciones de una materia
```sql
SELECT 
  ar.name as recording_name,
  at.transcript_uri,
  ar.created_at
FROM audio_recordings ar
LEFT JOIN audio_transcripts at ON ar.id = at.recording_id
WHERE ar.subject_id = 1
ORDER BY ar.created_at DESC;
```

---

## 📊 Estadísticas de la BD

| Métrica | Valor |
|---------|-------|
| **Total de Tablas** | 14 |
| **Total de Columnas** | ~130 |
| **Relaciones (Foreign Keys)** | 20+ |
| **Vistas** | 2 |
| **Índices** | 12+ |

---

## 🔗 Recursos para Visualizar

1. **Copiar `DATABASE_SCHEMA.sql` a [dbdiagram.io](https://dbdiagram.io/)**
   - Obtendrás un diagrama interactivo
   - Puedes hacer zoom, desplazarte
   - Ver relaciones visualmente

2. **Usar [SQL Designer Online](https://sql.toad.com/)**
   - Otra opción interactiva

3. **Generar con [SchemaCrawler](https://www.schemacrawler.com/)**
   - Para reportes profesionales

---

## ✅ Próximos Pasos

- [ ] Copiar `DATABASE_SCHEMA.sql` a [dbdiagram.io](https://dbdiagram.io) para visualización interactiva
- [ ] Agregar índices adicionales según patrones de consulta
- [ ] Implementar particionamiento si la BD crece mucho
- [ ] Crear backups automáticos
- [ ] Monitoreo de performance


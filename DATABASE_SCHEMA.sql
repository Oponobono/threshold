-- ============================================
-- THRESHOLD - Database Schema
-- ============================================

-- Table: users (Tabla de Usuarios)
-- Almacena información de usuarios registrados
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  lastname TEXT,
  username TEXT UNIQUE,
  grading_scale TEXT,                 -- Escala de calificación (0-5.0, 0-100, etc)
  approval_threshold REAL,            -- Nota mínima de aprobación
  major TEXT,                         -- Carrera
  university TEXT,                    -- Universidad
  biometric_token TEXT,               -- Token para autenticación biométrica
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, deleted
  deletion_date TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;

-- Table: deleted_users (Registro de Usuarios Eliminados)
-- Mantiene un historial de usuarios eliminados
CREATE TABLE deleted_users (
  id SERIAL PRIMARY KEY,
  original_user_id INTEGER,
  email TEXT,
  name TEXT,
  lastname TEXT,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: app_visitors (Visitantes de la Aplicación)
-- Seguimiento de usuarios anónimos
CREATE TABLE app_visitors (
  device_id TEXT PRIMARY KEY,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  visit_count INTEGER DEFAULT 1
);

-- ============================================
-- MATERIAS Y EVALUACIONES
-- ============================================

-- Table: subjects (Materias/Cursos)
-- Una materia pertenece a un usuario
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  code TEXT NOT NULL DEFAULT '',      -- Código de la materia (ej: MAT101)
  name TEXT NOT NULL,                 -- Nombre de la materia
  credits INTEGER,                    -- Créditos
  professor TEXT,                     -- Profesor
  color TEXT DEFAULT '#CCCCCC',       -- Color para UI (hex)
  icon TEXT DEFAULT 'book-outline',   -- Icono
  target_grade REAL,                  -- Nota objetivo
  folder_path TEXT                    -- Ruta de carpeta local
);

CREATE INDEX idx_subjects_user_id ON subjects(user_id);

-- Table: assessments (Evaluaciones)
-- Exámenes, tareas, trabajos de una materia
CREATE TABLE assessments (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  name TEXT NOT NULL,                 -- Nombre (Examen Final, Tarea 1, etc)
  type TEXT,                          -- Type: exam, homework, project, quiz
  date TEXT,                          -- Fecha de la evaluación
  weight TEXT,                        -- Peso en calificación (20%, 30%, etc)
  out_of INTEGER,                     -- Puntaje máximo
  score INTEGER,                      -- Puntaje obtenido
  percentage REAL,                    -- Porcentaje (score/out_of * 100)
  grade_value REAL,                   -- Valor en la escala de calificación
  is_completed INTEGER DEFAULT 0      -- 0 = pendiente, 1 = completada
);

CREATE INDEX idx_assessments_subject_id ON assessments(subject_id);

-- Table: schedules (Horarios)
-- Horario de clases por materia
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  day_of_week INTEGER NOT NULL,       -- 0=Lunes, 1=Martes, ..., 6=Domingo
  start_time TEXT NOT NULL,           -- HH:MM
  end_time TEXT NOT NULL              -- HH:MM
);

CREATE INDEX idx_schedules_subject_id ON schedules(subject_id);

-- ============================================
-- CONTENIDO MULTIMEDIA: FOTOS
-- ============================================

-- Table: photos (Fotos)
-- Fotos asociadas a materias (notas, apuntes)
CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  local_uri TEXT NOT NULL,            -- Ruta local de la imagen
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  es_favorita INTEGER DEFAULT 0       -- 0 = normal, 1 = favorita
);

CREATE INDEX idx_photos_subject_id ON photos(subject_id);

-- ============================================
-- CONTENIDO MULTIMEDIA: GRABACIONES DE AUDIO
-- ============================================

-- Table: audio_recordings (Grabaciones de Audio)
-- Clases grabadas o notas de audio
CREATE TABLE audio_recordings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  name TEXT,                          -- Nombre de la grabación
  local_uri TEXT NOT NULL,            -- Ruta local
  duration INTEGER,                   -- Duración en segundos
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audio_recordings_user_id ON audio_recordings(user_id);
CREATE INDEX idx_audio_recordings_subject_id ON audio_recordings(subject_id);

-- Table: audio_transcripts (Transcripciones de Audio)
-- Texto extraído de grabaciones
CREATE TABLE audio_transcripts (
  id SERIAL PRIMARY KEY,
  recording_id INTEGER NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
  transcript_uri TEXT,                -- Ruta del archivo de transcripción
  summary_uri TEXT,                   -- Ruta del resumen
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audio_transcripts_recording_id ON audio_transcripts(recording_id);

-- ============================================
-- CONTENIDO MULTIMEDIA: VIDEOS DE YOUTUBE
-- ============================================

-- Table: youtube_videos (Videos de YouTube)
-- Videos guardados de YouTube
CREATE TABLE youtube_videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  youtube_url TEXT NOT NULL,          -- URL completa del video
  video_id TEXT NOT NULL,             -- ID del video en YouTube
  title TEXT,                         -- Título
  thumbnail_url TEXT,                 -- URL de miniatura
  duration INTEGER,                   -- Duración en segundos
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_youtube_videos_user_id ON youtube_videos(user_id);
CREATE INDEX idx_youtube_videos_subject_id ON youtube_videos(subject_id);

-- Table: youtube_transcripts (Transcripciones de YouTube)
-- Transcripciones de videos de YouTube
CREATE TABLE youtube_transcripts (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES youtube_videos(id) ON DELETE CASCADE,
  transcript_uri TEXT,                -- Ruta del archivo de transcripción
  summary_uri TEXT,                   -- Ruta del resumen
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_youtube_transcripts_video_id ON youtube_transcripts(video_id);

-- ============================================
-- GALERÍA
-- ============================================

-- Table: gallery_items (Galería)
-- Galería general de imágenes del usuario
CREATE TABLE gallery_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  uri TEXT NOT NULL,                  -- Ruta de la imagen
  subject TEXT,                       -- Materia asociada (opcional)
  date TEXT,                          -- Fecha de la foto
  time TEXT,                          -- Hora de la foto
  ocr_text TEXT,                      -- Texto extraído con OCR
  is_starred BOOLEAN DEFAULT false
);

CREATE INDEX idx_gallery_items_user_id ON gallery_items(user_id);

-- ============================================
-- TARJETAS DE ESTUDIO (FLASHCARDS)
-- ============================================

-- Table: flashcard_decks (Conjuntos de Tarjetas)
-- Colecciones de tarjetas de estudio
CREATE TABLE flashcard_decks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                -- Nombre del conjunto
  description TEXT,                   -- Descripción
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX idx_flashcard_decks_subject_id ON flashcard_decks(subject_id);

-- Table: flashcards (Tarjetas de Estudio)
-- Tarjetas individuales (pregunta-respuesta)
CREATE TABLE flashcards (
  id SERIAL PRIMARY KEY,
  deck_id INTEGER NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,                -- Pregunta / Término
  back TEXT NOT NULL,                 -- Respuesta / Definición
  status TEXT DEFAULT 'new',          -- new, learning, known
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);

-- ============================================
-- VISTAS ÚTILES (SQL Views)
-- ============================================

-- Vista: Calificación promedio por materia
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

-- Vista: Progreso de usuario
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

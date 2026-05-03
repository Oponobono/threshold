---
sidebar_position: 2
---

# Database Schema & ERD

Este documento muestra la arquitectura relacional de la base de datos PostgreSQL de **Threshold**, gestionando usuarios, materias, y todas las entidades académicas.

## Entidad Relación (ERD)

```mermaid
erDiagram
    USERS ||--o{ SUBJECTS : "creates"
    USERS ||--o{ ACADEMIC_TERMS : "has"
    USERS {
        serial id PK
        varchar email "UNIQUE"
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar username
        varchar profile_picture_url
        varchar grading_scale
        numeric approval_threshold
        varchar major
        varchar university
        timestamp created_at
    }

    SUBJECTS ||--o{ ASSESSMENTS : "contains"
    SUBJECTS ||--o{ SCHEDULES : "has"
    SUBJECTS ||--o{ FLASHCARD_DECKS : "has"
    SUBJECTS ||--o{ RECORDINGS : "has"
    SUBJECTS ||--o{ SCANNED_DOCUMENTS : "has"
    SUBJECTS ||--o{ YOUTUBE_VIDEOS : "has"
    SUBJECTS ||--o{ STUDY_SESSIONS : "tracks"
    SUBJECTS {
        serial id PK
        integer user_id FK
        varchar name
        varchar professor
        varchar color
        varchar icon
        numeric target_grade
        timestamp created_at
    }

    ASSESSMENTS {
        serial id PK
        integer subject_id FK
        varchar title
        varchar type
        numeric weight_percentage
        numeric score
        numeric possible_score
        date date
        boolean is_completed
    }

    SCHEDULES {
        serial id PK
        integer subject_id FK
        varchar day_of_week
        time start_time
        time end_time
        varchar room
    }

    FLASHCARD_DECKS ||--o{ FLASHCARDS : "contains"
    FLASHCARD_DECKS {
        serial id PK
        integer subject_id FK
        integer user_id FK
        varchar title
        text description
        varchar share_pin "UNIQUE"
        timestamp created_at
    }

    FLASHCARDS {
        serial id PK
        integer deck_id FK
        text front
        text back
        varchar status "new, learning, review"
        timestamp next_review
        integer review_count
        timestamp created_at
    }

    RECORDINGS {
        serial id PK
        integer subject_id FK
        varchar local_uri
        varchar title
        integer duration_ms
        timestamp created_at
        text transcription
        text ai_summary
    }

    SCANNED_DOCUMENTS {
        serial id PK
        integer subject_id FK
        varchar local_uri
        varchar type "image/pdf"
        timestamp created_at
        text ocr_text
    }

    STUDY_SESSIONS {
        serial id PK
        integer user_id FK
        integer subject_id FK
        timestamp start_time
        timestamp end_time
        integer duration_minutes
        varchar mode "pomodoro, free"
    }

```

## Características Clave

1. **Eficiencia Relacional**: Cada tabla pertenece a un usuario (a través de `user_id` o derivado de `subject_id`).
2. **Sistema Colaborativo**: `FLASHCARD_DECKS` implementa un `share_pin` que permite el cruce de `user_id` para compartir recursos.
3. **Optimización**: Se usa `serial` para los ID's y se prefieren claves numéricas para asegurar búsquedas O(log N) rápidas en índices B-Tree.

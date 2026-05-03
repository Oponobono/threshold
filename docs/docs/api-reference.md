---
sidebar_position: 3
---

# Referencia de la API (REST)

La aplicación Threshold utiliza un **Backend Node.js/Express** para exponer servicios mediante una API RESTful. Toda la documentación interactiva de esta API está generada dinámicamente con **Swagger**.

## 🔌 Acceso a Swagger (Live Docs)

Si tienes el servidor backend ejecutándose, puedes acceder a la interfaz de Swagger UI para visualizar y probar todos los endpoints:

**👉 URL de Swagger UI**: `http://localhost:3000/api-docs`

*(Nota: Sustituye `localhost` por la IP local de tu máquina si estás accediendo desde la red, ej. `http://192.168.1.50:3000/api-docs`)*

---

## 🗂 Estructura Principal de Rutas

Todas las rutas de la API comienzan con `/api`. A continuación, se describen los módulos principales:

### `/api/auth`
- Maneja el ciclo de vida del usuario (Login, Registro, Recuperación de contraseña).
- Emite tokens (JWT si está configurado) o gestiona el estado de sesión.

### `/api/subjects`
- Creación (POST), lectura (GET), edición (PUT) y eliminación (DELETE) de materias (`Subjects`).
- Cada materia requiere un `user_id` asociado.

### `/api/flashcards`
- Modulo CRUD completo para mazos (`Decks`) y tarjetas (`Cards`).
- **Endpoint Especial**: Sistema de compartición. Permite asociar a otros usuarios mediante el uso de un `PIN` único generado por el propietario del mazo.

### `/api/scanned_documents` y `/api/gallery`
- Interacción con los recursos multimedia del estudiante.
- Guarda la URI local del almacenamiento del dispositivo en la base de datos (PostgreSQL), vinculando el archivo al usuario y materia correcta.
- **OCR Integrado**: Proporciona el texto extraído (`ocr_text`) de las imágenes o PDFs guardados para su uso posterior.

### `/api/audio`
- Guarda información de grabaciones de clase en formato `.m4a` (AAC).
- Contiene los campos de texto para **Transcripción** (Speech-to-Text) y **Resumen de IA** procesado por LLMs de Groq.

# Configuración de Variables de Entorno en Render

## Para el Backend (Node.js)

1. **Accede a tu servicio en Render:**
   - Ve a https://dashboard.render.com
   - Selecciona tu servicio backend (threshold-backend-cn82)

2. **Agregar variables de entorno:**
   - Click en "Environment" en el panel izquierdo
   - Click en "Add Environment Variable"

3. **Variables requeridas:**

   ```
   GROQ_API_KEY = YOUR_GROQ_API_KEY_HERE
   ```

   (Reemplaza con tu propia API key de Groq)

4. **Variables opcionales:**
   ```
   NODE_ENV = production
   PORT = 3000
   ```

5. **Guardar y redeploy:**
   - Click en "Save Changes"
   - Render redesplegará automáticamente el servicio

## Obtener una API Key de Groq

1. Ve a https://console.groq.com/
2. Login con tu cuenta (crea una si no tienes)
3. Click en "API Keys" en el sidebar izquierdo
4. Click en "Create API Key"
5. Copia la clave generada y pégala en Render

## Verificar que funciona

1. En Render, ve a "Logs"
2. Redeploy el servicio
3. Deberías ver que el servidor inicia correctamente
4. Prueba el endpoint `/flashcard-decks/generate-from-text` desde la app móvil

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA commits variables de entorno con secrets en Git
- Usa `.env` local + `.env.example` con placeholders
- En Render, configura variables de entorno en el dashboard

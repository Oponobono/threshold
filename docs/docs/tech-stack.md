---
sidebar_position: 1
---

# Tech Stack

Bienvenido a la documentación de **Threshold**. A continuación detallamos el stack tecnológico sobre el que se construye esta aplicación.

## 📱 Frontend (Mobile App)

El cliente principal de Threshold es una aplicación móvil multiplataforma desarrollada con:

- **[React Native](https://reactnative.dev/)**: Framework base para construir interfaces de usuario nativas.
- **[Expo](https://expo.dev/)**: Facilita el desarrollo, empaquetado y uso de APIs nativas (Cámara, FileSystem, Sharing).
- **[React Navigation](https://reactnavigation.org/)** / **Expo Router**: Enrutamiento basado en archivos para React Native.
- **[Zustand](https://zustand-demo.pmnd.rs/)**: Manejo de estado global rápido y ligero.
- **[React-i18next](https://react.i18next.com/)**: Motor de internacionalización y localización (Soporte actual para EN/ES).
- **[@shopify/react-native-skia](https://shopify.github.io/react-native-skia/)**: Renderizado gráfico 2D acelerado por hardware (usado para filtros de imagen OCR interactivos).
- **[pdf-lib](https://pdf-lib.js.org/)**: Manipulación y creación de archivos PDF a partir de imágenes escaneadas desde el dispositivo.

## ⚙️ Backend (API Server)

El servidor expone todas las APIs REST y se encarga de la integración con IA:

- **[Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)**: Servidor HTTP robusto y rápido.
- **[Swagger](https://swagger.io/)**: (A través de `swagger-ui-express`) para la auto-documentación viva de la API interactiva.
- **[Cors](https://www.npmjs.com/package/cors)**: Seguridad y manejo de control de acceso HTTP.

## 🗄️ Base de Datos

Threshold utiliza un modelo relacional estricto:

- **[PostgreSQL](https://www.postgresql.org/)**: Sistema de base de datos relacional principal.
- **[node-postgres (pg)](https://node-postgres.com/)**: Cliente no bloqueante para Node.js puro, optimizando queries directas (RAW SQL) para máximo rendimiento sin ORM overhead.

## 🤖 Servicios de IA (AI Modules)

- **[Groq API](https://groq.com/)**: Proveedor de LLM ultra rápido (LLaMA 3) utilizado para:
  - Generación automática de Flashcards a partir de texto o imágenes (OCR).
  - Resúmenes de grabaciones de voz y clases.
- **Google Generative AI / Vision**: (Según configuración local) para la extracción de texto a partir de imágenes mediante OCR.

## 🎨 Diseño UI/UX

- Paleta de Colores de MAPUVIA Corporativo (`Navy`, `Teal`, `Gold`).
- Sistema de animaciones fluidas (Reanimated, Lottie) para un UX premium (glassmorphism en modales, feedback con animaciones en flashcards).

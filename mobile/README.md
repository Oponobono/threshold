# Threshold Mobile (Expo)

Aplicación móvil/web para Threshold.

## Requisitos

- Node.js 18+
- npm
- Backend de Threshold ejecutándose en `../backend`

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

1. Inicia el backend (en otra terminal):

```bash
cd ../backend
node server.js
```

2. Inicia Expo (desde `mobile`):

```bash
npx expo start
```

Si cambias variables de entorno o configuración de red, reinicia Metro con caché limpia:

```bash
npx expo start --web -c
```

## Estrategia de red (estándar recomendado)

La app usa una estrategia mixta para evitar errores como `ERR_CONNECTION_TIMED_OUT` por IPs viejas.

### Web

- Usa automáticamente el host del navegador (`window.location.hostname`).
- No depende de una IP LAN fija para registrar/login.

### Dispositivo físico (Expo Go)

- Intenta primero la IP detectada por Expo (`hostUri`).
- Si no existe, usa `EXPO_PUBLIC_API_HOST` en `.env.local`.

## Variables de entorno

Archivo base: `.env.example`

```env
EXPO_PUBLIC_API_HOST=192.168.1.X
```

En tu `.env.local`, coloca la IP LAN actual de tu PC (la de `ipconfig`), por ejemplo:

```env
EXPO_PUBLIC_API_HOST=192.168.1.6
```

## Solución rápida de problemas

- Si web falla contra una IP vieja: reinicia Metro con `-c`.
- Si celular no conecta: verifica que PC y celular estén en la misma red Wi-Fi.
- Si backend responde en otro puerto, la app intenta `3000` y `3001` automáticamente.

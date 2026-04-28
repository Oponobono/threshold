@echo off
REM Script para ejecutar Expo con NODE_ENV correctamente configurado en Windows

set NODE_ENV=development
set EXPO_PUBLIC_API_URL=https://threshold-backend-cn82.onrender.com/api
set EXPO_PUBLIC_API_HOST=192.168.1.6
set EXPO_PUBLIC_GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE

echo ✓ Environment variables loaded
echo NODE_ENV=%NODE_ENV%
echo EXPO_PUBLIC_API_URL=%EXPO_PUBLIC_API_URL%
echo EXPO_PUBLIC_API_HOST=%EXPO_PUBLIC_API_HOST%
echo EXPO_PUBLIC_GROQ_API_KEY=%EXPO_PUBLIC_GROQ_API_KEY%
echo.

expo start %*

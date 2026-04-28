@echo off
REM Script para ejecutar Expo con NODE_ENV y variables de .env

REM Load environment variables from .env file
if exist .env (
  for /f "usebackq delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" (
      set "%%A=%%B"
    )
  )
  echo ✓ Environment variables loaded from .env
) else (
  echo ⚠ .env file not found. Copy .env.example to .env and fill in your values
  exit /b 1
)

echo NODE_ENV=%NODE_ENV%
echo EXPO_PUBLIC_API_URL=%EXPO_PUBLIC_API_URL%
echo EXPO_PUBLIC_API_HOST=%EXPO_PUBLIC_API_HOST%
echo EXPO_PUBLIC_GROQ_API_KEY configured
echo.

expo start %*

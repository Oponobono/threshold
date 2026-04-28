# Script PowerShell para ejecutar Expo con NODE_ENV correctamente configurado

$env:NODE_ENV = "development"
$env:EXPO_PUBLIC_API_URL = "https://threshold-backend-cn82.onrender.com/api"
$env:EXPO_PUBLIC_API_HOST = "192.168.1.6"
$env:EXPO_PUBLIC_GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE"

Write-Host "✓ Environment variables loaded" -ForegroundColor Green
Write-Host "NODE_ENV=$($env:NODE_ENV)"
Write-Host "EXPO_PUBLIC_API_URL=$($env:EXPO_PUBLIC_API_URL)"
Write-Host "EXPO_PUBLIC_API_HOST=$($env:EXPO_PUBLIC_API_HOST)"
Write-Host "EXPO_PUBLIC_GROQ_API_KEY=$($env:EXPO_PUBLIC_GROQ_API_KEY)"
Write-Host ""

& expo start @args

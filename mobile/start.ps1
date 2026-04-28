# Script PowerShell para ejecutar Expo con variables desde .env

# Load environment variables from .env file
if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -and -not $_.StartsWith("#")) {
      $name, $value = $_.Split("=", 2)
      if ($name) {
        Set-Item "env:$($name.Trim())" "$($value.Trim())"
      }
    }
  }
  Write-Host "✓ Environment variables loaded from .env" -ForegroundColor Green
} else {
  Write-Host "⚠ .env file not found. Copy .env.example to .env and fill in your values" -ForegroundColor Yellow
  exit 1
}

Write-Host "NODE_ENV=$($env:NODE_ENV)"
Write-Host "EXPO_PUBLIC_API_URL=$($env:EXPO_PUBLIC_API_URL)"
Write-Host "EXPO_PUBLIC_API_HOST=$($env:EXPO_PUBLIC_API_HOST)"
Write-Host "EXPO_PUBLIC_GROQ_API_KEY configured"
Write-Host ""

& expo start @args

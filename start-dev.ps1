# start-dev.ps1
# Script para iniciar servidor de desarrollo del proyecto

Write-Host ""
Write-Host "🚀 ========================================" -ForegroundColor Cyan
Write-Host "   GESTOR INVENTORY - Servidor Dev" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

Write-Host "📂 Directorio: $projectPath" -ForegroundColor Yellow
Write-Host "🌐 URL Local: http://127.0.0.1:5500" -ForegroundColor Green
Write-Host "🌐 URL Red: http://$(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*' | Select-Object -First 1 -ExpandProperty IPAddress):5500" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""

# Verificar si Live Server de VS Code está disponible
Write-Host "🔍 Detectando servidor disponible..." -ForegroundColor Cyan

# Opción 1: http-server (recomendado - más ligero)
if (Get-Command http-server -ErrorAction SilentlyContinue) {
    Write-Host "✅ Usando http-server (npm)" -ForegroundColor Green
    Write-Host ""
    http-server -p 5500 -c-1 --cors
}
# Opción 2: live-server
elseif (Get-Command live-server -ErrorAction SilentlyContinue) {
    Write-Host "✅ Usando live-server (npm)" -ForegroundColor Green
    Write-Host ""
    live-server --port=5500 --no-browser
}
# Opción 3: Usar npx si no hay nada instalado
else {
    Write-Host "⚙️  Instalando servidor temporal con npx..." -ForegroundColor Yellow
    Write-Host ""
    npx http-server@latest -p 5500 -c-1 --cors
}

Write-Host ""
Write-Host "👋 Servidor detenido" -ForegroundColor Yellow
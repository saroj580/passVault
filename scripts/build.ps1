# build.ps1 – full PassVault build pipeline
# Run from the repo root:  .\scripts\build.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root      = Split-Path $PSScriptRoot -Parent   # D:\PasswordVault
$Frontend  = Join-Path $Root 'frontend'
$Backend   = Join-Path $Root 'backend'
$Electron  = Join-Path $Root 'electron'
$Dist      = Join-Path $Root 'dist'
$Installer = Join-Path $Root 'installer'

function Step([string]$msg) {
    Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

# ── 1. Frontend build ─────────────────────────────────────────────────────────
Step '1/4  Building React frontend'
Push-Location $Frontend
npm run build
Pop-Location
if (-not (Test-Path (Join-Path $Frontend 'dist\index.html'))) {
    throw 'Frontend build failed – dist\index.html not found.'
}
Write-Host 'Frontend OK' -ForegroundColor Green

# ── 2. Backend exe ────────────────────────────────────────────────────────────
Step '2/4  Building backend.exe with PyInstaller'
Push-Location $Backend

# Remove old PyInstaller output so we start clean
Remove-Item -Recurse -Force dist, build -ErrorAction SilentlyContinue
Remove-Item -Force backend.spec -ErrorAction SilentlyContinue

$PyInstaller = Join-Path $Backend '.venv\Scripts\pyinstaller.exe'
if (-not (Test-Path $PyInstaller)) {
    Write-Host 'PyInstaller not found – installing into venv...' -ForegroundColor Yellow
    & (Join-Path $Backend '.venv\Scripts\pip.exe') install pyinstaller
}

& $PyInstaller `
    --name backend `
    --onedir `
    --noconsole `
    "--add-data=..\frontend\dist;frontend_dist" `
    run.py

Pop-Location

$BackendExe = Join-Path $Backend 'dist\backend\backend.exe'
if (-not (Test-Path $BackendExe)) {
    throw 'PyInstaller failed – backend.exe not found at: ' + $BackendExe
}
Write-Host "backend.exe OK  ($BackendExe)" -ForegroundColor Green

# ── 3. Electron packaging ─────────────────────────────────────────────────────
Step '3/4  Packaging Electron with electron-builder'
Push-Location $Electron
npm install
npm run dist
Pop-Location

$WinUnpacked = Join-Path $Dist 'electron-out\win-unpacked'
if (-not (Test-Path (Join-Path $WinUnpacked 'PassVault.exe'))) {
    throw 'Electron build failed – PassVault.exe not found in: ' + $WinUnpacked
}
Write-Host "Electron OK  ($WinUnpacked)" -ForegroundColor Green

# ── 4. NSIS installer ─────────────────────────────────────────────────────────
Step '4/4  Compiling NSIS installer'
$MakeNsis = 'C:\Program Files (x86)\NSIS\makensis.exe'
if (-not (Test-Path $MakeNsis)) {
    Write-Warning 'NSIS not found at default path. Skipping installer step.'
    Write-Warning 'Install NSIS from https://nsis.sourceforge.io/Download then re-run.'
} else {
    & $MakeNsis (Join-Path $Installer 'PassVault.nsi')
    $SetupExe = Join-Path $Dist 'PassVault-Setup.exe'
    if (Test-Path $SetupExe) {
        Write-Host "`nInstaller ready: $SetupExe" -ForegroundColor Green
    } else {
        throw 'NSIS compiled without error but PassVault-Setup.exe was not found.'
    }
}

Write-Host "`nAll steps complete." -ForegroundColor Green

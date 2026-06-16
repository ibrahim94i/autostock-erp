$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
$Backend = Join-Path (Split-Path -Parent $Root) 'autostock-backend'
$Node = 'C:\Program Files\nodejs\node.exe'
if (-not (Test-Path $Node)) { $Node = 'node' }

$ExeCandidates = @(
  (Join-Path $Root 'dist-electron\win-unpacked\AutoStock ERP.exe'),
  (Join-Path $Root 'dist-electron\AutoStock ERP 0.0.1.exe'),
  (Join-Path $Root 'dist-electron\AutoStock ERP 0.0.0.exe')
)
$Exe = $ExeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$MainJs = Join-Path $Backend 'dist\src\main.js'
if (-not (Test-Path $MainJs)) {
  [System.Windows.Forms.MessageBox]::Show(
    'Backend not built. Run: npm run build in autostock-backend',
    'AutoStock ERP',
    'OK',
    'Error'
  ) | Out-Null
  exit 1
}

function Test-Backend {
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 2
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

Get-Process -Name 'AutoStock ERP','AutoStock ERP 0.0.1','AutoStock ERP 0.0.0' -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue

if (-not (Test-Backend)) {
  Start-Process -FilePath $Node -ArgumentList $MainJs -WorkingDirectory $Backend -WindowStyle Hidden

  $deadline = (Get-Date).AddSeconds(45)
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    if (Test-Backend) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    [System.Windows.Forms.MessageBox]::Show(
      'Server failed to start. Check PostgreSQL is running.',
      'AutoStock ERP',
      'OK',
      'Error'
    ) | Out-Null
    exit 1
  }
}

if (-not $Exe) {
  [System.Windows.Forms.MessageBox]::Show(
    'App not found. Run: npm run electron:build',
    'AutoStock ERP',
    'OK',
    'Error'
  ) | Out-Null
  exit 1
}

Start-Process -FilePath $Exe

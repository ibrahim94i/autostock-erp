const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');

const BOOT_LOG = path.join(os.tmpdir(), 'autostock-boot.log');

try {
  fs.appendFileSync(BOOT_LOG, `[${new Date().toISOString()}] main.js loaded\n`);
} catch {
  // ignore
}

const isDev = process.env.NODE_ENV === 'development';
const BACKEND_PORT = process.env.PORT || '3000';
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

/** @type {import('child_process').ChildProcess | null} */
let backendProcess = null;
let backendStartedByApp = false;

function bootLog(message) {
  console.log(message);
  try {
    fs.appendFileSync(BOOT_LOG, `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // ignore logging failures
  }
}

function resolveBackendDir() {
  const candidates = [];

  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'backend'));
  }

  candidates.push(path.resolve(__dirname, '../../autostock-backend'));
  candidates.push(path.join(process.env.USERPROFILE || '', 'Desktop', 'autostock-backend'));

  for (const dir of candidates) {
    if (resolveBackendMainJs(dir)) return dir;
  }

  return candidates[0];
}

function resolveBackendMainJs(backendDir) {
  const candidates = [
    path.join(backendDir, 'dist', 'main.js'),
    path.join(backendDir, 'dist', 'src', 'main.js'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** @param {string} envPath */
function loadEnvFile(envPath) {
  /** @type {Record<string, string>} */
  const env = {};
  if (!fs.existsSync(envPath)) return env;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function resolveIndexHtml() {
  return path.join(__dirname, '../dist/index.html');
}

function probeBackend() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: Number(BACKEND_PORT),
        path: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength('{"username":"","password":""}'),
        },
        timeout: 3000,
      },
      (res) => {
        res.resume();
        resolve((res.statusCode ?? 0) > 0);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.write(JSON.stringify({ username: '', password: '' }));
    req.end();
  });
}

async function waitForBackend(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probeBackend()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function resolveNodeExecutable() {
  const candidates = [
    process.env.AUTOSTOCK_NODE,
    'C:\\Program Files\\nodejs\\node.exe',
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'nodejs', 'node.exe') : null,
    'node',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'node') return candidate;
    if (fs.existsSync(candidate)) return candidate;
  }
  return process.execPath;
}

function startBackend() {
  const backendDir = resolveBackendDir();
  const mainJs = resolveBackendMainJs(backendDir);
  const nodeExe = resolveNodeExecutable();
  const useElectronAsNode = nodeExe === process.execPath;

  bootLog(`[AutoStock] Backend dir: ${backendDir}`);
  bootLog(`[AutoStock] Backend entry: ${mainJs ?? 'NOT FOUND'}`);
  bootLog(`[AutoStock] Node executable: ${nodeExe}`);

  if (!mainJs) {
    bootLog('[AutoStock] Backend entry not found');
    return false;
  }

  const envFromFile = loadEnvFile(path.join(backendDir, '.env'));
  bootLog(`[AutoStock] Env keys loaded: ${Object.keys(envFromFile).join(', ') || 'none'}`);

  backendProcess = spawn(nodeExe, [mainJs], {
    cwd: backendDir,
    env: {
      ...process.env,
      ...envFromFile,
      ...(useElectronAsNode ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      NODE_ENV: 'production',
      PORT: BACKEND_PORT,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  backendStartedByApp = true;

  backendProcess.stdout?.on('data', (chunk) => {
    console.log('[Backend]', chunk.toString().trimEnd());
  });
  backendProcess.stderr?.on('data', (chunk) => {
    console.error('[Backend]', chunk.toString().trimEnd());
  });
  backendProcess.on('error', (err) => {
    console.error('[AutoStock] Backend spawn error:', err);
  });
  backendProcess.on('exit', (code) => {
    console.log('[AutoStock] Backend exited with code', code);
    backendProcess = null;
    backendStartedByApp = false;
  });

  return true;
}

function stopBackend() {
  if (backendProcess && backendStartedByApp && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
    backendStartedByApp = false;
  }
}

async function ensureBackendReady() {
  if (await probeBackend()) {
    bootLog(`[AutoStock] Backend already running on port ${BACKEND_PORT}`);
    return true;
  }

  const backendDir = resolveBackendDir();
  const mainJs = resolveBackendMainJs(backendDir);
  if (isDev || !mainJs) {
    bootLog('[AutoStock] Bundled backend unavailable — start manually (npm run start:dev)');
    return false;
  }

  bootLog('[AutoStock] Starting bundled backend...');
  if (!startBackend()) {
    return false;
  }

  const ready = await waitForBackend();
  if (!ready) {
    bootLog('[AutoStock] Backend failed to start within timeout');
  } else {
    bootLog('[AutoStock] Backend is ready');
  }
  return ready;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'AutoStock ERP',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  win.maximize();

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[AutoStock] did-fail-load:', errorCode, errorDescription, validatedURL);
  });

  if (isDev) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  } else {
    const indexPath = resolveIndexHtml();
    void win.loadFile(indexPath).catch((err) => {
      console.error('[AutoStock] loadFile failed:', indexPath, err);
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  if (isDev) {
    bootLog('[AutoStock] Dev mode — start backend manually (npm run start:dev)');
    return;
  }

  void (async () => {
    try {
      const ready = await ensureBackendReady();
      bootLog(`[AutoStock] Backend bootstrap finished: ${ready ? 'ready' : 'not ready'}`);
    } catch (err) {
      bootLog(`[AutoStock] ensureBackendReady error: ${String(err)}`);
    }
  })();
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

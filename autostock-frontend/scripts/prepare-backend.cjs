/**
 * Builds autostock-backend and stages production files for electron-builder extraResources.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(frontendRoot, '..', 'autostock-backend');
const outDir = path.join(frontendRoot, 'resources', 'backend');

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

if (!fs.existsSync(path.join(backendRoot, 'package.json'))) {
  console.error('[prepare-backend] autostock-backend not found at', backendRoot);
  process.exit(1);
}

console.log('[prepare-backend] Building backend...');
run('npm run build', backendRoot);
run('npx prisma generate', backendRoot);

console.log('[prepare-backend] Staging backend bundle...');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of ['package.json', 'package-lock.json']) {
  fs.copyFileSync(path.join(backendRoot, file), path.join(outDir, file));
}

fs.cpSync(path.join(backendRoot, 'dist'), path.join(outDir, 'dist'), { recursive: true });
fs.cpSync(path.join(backendRoot, 'prisma'), path.join(outDir, 'prisma'), { recursive: true });

const envSrc = path.join(backendRoot, '.env');
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, path.join(outDir, '.env'));
  console.log('[prepare-backend] Copied .env');
} else {
  console.warn('[prepare-backend] Warning: no .env found — database connection may fail in packaged app');
}

console.log('[prepare-backend] Installing production dependencies (may take a minute)...');
run('npm ci --omit=dev', outDir);
run('npx prisma generate', outDir);

console.log('[prepare-backend] Done →', outDir);

/**
 * Benchmark the 4 optimized endpoints (before/after deploy).
 */
const BASE = 'https://autostock-backend-production.up.railway.app';
const USER = 'admin';
const PASS = 'AuSt0ckPr0d2026SecureK7mN2xQ9';

const ENDPOINTS = [
  { name: 'GET /stock/balances', path: '/stock/balances?page=1&limit=15' },
  { name: 'GET /purchase-orders', path: '/purchase-orders?page=1&limit=10' },
  { name: 'GET /dashboard/summary', path: '/dashboard/summary' },
  { name: 'GET /products', path: '/products?page=1&limit=100' },
];

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

async function measure(token, { name, path }) {
  const headers = { Authorization: `Bearer ${token}` };
  const times = [];
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    const res = await fetch(`${BASE}${path}`, { headers });
    const ms = Math.round(performance.now() - start);
    if (!res.ok) throw new Error(`${name} failed: ${res.status}`);
    times.push(ms);
  }
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const min = Math.min(...times);
  return { name, path, runs: times, avgMs: avg, minMs: min };
}

async function main() {
  const label = process.argv[2] || 'run';
  console.log(`\n=== Benchmark (${label}) ===`);
  const token = await login();
  const results = [];
  for (const ep of ENDPOINTS) {
    const r = await measure(token, ep);
    results.push(r);
    console.log(`${r.name}: avg=${r.avgMs}ms min=${r.minMs}ms runs=[${r.runs.join(', ')}]`);
  }
  return results;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

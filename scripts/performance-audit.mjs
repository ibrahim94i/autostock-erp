/**
 * AutoStock ERP — Production Performance Audit
 * Measures real API latency against Railway backend.
 */
const BASE = 'https://autostock-backend-production.up.railway.app';
const USER = 'admin';
const PASS = 'AuSt0ckPr0d2026SecureK7mN2xQ9';

const results = [];

function isoNow() {
  return new Date().toISOString();
}

async function timed(label, method, path, options = {}) {
  const url = `${BASE}${path}`;
  const start = performance.now();
  const startTime = isoNow();
  let res;
  let error;
  try {
    res = await fetch(url, { method, ...options });
    if (!res.ok) {
      error = `${res.status} ${await res.text().catch(() => '')}`;
    }
  } catch (e) {
    error = e.message;
  }
  const end = performance.now();
  const endTime = isoNow();
  const durationMs = Math.round(end - start);
  const entry = {
    label,
    method,
    path,
    startTime,
    endTime,
    durationMs,
    status: res?.status ?? 0,
    error: error ?? null,
  };
  results.push(entry);
  return { entry, res, error };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

async function login() {
  const { res, error } = await timed('Login', 'POST', '/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (error || !res) throw new Error(`Login failed: ${error}`);
  const data = await res.json();
  return data.accessToken;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function runScreen(name, calls) {
  const screenStart = performance.now();
  const screenStartTime = isoNow();
  const callResults = [];
  for (const call of calls) {
    const r = await timed(`${name} → ${call.label}`, call.method, call.path, {
      headers: call.headers,
    });
    callResults.push(r.entry);
  }
  const screenEnd = performance.now();
  return {
    screen: name,
    startTime: screenStartTime,
    endTime: isoNow(),
    totalDurationMs: Math.round(screenEnd - screenStart),
    calls: callResults,
  };
}

async function main() {
  console.log('=== AutoStock ERP Performance Audit ===');
  console.log(`Backend: ${BASE}`);
  console.log(`Started: ${isoNow()}\n`);

  const token = await login();
  const h = authHeaders(token);

  // Warm-up (Railway cold start)
  await timed('Warm-up', 'GET', '/dashboard/summary', { headers: h });

  const screens = [];

  screens.push(
    await runScreen('Login (post-auth)', [
      { label: 'GET /settings', method: 'GET', path: '/settings', headers: h },
    ]),
  );

  screens.push(
    await runScreen('Dashboard', [
      { label: 'GET /dashboard/summary', method: 'GET', path: '/dashboard/summary', headers: h },
      { label: 'GET /settings', method: 'GET', path: '/settings', headers: h },
    ]),
  );

  screens.push(
    await runScreen('Products', [
      { label: 'GET /products?page=1&limit=10', method: 'GET', path: '/products?page=1&limit=10', headers: h },
      { label: 'GET /categories', method: 'GET', path: '/categories', headers: h },
    ]),
  );

  screens.push(
    await runScreen('Inventory', [
      { label: 'GET /locations', method: 'GET', path: '/locations', headers: h },
      { label: 'GET /stock/balances?page=1&limit=15', method: 'GET', path: '/stock/balances?page=1&limit=15', headers: h },
      { label: 'GET /stock/low-alerts', method: 'GET', path: '/stock/low-alerts', headers: h },
      { label: 'GET /products?page=1&limit=100', method: 'GET', path: '/products?page=1&limit=100', headers: h },
    ]),
  );

  screens.push(
    await runScreen('Purchasing', [
      { label: 'GET /purchase-orders?page=1&limit=10', method: 'GET', path: '/purchase-orders?page=1&limit=10', headers: h },
      { label: 'GET /locations', method: 'GET', path: '/locations', headers: h },
      { label: 'GET /suppliers?page=1&limit=100', method: 'GET', path: '/suppliers?page=1&limit=100', headers: h },
      { label: 'GET /products?page=1&limit=100', method: 'GET', path: '/products?page=1&limit=100', headers: h },
    ]),
  );

  screens.push(
    await runScreen('Customers', [
      { label: 'GET /customers?page=1&limit=20', method: 'GET', path: '/customers?page=1&limit=20', headers: h },
    ]),
  );

  // Simulate N+1 balance fetches for first page of customers
  const custRes = await fetch(`${BASE}/customers?page=1&limit=20`, { headers: h });
  const custData = await custRes.json();
  const customerIds = (custData.items ?? []).slice(0, 20).map((c) => c.id);
  for (const id of customerIds) {
    await timed('Customers N+1', 'GET', `/customers/${id}/balance`, { headers: h });
  }

  screens.push(
    await runScreen('Reports (Daily tab)', [
      { label: 'GET /reports/daily', method: 'GET', path: `/reports/daily?date=${todayIso()}`, headers: h },
      { label: 'GET /expenses', method: 'GET', path: `/expenses?page=1&limit=50`, headers: h },
      { label: 'GET /cash/today', method: 'GET', path: '/cash/today', headers: h },
    ]),
  );

  screens.push(
    await runScreen('Reports (Sales tab)', [
      { label: 'GET /reports/sales', method: 'GET', path: `/reports/sales?from=${monthStartIso()}&to=${todayIso()}&groupBy=day`, headers: h },
    ]),
  );

  screens.push(
    await runScreen('Reports (Products tab)', [
      { label: 'GET /reports/products', method: 'GET', path: `/reports/products?from=${monthStartIso()}&to=${todayIso()}`, headers: h },
    ]),
  );

  screens.push(
    await runScreen('Reports (Inventory tab)', [
      { label: 'GET /reports/inventory-movement', method: 'GET', path: `/reports/inventory-movement?from=${monthStartIso()}&to=${todayIso()}`, headers: h },
    ]),
  );

  screens.push(
    await runScreen('POS', [
      { label: 'GET /locations', method: 'GET', path: '/locations', headers: h },
      { label: 'GET /products?page=1&limit=20', method: 'GET', path: '/products?page=1&limit=20', headers: h },
      { label: 'GET /stock/balances?limit=200', method: 'GET', path: '/stock/balances?limit=200&page=1', headers: h },
    ]),
  );

  // Additional standalone endpoints
  const extras = [
    ['GET', '/suppliers?page=1&limit=20'],
    ['GET', '/receipts?page=1&limit=20'],
    ['GET', '/expense-categories'],
    ['GET', '/cash/today'],
    ['GET', '/activity-log?page=1&limit=20'],
    ['GET', '/activity-log/users'],
    ['GET', '/activity-log/event-types'],
  ];
  for (const [method, path] of extras) {
    await timed('Extra', method, path, { headers: h });
  }

  const report = {
    generatedAt: isoNow(),
    backend: BASE,
    frontend: 'https://autostock-frontend-one.vercel.app',
    allRequests: results,
    screens,
    summary: {
      totalRequests: results.length,
      slowest10: [...results].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10),
      screenTotals: screens.map((s) => ({
        screen: s.screen,
        totalDurationMs: s.totalDurationMs,
        classification:
          s.totalDurationMs < 200
            ? 'Excellent'
            : s.totalDurationMs <= 500
              ? 'Good'
              : 'Needs Optimization',
      })),
    },
  };

  const outPath = new URL('./performance-audit-results.json', import.meta.url);
  const fs = await import('fs');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('\n--- Screen Totals (sequential API load) ---');
  for (const s of report.summary.screenTotals) {
    console.log(`${s.screen.padEnd(28)} ${String(s.totalDurationMs).padStart(5)}ms  [${s.classification}]`);
  }
  console.log('\n--- Slowest 10 Endpoints ---');
  for (const e of report.summary.slowest10) {
    console.log(`${e.method} ${e.path.padEnd(45)} ${String(e.durationMs).padStart(5)}ms`);
  }
  console.log(`\nFull JSON: ${outPath.pathname}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

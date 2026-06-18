/**
 * Create AutoStock Backend monitor on UptimeRobot (free plan).
 *
 * Usage:
 *   set UPTIMEROBOT_API_KEY=your_main_api_key
 *   node scripts/setup-uptimerobot.mjs
 */
const API_KEY = process.env.UPTIMEROBOT_API_KEY;
const MONITOR_URL = 'https://autostock-backend-production.up.railway.app/health';
const FRIENDLY_NAME = 'AutoStock Backend';
const INTERVAL_SEC = 300; // 5 minutes (free plan minimum)

if (!API_KEY) {
  console.error('Missing UPTIMEROBOT_API_KEY environment variable.');
  console.error('Get it from: UptimeRobot → Integrations & API → API');
  process.exit(1);
}

async function apiCall(endpoint, params) {
  const body = new URLSearchParams({ api_key: API_KEY, format: 'json', ...params });
  const res = await fetch(`https://api.uptimerobot.com/v2/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return res.json();
}

async function main() {
  const account = await apiCall('getAccountDetails', {});
  if (account.stat !== 'ok') {
    console.error('Account error:', account);
    process.exit(1);
  }
  console.log('Account email:', account.account?.email ?? '(unknown)');

  const existing = await apiCall('getMonitors', {});
  const found = (existing.monitors ?? []).find(
    (m) => m.url === MONITOR_URL || m.friendly_name === FRIENDLY_NAME,
  );

  if (found) {
    console.log('Monitor already exists:', found.id, found.friendly_name, 'status:', found.status);
    console.log(JSON.stringify(found, null, 2));
    return;
  }

  const created = await apiCall('newMonitor', {
    type: '1',
    friendly_name: FRIENDLY_NAME,
    url: MONITOR_URL,
    interval: String(INTERVAL_SEC),
    timeout: '30',
  });

  if (created.stat !== 'ok') {
    console.error('Create failed:', created);
    process.exit(1);
  }

  console.log('Monitor created:', created.monitor?.id);
  console.log('Friendly name:', FRIENDLY_NAME);
  console.log('URL:', MONITOR_URL);
  console.log('Interval:', INTERVAL_SEC, 'seconds');

  const monitors = await apiCall('getMonitors', { monitors: String(created.monitor.id) });
  const mon = monitors.monitors?.[0];
  const statusLabel = mon?.status === 2 ? 'UP' : mon?.status === 9 ? 'DOWN' : `code ${mon?.status}`;
  console.log('Current status:', statusLabel);
  console.log(JSON.stringify(mon, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Create/update production "owner" role + user for client delivery.
 * Usage: node scripts/create-owner-user.mjs
 */
import bcrypt from 'bcryptjs';
import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:WnMOGkdVlvBVWuZzfkgYsuhrQyEcEOGw@switchback.proxy.rlwy.net:55788/railway';

const USERNAME = process.env.OWNER_USERNAME || 'owner';
const PASSWORD =
  process.env.OWNER_PASSWORD ||
  `QJ-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
const DISPLAY_NAME = process.env.OWNER_NAME || 'مالك قوة الجود';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let role = await client.query(`SELECT id FROM "Role" WHERE name = 'owner' LIMIT 1`);
    if (role.rows.length === 0) {
      role = await client.query(
        `INSERT INTO "Role" (id, name, permissions)
         VALUES (gen_random_uuid()::text, 'owner', $1::jsonb)
         RETURNING id`,
        [
          JSON.stringify({
            allOps: true,
            backupDownload: true,
            settings: false,
            resetData: false,
            restoreBackup: false,
          }),
        ],
      );
      console.log('Created role: owner');
    } else {
      console.log('Role owner already exists');
    }
    const roleId = role.rows[0].id;

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const existing = await client.query(
      `SELECT id FROM "User" WHERE username = $1 LIMIT 1`,
      [USERNAME],
    );

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO "User" (id, name, username, "passwordHash", "roleId", active)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, true)`,
        [DISPLAY_NAME, USERNAME, passwordHash, roleId],
      );
      console.log('Created user:', USERNAME);
    } else {
      await client.query(
        `UPDATE "User"
         SET name = $1, "passwordHash" = $2, "roleId" = $3, active = true
         WHERE username = $4`,
        [DISPLAY_NAME, passwordHash, roleId, USERNAME],
      );
      console.log('Updated user:', USERNAME);
    }

    await client.query('COMMIT');
    console.log('\n=== OWNER ACCOUNT (give to client) ===');
    console.log('username:', USERNAME);
    console.log('password:', PASSWORD);
    console.log('role: owner (ops + backup download only)');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

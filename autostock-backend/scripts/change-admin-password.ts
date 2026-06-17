import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createPgPool } from '../src/common/prisma/pg-pool';

const newPassword = process.env.NEW_ADMIN_PASSWORD ?? process.argv[2];
if (!newPassword || newPassword.length < 12) {
  console.error('Usage: npx ts-node scripts/change-admin-password.ts <password-min-12-chars>');
  process.exit(1);
}

async function main(): Promise<void> {
  const pool = createPgPool();
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { username: 'admin' },
    data: { passwordHash },
  });
  console.log('Admin password updated successfully.');
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

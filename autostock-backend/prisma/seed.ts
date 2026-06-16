import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const useSsl =
  process.env.NODE_ENV === 'production' ||
  process.env.DATABASE_URL?.includes('railway.app') ||
  process.env.DATABASE_URL?.includes('sslmode=');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useSsl && { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const accounts = [
  { code: '1000', name: 'Cash', type: 'ASSET' },
  { code: '1100', name: 'Inventory', type: 'ASSET' },
  { code: '1200', name: 'AccountsReceivable', type: 'ASSET' },
  { code: '2000', name: 'AccountsPayable', type: 'LIABILITY' },
  { code: '4000', name: 'Sales', type: 'REVENUE' },
  { code: '5000', name: 'COGS', type: 'EXPENSE' },
  { code: '4100', name: 'SalesReturns', type: 'REVENUE' },
  { code: '4200', name: 'InventoryGain', type: 'REVENUE' },
  { code: '5100', name: 'InventoryShrinkage', type: 'EXPENSE' },
];

const roles = [
  { name: 'admin', permissions: { all: true } },
  { name: 'cashier', permissions: { sales: true, customers: true, cash: true, receipts: true } },
  { name: 'warehouse', permissions: { inventory: true, products: true, purchasing: true } },
  {
    name: 'accountant',
    permissions: {
      cash: true,
      expenses: true,
      customers: true,
      receipts: true,
      reports: true,
      settings: false,
    },
  },
];

const demoUsers = [
  { username: 'admin', name: 'Admin', password: 'admin123', roleName: 'admin' },
  { username: 'cashier', name: 'Cashier', password: 'cashier123', roleName: 'cashier' },
  { username: 'warehouse', name: 'Warehouse', password: 'warehouse123', roleName: 'warehouse' },
  { username: 'accountant', name: 'Accountant', password: 'accountant123', roleName: 'accountant' },
];

async function main(): Promise<void> {
  for (const account of accounts) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }

  for (const role of roles) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name },
    });
    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: { permissions: role.permissions },
      });
    } else {
      await prisma.role.create({ data: role });
    }
  }

  for (const user of demoUsers) {
    const role = await prisma.role.findFirstOrThrow({
      where: { name: user.roleName },
    });
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        name: user.name,
        passwordHash,
        roleId: role.id,
        active: true,
      },
      create: {
        name: user.name,
        username: user.username,
        passwordHash,
        roleId: role.id,
        active: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });

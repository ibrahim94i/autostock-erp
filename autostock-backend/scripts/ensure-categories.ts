/**
 * Count categories; seed defaults if empty (car oils/filters shop).
 * Run: npx ts-node --compiler-options {"module":"CommonJS"} scripts/ensure-categories.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const DEFAULT_CATEGORIES = [
  'زيوت محركات',
  'فلاتر',
  'شحوم',
  'إكسسوارات',
];

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const existing = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    console.log(`\nCategories in DB: ${existing.length}\n`);

    if (existing.length > 0) {
      for (const cat of existing) {
        console.log(`  - ${cat.name} → ${cat.id}`);
      }
      return;
    }

    console.log('No categories found. Creating defaults...\n');
    for (const name of DEFAULT_CATEGORIES) {
      const cat = await prisma.category.create({ data: { name } });
      console.log(`  ✓ ${cat.name} → ${cat.id}`);
    }
    console.log('\nDone.\n');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

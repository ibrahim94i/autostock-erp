"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const DEFAULT_CATEGORIES = [
    'زيوت محركات',
    'فلاتر',
    'شحوم',
    'إكسسوارات',
];
async function main() {
    const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    const prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(pool) });
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
    }
    finally {
        await prisma.$disconnect();
        await pool.end();
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=ensure-categories.js.map
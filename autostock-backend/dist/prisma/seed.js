"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_pool_1 = require("../src/common/prisma/pg-pool");
const bcrypt = __importStar(require("bcryptjs"));
const pool = (0, pg_pool_1.createPgPool)();
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
async function main() {
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
        }
        else {
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
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map
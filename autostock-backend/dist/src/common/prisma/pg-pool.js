"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPgPool = createPgPool;
const pg_1 = require("pg");
function normalizeDatabaseUrl(url) {
    return url
        .replace(/([?&])sslmode=[^&]*&?/g, (_, sep) => (sep === '?' ? '?' : sep))
        .replace(/\?&/, '?')
        .replace(/[?&]$/, '');
}
function createPgPool() {
    const raw = process.env.DATABASE_URL ?? '';
    const connectionString = normalizeDatabaseUrl(raw);
    const useSsl = process.env.NODE_ENV === 'production' ||
        raw.includes('railway.app') ||
        raw.includes('sslmode=');
    const config = { connectionString };
    if (useSsl) {
        config.ssl = { rejectUnauthorized: false };
    }
    return new pg_1.Pool(config);
}
//# sourceMappingURL=pg-pool.js.map
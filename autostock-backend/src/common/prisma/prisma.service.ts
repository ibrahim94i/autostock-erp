import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function createPgPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  const useSsl =
    process.env.NODE_ENV === 'production' ||
    connectionString?.includes('railway.app') ||
    connectionString?.includes('sslmode=');
  return new Pool({
    connectionString,
    ...(useSsl && { ssl: { rejectUnauthorized: false } }),
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = createPgPool();
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  runInTransaction<T>(
    fn: (tx: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
    >) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn);
  }
}

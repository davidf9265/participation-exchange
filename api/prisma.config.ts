import { defineConfig } from 'prisma/config';

// DATABASE_URL is injected by docker compose; there is no .env loading here on purpose.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'] as string,
  },
});

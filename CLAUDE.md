# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small B2B marketplace where credit unions list loan participations for sale and other credit unions buy slices of them. It is the starting point for a 60-minute live coding exercise (see `README.md` for the stages and rules). There is no authentication: every request acts as Riverbend Federal Credit Union (`VIEWER_CU_ID = 'cu-riverbend'` in `api/src/viewer.ts`, mirrored by display-only `VIEWER_CU` in `web/src/lib/viewer.ts`).

## Commands

Everything runs through Docker Compose; no local Node/Postgres is needed. Setup: `cp .env.example .env && docker compose up` (migrations and seed run automatically on API start).

```bash
docker compose logs -f api|web      # follow logs
docker compose restart api          # restart one service
docker compose up --build           # rebuild after changing package.json
docker compose down -v              # stop and wipe the DB (seed only runs on an empty DB)
docker compose exec api sh
docker compose exec db psql -U marketplace -d marketplace
```

- Web: http://localhost:3000 (`/listings`, `/portfolio`); API: http://localhost:3001.
- Both services hot reload from bind-mounted `api/` and `web/`. `node_modules`, `api/dist` and `web/.next` are named volumes, so dependency changes need `--build`.
- There are no test or lint scripts and no test framework configured.
- After changing `api/prisma/schema.prisma`: `docker compose exec api npx prisma migrate dev --name <name>` (the container runs `prisma generate`, `migrate deploy`, `db seed` on every start).

## Architecture

**api/** — NestJS 11, Prisma 7 (`@prisma/adapter-pg`, Postgres 18). Feature modules in `src/listings`, `src/portfolio`, `src/prisma`. `npm run dev` compiles with `tsc` and runs `node --watch dist/main.js` (CJS output), so type errors surface in the `tsc` log stream. The Prisma client is generated into `api/src/generated/prisma` (gitignored; import types from `../generated/prisma/client`). `main.ts` enables CORS for any origin and a global `ValidationPipe({ transform: true, whitelist: true })`. Because of `whitelist: true`, query/body properties not declared on a DTO with class-validator decorators are silently dropped rather than rejected — new inputs need a DTO field.

**web/** — Next.js 16 App Router, React 19, no UI/state libraries. Pages (`src/app/listings`, `src/app/portfolio`) are client components that call the API directly from the browser through `getJson` in `src/lib/api.ts`, using `NEXT_PUBLIC_API_URL` (the host-side URL, not the compose-internal one). Shared types (`Listing`, `Participation`, ...) are hand-maintained in `src/lib/api.ts`, not generated from the API — keep them in sync with the Prisma models/responses.

**Data model** (`api/prisma/schema.prisma`): `CreditUnion` → `Listing` (seller, `principalAmount`, `remainingAmount`, `yieldRate`, `termMonths`, `riskGrade` A–D, `status` OPEN/FUNDED) → `Participation` (buyer CU, `amount`). Money and rates are `Decimal` columns, which Prisma serializes as **strings** in JSON; the web side converts via helpers in `web/src/lib/format.ts` (`toNumber`, `formatCompactMoney`, ...) rather than doing arithmetic on the strings. Server-side, use Prisma `Decimal` math for amounts, not JS floats.

## Conventions

- `.env` is gitignored and not committed; `.env.example` is the template.
- The folder ships without git history (`git init` is the user's first step), so don't assume a repo exists.
- Web code uses tab indentation and double quotes; API code uses 2-space indentation and single quotes — match the surrounding file.

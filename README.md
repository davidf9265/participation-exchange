# Participation Exchange — live coding exercise

A small B2B marketplace where credit unions list loan participations for sale and other
credit unions buy slices of them. This repository is the starting point for a 60 minute
live coding session.

---

## Step 1 — get it running (do this before the session)

This is the only preparation we ask for, and it is part of the exercise: if the stack
does not come up on your machine, tell us **before** the session so we can sort it out
instead of burning session time on Docker.

```bash
cp .env.example .env
docker compose up
```

The first run builds the images, applies the database migrations and seeds the database.
Give it a couple of minutes. It is ready when you see:

```
api-1  | API listening on http://localhost:3001
web-1  | ✓ Ready in ...
```

Then open:

| What                             | URL                              |
| -------------------------------- | -------------------------------- |
| Marketplace (participations for sale) | http://localhost:3000/listings   |
| Portfolio (what you already own) | http://localhost:3000/portfolio  |
| The API behind those pages       | http://localhost:3001/listings   |

Sanity check from a terminal. Run **both** commands — the first proves the containers are
yours and healthy, the second proves the API answers:

```bash
docker compose ps          # all three services must say "running"
curl -s http://localhost:3001/listings | head -c 200
```

A JSON array of listings **and** three running services means you are ready. Do not trust
the `curl` on its own: if something unrelated on your machine is already serving port 3001,
you will get a perfectly good JSON response while your own stack is down.

### Requirements

- Docker Desktop (or Docker Engine) with Compose v2+, **started** — check with `docker info`
- Ports `3000` and `3001` free

Nothing else. You do not need Node, npm, Postgres or Prisma installed locally.

### If a port is already taken

`docker compose up` aborts on the first collision, so nothing starts. To find the holder:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

Port `5432` is the easy case: the app reaches Postgres over the compose network, so the
published port is only for connecting from your host. If you already run Postgres locally,
set a different one in your `.env` and carry on:

```bash
echo 'DB_PORT=55432' >> .env
```

Ports `3000` and `3001` do have to be free — the browser talks to both directly. If you
cannot free them, tell us before the session.

---

## The session — 60 minutes, four stages

Read this so you know the shape of the session. Do **not** start on the stages before we
meet; we want to watch the work happen, not review a finished result. We open with two
minutes of framing, so the clock below starts when we do.

### Stage 1 · Diagnose · 0–10 min · **all AI assistants closed**

The filters on the Marketplace page do not filter. Pick a risk grade and the list does
not change.

Your job in these eight minutes is **not** to fix it. It is to:

1. Reproduce it.
2. Say out loud what you observe — precisely, not "it's broken".
3. State a hypothesis about where the problem is and why.
4. Say how you would confirm that hypothesis before changing any code.

Then confirm it. Talk the whole way through. We are hiring for how you corner a problem
you have never seen, so the reasoning matters far more than the speed. Your editor, your
terminal and the browser devtools are all fair game — Claude Code, Copilot, Cursor and
friends are not, until stage 2.

### Stage 2 · Fix · 10–20 min · AI allowed from here on

Fix it properly. Be ready to say why your fix is the right layer to fix it at, and what
else in the codebase has the same shape of problem.

### Stage 3 · Build · 20–45 min

Implement buying a participation. Four things are in scope:

- **`POST /listings/:id/participations`** — buy a slice of a listing.
- A way to start a purchase **from the Marketplace page** and enter an amount. How that
  looks is your call — a row action, a dialog, whatever you would ship.
- The amount must be validated against how much of that listing is still available.
- A successful purchase reduces the listing's remaining amount, and the new position shows
  up on the Portfolio page.

And one thing is explicitly optional:

- **Stretch** — the **projected yield** of the new position over the life of the loan, on
  the Portfolio page. Only reach for it if the four above are done; we would rather see
  those four solid than five things half-finished.

Right now nothing in the UI can start a purchase, so that part is on you too — an endpoint
you can only reach with `curl` is not done.

You are buying on behalf of Riverbend Federal Credit Union — the credit union named in
the top bar. There is no login to worry about.

Use Claude Code however you normally would. One rule: **state your plan before you
prompt.** We want to hear the plan you are delegating, not watch you read the output and
find out what you asked for. We will ask you for it at minute 18, before you open
anything.

### Stage 4 · Walk your diff · 45–58 min

Walk us through what you built, as if you were the reviewer on the PR. Where is it
solid, where is it thin, what would you not ship to production as is, and what would you
do about it. This is the part of the session we protect: it carries as much weight as the
code.

### Questions · 58–60 min

Yours, about us.

### The cut rule

At minute 45 we stop coding regardless of where you are, and you narrate the rest of the
plan. In 25 minutes most people do not finish, and that is by design — running out of time
is expected and is not a negative signal. Not knowing what you would have done next is.

---

## Working in the repo

Both services hot reload — edit a file under `api/src` or `web/src` and the running
container picks it up. No rebuild needed.

```bash
docker compose logs -f api        # follow API logs
docker compose logs -f web        # follow web logs
docker compose restart api        # restart just the API
docker compose down               # stop everything
docker compose down -v            # stop and wipe the database
docker compose up --build         # rebuild after changing package.json
```

To open a shell inside a service, or a psql session:

```bash
docker compose exec api sh
docker compose exec db psql -U marketplace -d marketplace
```

## Layout

```
api/                        NestJS 11 · TypeScript
  prisma/schema.prisma        data model
  prisma/seed.ts              seed data
  src/listings/               listings resource
  src/portfolio/              portfolio resource
  src/prisma/                 Prisma module
web/                        Next.js 16 · App Router · TypeScript
  src/app/listings/           Marketplace page
  src/app/portfolio/          Portfolio page
  src/components/             shared components
  src/lib/                    API client and formatters
```

| Service | Tech                                | URL                    |
| ------- | ----------------------------------- | ---------------------- |
| `web`   | Next.js 16 (App Router, TypeScript) | http://localhost:3000  |
| `api`   | NestJS 11 (TypeScript)              | http://localhost:3001  |
| `db`    | PostgreSQL 18 + Prisma 7            | `localhost:5432`       |

## Notes

- There is no authentication. Every request is served on behalf of one credit union,
  Riverbend Federal Credit Union, whose portfolio you see on `/portfolio`.
- All amounts are USD.
- The seed only runs against an empty database. Use `docker compose down -v` to start
  from scratch.

## Version control

This folder ships without git history, so initialise it once when you unzip — before the
session, together with the setup above:

```bash
git init && git add -A && git commit -m "Starting point"
```

That gives you a clean baseline to diff against during the session, which you will want in
the last stage when you walk us through your changes.

## Submitting your work

At the end of the session:

```bash
git add -A
git commit -m "Live coding session"
git bundle create session.bundle --all
```

Send us `session.bundle`. There is no remote configured and nothing to push.

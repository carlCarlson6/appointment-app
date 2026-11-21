# Bookr — Appointment App for Businesses

A full-stack appointment booking app. Business owners define their availability
and block already-taken spots; clients book anonymously via a public link —
no account required.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind) — web app + REST API
- **Clerk** — authentication for business owners (clients are anonymous)
- **Postgres** — local via Docker Compose, **Neon** in production
- **Drizzle ORM** — schema, migrations (`drizzle-kit`), typed queries
- **Resend** — email confirmations/cancellations (optional in dev)
- **Vitest** — unit tests for the slot engine

The REST API under `/api` is plain JSON so a future mobile app (Expo/React
Native) can consume the exact same backend.

## Quick start

```bash
npm install

# 1. Environment
cp .env.example .env.local
#    - Clerk: run `npx clerk@latest init` (writes dev keys) or add your own
#    - DATABASE_URL: already points at the local docker Postgres below
#    - RESEND_API_KEY: optional — emails are logged and skipped without it

# 2. Database + app (both in Docker)
docker compose up

# 3. In another terminal: apply migrations + seed the demo business
npm run db:migrate
npm run db:seed

# 4. Open
#    http://localhost:3000              landing page
#    http://localhost:3000/b/demo       demo booking page (from the seed)
#    http://localhost:3000/dashboard    owner area (sign in first)
```

> The `app` container mounts your source and runs `next dev` with hot reload.
> You can also skip the app container and run `npm run dev` on the host — the
> database container alone is enough for that.

## Database

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Generate SQL migrations from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:seed` | Seed the demo business (`/b/demo`) |
| `npm run db:studio` | Open Drizzle Studio |

Local dev uses `postgresql://app:app@localhost:5432/appointment` (the compose
`db` service). For production, point `DATABASE_URL` at your **Neon pooled
connection string** — the `postgres` driver works with both.

## Data model

- **businesses** — owner (Clerk user ID), name, unique slug, timezone,
  slot-grid step, advance-booking window
- **services** — name, description, duration, optional price, active flag
- **weekly_hours** — one row per open weekday (`dayOfWeek`, `openTime`, `closeTime`)
- **date_overrides** — per-date exceptions: `blocked` (closed day) or
  `hours` (custom hours replacing the weekly schedule)
- **bookings** — service, start/end (UTC), client name/email/phone, status,
  public `cancelToken`; unique index prevents two confirmed bookings at the
  same start time
- **blocked_slots** — owner-marked unavailable time ranges ("already booked
  offline", breaks, …)

The slot engine (`src/lib/slots.ts`) combines weekly hours + overrides, grids
them into slots, and subtracts bookings and blocks. The same pure function
powers the public availability API, booking validation, and the owner
calendar. Times are stored in UTC; availability is authored in the business
timezone; clients see their local time.

## API

**Public (no auth)**
| Endpoint | Description |
| --- | --- |
| `GET /api/businesses/[slug]` | Business + services |
| `GET /api/businesses/[slug]/availability?serviceId&days` | Bookable slots grouped by date |
| `POST /api/businesses/[slug]/bookings` | Create a booking |
| `GET /api/bookings/[token]` | Booking details (confirmation page) |
| `POST /api/bookings/[token]/cancel` | Client cancels (link from email) |

**Owner (Clerk session required)**
| Endpoint | Description |
| --- | --- |
| `GET/POST /api/me/businesses` | List / create businesses |
| `GET/PATCH/DELETE /api/me/businesses/[id]` | Manage a business |
| `GET/POST /api/me/businesses/[id]/services` · `PATCH/DELETE …/[serviceId]` | Manage services |
| `GET/PUT /api/me/businesses/[id]/schedule` | Read / replace weekly hours |
| `GET/POST /api/me/businesses/[id]/overrides` · `DELETE …/[overrideId]` | Date exceptions |
| `GET/POST /api/me/businesses/[id]/blocks` · `DELETE …/[blockId]` | Blocked slots |
| `GET /api/me/businesses/[id]/bookings` | List bookings (`?from&to&status`) |
| `POST /api/me/businesses/[id]/bookings/[bookingId]/cancel` | Cancel for a client |

## Tests

```bash
npm test   # vitest — slot engine unit tests
```

## Production

Deploy to Vercel, set `DATABASE_URL` to the Neon pooled connection string and
add your Clerk production keys, then `npm run db:migrate` (pointed at Neon).
Emails need `RESEND_API_KEY` + a verified `EMAIL_FROM` domain.

Clerk note: dev keys are temporary. Run `npx clerk@latest auth login` to claim
the app, then `npx clerk@latest deploy` for production configuration.

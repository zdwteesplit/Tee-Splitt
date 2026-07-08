# Tee Split

A no-login golf buddy-trip tool for splitting costs, tracking side bets, and keeping
hole-by-hole scores. This pass covers the foundation: trip creation/join, and the
player list. See `tee-split-spec.pdf` for the full build spec and `tee-split.tsx` for
the reference implementation (source of truth for UX and calculations).

## Stack

- **Framework:** Next.js (App Router)
- **Database:** Supabase (Postgres)
- **Hosting:** Vercel

No auth for v1 — a trip is accessed via its 5-character code / invite link. Anyone
with the link can view and edit.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql` (creates `trips` and `players` only —
   expenses/rounds/sidebets are added in a later pass).
3. From **Project Settings → API**, grab the **Project URL** and the
   **service_role** secret key (not the anon key — the API routes run server-side
   and use the service role key, since access control for v1 is the trip code
   itself, not Supabase RLS).

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the two values from step 1:

```bash
cp .env.example .env.local
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add the same two environment variables (`SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`) under **Project Settings → Environment Variables**.
3. Deploy. No build configuration changes are needed.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/trips` | Create a trip, returns a generated code |
| GET | `/api/trips/[code]` | Fetch a trip and its players |
| PATCH | `/api/trips/[code]` | Update trip name/dates |
| POST | `/api/trips/[code]/players` | Add a player |
| DELETE | `/api/trips/[code]/players/[id]` | Remove a player |

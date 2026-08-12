---
name: trainers-tab
description: >-
  Build or update SportSync Trainers tab (discovery + elite profile detail).
  Use when working on /trainers routes, coach cards, lesson booking, trainer
  seeds, or porting trainer_discovery_updated_branding / elite_trainer_profile_updated_branding Stitch HTML.
---

# Trainers Tab (SportSync)

## Scope

| Route | Stitch design folder | Purpose |
| --- | --- | --- |
| `/trainers` | `trainer_discovery_updated_branding/code.html` | Coach discovery — search, sport chips, staggered glass cards |
| `/trainers/[id]` | `elite_trainer_profile_updated_branding/code.html` | Coach profile — hero, stats, philosophy, credentials, lesson sidebar, bottom CTAs |

## Architecture (mirror Events/Venues)

- **Page**: Server Component in `app/trainers/` — auth gate, fetch data, compose layout.
- **Data**: `lib/data/trainers.ts` — Supabase REST queries on `profiles` (role `COACH`) + nested `training_lessons`.
- **Components**: `components/trainers/*` — presentational; client only for search/filters/booking.
- **Booking**: `POST /api/lessons/[id]/book` + `BookButton` client component.

## Design tokens

Reuse existing Tailwind tokens from `tailwind.config.ts` and utilities in `app/globals.css` (`glass-card`, `glass-panel`, `gradient-text`, `search-glass`). Do **not** invent new color hex values from the Stitch HTML — map to existing tokens.

## Schema reality (no extra columns)

`profiles` has: `full_name`, `username`, `avatar_url`, `city`, `latitude`, `longitude`, `karma_score`, `season_pts`, `role`.

There is **no** bio, headline, years-of-experience, or credentials column. Substitute as follows:

| Stitch mockup field | Real data source |
| --- | --- |
| Rating (4.9) | `min(karma_score / 20, 5)` formatted to 1 decimal |
| Years exp | `max(1, floor(total_lessons / 40))` or showcase static copy |
| Specialty / title | Primary sport label, e.g. `"Master Strength Coach"` for showcase seed |
| Sessions count | Count of `training_lessons` (all statuses) or upcoming only |
| Philosophy / credentials | Static copy for `SHOWCASE.coachId` only; omit or generic one-liner for others |
| Distance | Haversine from viewer `latitude`/`longitude` to coach coords |

## Files you own

```
app/trainers/page.tsx
app/trainers/[id]/page.tsx
lib/data/trainers.ts
components/trainers/*
prisma/seed/showcase-trainer.ts   (showcase coach + lessons)
lib/demo/showcase.ts              (SHOWCASE.coachId + demo card)
```

Do **not** modify unrelated tabs, `tailwind.config.ts`, or Prisma schema unless explicitly asked.

## Showcase seed

Fixed coach ID: `SHOWCASE.coachId` (`00000000-0000-4000-a000-000000000501`).

Seed `Marcus Vance` — elite COACH at Bratislava with 2+ upcoming lessons at `SHOWCASE.venueId`, high karma, avatar from Stitch HTML. Register in `SHOWCASE_CARDS` on `/demo`.

## Reference reads (in order)

1. `trainer_discovery_updated_branding/code.html` or `FrontEnd/trainer_discovery_updated_branding/code.html`
2. `elite_trainer_profile_updated_branding/code.html`
3. `app/venues/page.tsx` + `app/events/page.tsx` (auth + layout patterns)
4. `lib/data/trainers.ts`

## Verification

```bash
npx tsc --noEmit
```

Manual: `/trainers`, `/trainers/{showcase-coach-id}`, `/demo` card link.

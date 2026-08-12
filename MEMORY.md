# SportSync Memory

## Implemented Features (from VISION.md / PLAN.md)

### 1. Geolocation & Locality Optimization
- `app/api/feed/route.ts` filters events/lobbies/tournaments by a 20km bounding box
  with a 50km fallback and city-wide fallback.
- `app/api/venues/route.ts` (NEW) public venue discovery with the same 20km → 50km →
  city fallback logic, plus optional `?sport=` and `?city=` filters.
- `lib/geo.ts` provides `boundingBox`, `distanceKm`, `DEFAULT_RADIUS_KM` (20),
  `EXTENDED_RADIUS_KM` (50).

### 2. Bratislava Leaderboards for Športoviská (venues)
- `lib/data/bratislava-leaderboard.ts` (NEW) aggregates Bratislava venue metrics
  (events, registrations, unique players, fill rate) into a composite score.
- `app/api/leaderboard/bratislava/route.ts` (NEW) GET endpoint, `?limit=` (max 50).
- `components/home/BratislavaVenueLeaderboard.tsx` (NEW) + integrated into
  `app/leaderboard/page.tsx`.

### 3. Intelligent Mercenary Flow
- `profiles.mercenary_sports` (TEXT[]) added via migration
  `prisma/migrations/20260720_mercenary_optin/migration.sql` + Prisma schema.
- `lib/matching/mercenary.ts` (NEW) `broadcastMercenarySos` finds nearby opted-in
  mercenaries and creates `match_suggestions` with `reason='mercenary'`.
- `app/api/lobbies/mercenary/route.ts` (NEW) POST endpoint to broadcast an SOS.
- `lib/matching/auto-match.ts` now accepts `prioritizeMercenaries` and auto-broadcasts
  the SOS when a mercenary-mode lobby is created (`app/api/lobbies/route.ts`).
- UI: `components/lobby/LobbyActions.tsx` host "Broadcast Mercenary SOS" button;
  `components/profile/MercenaryOptIn.tsx` opt-in toggles on the profile page.

## Conventions
- DB is a LIVE Supabase Postgres; snake_case columns mapped via `@map`. New columns
  need both a Prisma schema change AND a SQL migration file under `prisma/migrations`.
- Match suggestions use `reason` to differentiate 'nearby' vs 'mercenary'.

### 4. AI-Driven Event Factory (Venue Owner) — VISION.md pillar 3
- `events.raw_brief` (TEXT), `events.photos` (TEXT[]), `events.ai_enriched` (BOOL)
  added via migration `prisma/migrations/20260720_event_factory/migration.sql` + schema.
- `event_sponsors` table (id, event_id FK cascade, name, logo_url, website_url, tier).
- `lib/ai/event-enrich.ts` (`enrichEvent`): turns raw brief + photo URLs into a
  publish-ready page (title/description/tags/promoCopy/socialPost) via OpenAI with a
  deterministic heuristic fallback.
- `app/api/ai/events/ingest/route.ts` now accepts `photos`, `sponsors`, `rawBrief`
  and persists them, marking `ai_enriched=true`.
- `app/api/manage/venues/[id]/events/route.ts` POST: VENUE_OWNER creates an official
  event from structured fields + photos + sponsors, runs the enrichment pass.

### 5. Structured Text Extraction & Dynamic Sport-Specific UI (AI Event Factory v2)
- Migration `prisma/migrations/20260720_event_structured/migration.sql` + schema adds to
  `Event`: `sportType` (enum PADEL/TENNIS/FOOTBALL/BASKETBALL/ATLETIKA/OTHER),
  `priceCents` (Int), `currency` (String), `eventDate`/`startTime`/`endTime` (Timestamptz),
  `maxParticipants` (Int), `entryRequirements` (Text), `themeConfig` (Json), `sponsorsJson` (Json).
- `lib/ai/event-parse-structured.ts` (`parseStructuredEventIntent`): OpenAI JSON-Schema
  output that extracts location, schedule, price, sportType, rules/schedule, and a
  `themeConfig` (accent color, gradient, sport-specific tab labels) + `sponsors` from a
  raw brief (+ optional photos). Deterministic heuristic fallback when no API key.
- `lib/ai/theme-config.ts` maps each `sportType` to a default `ThemeConfig` (accent,
  accentSoft, gradient, tabs, label). Client mirror: `lib/ai/theme-config-client.ts`.
- `POST /api/events/parse-intent` (NEW): public-ish endpoint (auth optional) that returns
  `{ intent }` from a brief; used by `VenueEventCreator` to prefill the draft.
- `app/api/manage/venues/[id]/events/route.ts` POST now fills all structured fields
  (falls back to AI parse when `rawBrief` present but structured fields missing).
- Frontend dynamic UI:
  - `components/events/EventCard.tsx`: left accent bar + CTA button + sport-type badge
    use `themeConfig.accent` via `resolveTheme`.
  - `app/events/[id]/page.tsx`: gradient header, sport-specific Tabs (from `themeConfig.tabs`),
    accent-colored icons/buttons, premium Sponsors wall (merges `event_sponsors` +
    `sponsorsJson`), Entry Requirements + Gallery sections, price shown from `priceCents`/`currency`.
  - `lib/data/events.ts` `EventCardData`/`EventDetailData` expose the new fields;
    `getEventById` + feed mappers populate them (also updated in `lib/data/homepage.ts`).
- `components/events/VenueEventCreator.tsx` now calls `/api/events/parse-intent` and
  forwards `sportType`, `priceCents`, `currency`, `eventDate`, `startTime`, `endTime`,
  `maxParticipants`, `entryRequirements`, `themeConfig`, `sponsorsJson` to the factory.

### 5. Mixed Event Feed (70% match / 30% discovery) — silent
- `lib/feed/mix-discovery.ts` — `mixMatchDiscoveryFeed`: when sports/venues are set,
  feed is ~70% strict match + ~30% area-scoped discovery (ignores sport/venue).
- No toggle, no badges, no URL flag — users just see a natural feed.
- Wired in `app/events/page.tsx` + homepage `applyFeedFilters`.

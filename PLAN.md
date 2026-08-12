# Atmosphere Cover Factory (rights-safe, venue-unique, reusable)

## Goal

Tab backgrounds that:
- **Do not use venue/athlete photos** (no image rights asks, no GDPR face/photo risk).
- Are **unique per venue + event identity** (Form Factory Power Yoga ≠ Fitup Power Yoga).
- Are **reused** when the same event returns at the same venue (weekly yoga → same cover).

## Cache key (deterministic)

```
coverKey = sha256(venueId + "|" + sport + "|" + normalizeTitle(title))
```

- `normalizeTitle`: lowercase, strip dates/times/emoji, collapse whitespace  
  e.g. `"Power Yoga — 3 Aug"` → `"power yoga"`
- Same venue + same sport + same normalized title → **hit cache, reuse URL**
- Different venue → different key → **different image**

Optional later: drop title and use only `venueId|sport` for coarser reuse.

## Generation approach (v1 — recommended)

**Procedural composit** (no paid image API required for v1):

1. Own/SportSync sport base plates (abstract/illustrated, or our licensed Unsplash set used as *SportSync assets*, not venue photos).
2. Tint / pattern seed from `coverKey` (hue, gradient angle, grain) so FormFactory vs Fitup look different even for same sport.
3. Optional: small venue **wordmark / favicon logo** corner badge (public brand mark, not a venue photo of people).
4. Render with `sharp` → WebP → upload Supabase Storage bucket `event-covers/`.
5. Persist URL on `events.cover_url` (and tournaments) when generated; also keep a tiny cache table or storage path `covers/{coverKey}.webp` for idempotent reuse.

**v2 (optional):** OpenAI Images only when composit looks too plain — still keyed by `coverKey`, never store third-party venue photography.

## Pipeline

1. On event create / scrape upsert / first feed render miss:
   - compute `coverKey`
   - if Storage object exists → use that URL
   - else generate → upload → set `cover_url`
2. Atmosphere tabs: prefer `cover_url`; never fall back to scraped venue gallery photos.
3. Scrapers: stop copying third-party hero photos into `cover_url` (or overwrite with factory).

## Files (planned)

- `lib/media/cover-factory.ts` — key, normalize, composit, upload
- `lib/media/sport-plates.ts` — sport base assets (local `/public/covers/sports/…`)
- Wire: scrape upsert + event create paths
- Atmosphere tabs already use `coverUrl` first — keep that

## Out of scope (v1)

- Stitch MCP
- Live AI per request on every page view
- Asking venues for photo rights

## Confirm before coding

1. Cache grain: **venue + sport + normalized title** (recommended) vs only **venue + sport**?
2. v1 composit only, or jump straight to AI Images?

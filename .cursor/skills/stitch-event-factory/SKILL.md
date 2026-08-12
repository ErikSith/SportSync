---
name: stitch-event-factory
description: >-
  Use Google Stitch MCP to design event/tournament pages from real SportSync
  data (organizer, venue, datetime, sport, capacity, sponsors). Trigger when
  creating or redesigning /events, /tournaments, VenueEventCreator,
  TournamentCreator, Event Factory enrichment, or promotional event banners.
---

# Stitch Event Factory (SportSync × Google Stitch MCP)

## Goal

When writing or redesigning a **new event** or **tournament** surface, do **not** invent UI from scratch in code first. Pull structured facts from SportSync (or the organizer brief), then call **Google Stitch MCP** to generate a design proposal. Port the result into Next.js using existing Apex Elite tokens.

## When this applies

- New / updated event detail, create, or promo banner UI
- New / updated tournament detail, bracket landing, or create flow
- AI Event Factory outputs that need a visual page (`enrichEvent`, venue official events)
- User asks to “navrhni”, “dizajn”, “Stitch”, or “banner” for an event/tournament

## Prerequisites

1. Stitch MCP server must be connected (Cursor Settings → MCP → `stitch` / `user-stitch` green).
2. Discover tools with `GetMcpTools` on that server before calling them.
3. Typical tools (names may vary by package): `list_projects`, `create_project`, `generate_screen_from_text` / `generate_screen`, `get_screen`, `fetch_screen_code`, `fetch_screen_image`, `extract_design_context`.

If Stitch MCP is **not** in the available servers list, stop and tell the user to enable/restart the Stitch MCP. Do not fake a Stitch design.

## Data → prompt pipeline

### 1. Gather facts (never invent PII)

Prefer real records from `lib/data/events.ts`, `lib/data/tournaments.ts`, creator forms, or parsed intent (`lib/ai/event-intent.ts`, `lib/ai/tournament-intent.ts`, `lib/ai/event-enrich.ts`).

| Field | Source examples |
| --- | --- |
| Title / name | `title`, `name`, enriched title |
| Organizer | `organizerName`, venue owner profile `full_name` / `username` (no phone) |
| Venue | venue name + city |
| When | `startsAt`, `endsAt`, registration deadline |
| Sport | `TENNIS` / `PADEL` / … → human label |
| Price / entry | `price`, `entryFee` |
| Capacity | `capacity`, `maxParticipants` |
| Mode | community vs official venue event |
| Sponsors | name + tier only (logos as URLs if already public) |
| Promo copy | `promoCopy`, `socialPost`, `description` |

**Privacy:** Never send phone numbers, emails, or full private profiles into Stitch prompts. Use display names and public venue info only.

### 2. Build the Stitch prompt

Use this template (fill every known field; omit unknowns):

```text
Mobile-first dark sports app screen for SportSync (Apex Elite aesthetic).
Screen type: [Event detail | Tournament detail | Event promo banner | Create-review preview].

Brand: SportSync. Dark surfaces (#131313 family), primary coral/peach accents, secondary gold.
Typography feel: bold Montserrat headlines, clean Inter body. Glass panels, athletic energy.
Full-bleed hero photo plane for the sport — not inset cards in the hero.
One composition: brand/event name hero-level, one headline, one short support line, one CTA group.

Real event data (render as visible UI copy, do not invent conflicting facts):
- Event/Tournament: {title}
- Organizer: {organizerName}
- Venue: {venueName}, {city}
- Starts: {startsAt local SK format}
- Ends / deadline: {endsAt / registrationDeadline}
- Sport: {sport}
- Entry: {price/entryFee} · Capacity: {capacity}
- Mode: {community|official}
- Sponsors: {sponsor list or "none"}
- Promo: {promoCopy}

UI must include: hero with sport atmosphere, key meta row (when / where / who), primary Register/Join CTA, secondary Share, optional sponsor strip for official events.
No purple-on-white themes. No cream broadsheet. Match elite dark sports club look.
```

### 3. Call Stitch MCP

1. `list_projects` — reuse a SportSync / Event Factory project if it exists; else `create_project` (e.g. `SportSync Event Factory`).
2. `generate_screen_from_text` (or equivalent) with the prompt above.
3. Fetch screen image + HTML/code via the available fetch tools.
4. Optionally `extract_design_context` to keep follow-up screens consistent.

### 4. Port into the codebase

- Save Stitch HTML reference under `FrontEnd/<screen_name>/` when creating a lasting screen (same pattern as trainers).
- Implement in `app/events/**`, `app/tournaments/**`, `components/events/**`, `components/tournaments/**`.
- Map colors to existing `tailwind.config.ts` tokens — do **not** paste new hex values from Stitch when a token already exists (`primary`, `secondary`, `surface-*`, `glass-card`, `gradient-text`).
- Wire real props from data loaders; Stitch mock strings are placeholders only.

## Event Factory order of operations

```text
Raw brief / DB row
  → parse intent + enrich (title, description, promoCopy)
  → Stitch MCP design proposal (this skill)
  → User reviews visual
  → Port to Next.js + publish/API
```

Text enrichment (`enrichEvent`) and Stitch design are complementary: enrich fills copy fields; Stitch proposes the page chrome and layout.

## Verification

- Stitch returned a screen (image and/or HTML) tied to the real event facts above.
- Implemented UI uses SportSync tokens and live data bindings.
- `npx tsc --noEmit` when code changed.

# SportSync Backend

Node.js (Express + TypeScript) backend for the SportSync app, built around the Stitch-exported frontend in this repo. The architecture is **CrewAI-ready**: AI agents can run the whole matchmaking loop autonomously — discover pending requests, create lobbies, raise Mercenary +1 emergency calls, and update city leaderboards — with no human intervention.

## Stack

- **Express 4 + TypeScript** — API server, also serves the Stitch HTML screens
- **Prisma 6 + PostgreSQL** (Supabase-compatible) — data layer
- **Zod** — request validation
- **node-cron** — autonomous background jobs (Mercenary +1 scan, housekeeping)

## Setup

```bash
npm install
copy .env.example .env        # then fill in DATABASE_URL and AGENT_API_KEY
npx prisma generate
npx prisma migrate dev --name init   # or: npx prisma db push (Supabase)
npm run seed                  # demo data around Bratislava
npm run dev                   # http://localhost:3000
```

## Frontend routes (Stitch design, unchanged)

| URL | Screen |
| --- | --- |
| `/` | Homepage |
| `/lobby`, `/lobby/simple`, `/lobby/details` | Player lobby / matchmaking |
| `/events`, `/events/details` | Events discovery |
| `/venues`, `/venues/details` | Premium venues |
| `/tournaments`, `/tournaments/details` | Tournaments |
| `/trainers`, `/trainers/profile` | Trainers |
| `/profile` | Athlete profile |

## Public API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/events?lat&lng[&sport][&city]` | Matches within 20 km; if empty, widens to 50 km and returns `show_extended: true` with the message *"Nothing nearby? Check out matches 50km away."* |
| GET | `/api/events/:id` | Event detail (participants, host, active mercenary calls) |
| POST | `/api/events` | Create a VENUE_EVENT / USER_EVENT manually |
| POST | `/api/events/:id/join` | Join an open event |
| POST | `/api/lobby-requests` | "I want a match" — queues a PENDING request for AI agents |
| GET | `/api/lobby-requests/:id` | Poll match status (PENDING → PROCESSING_BY_AI → MATCHED) |
| GET | `/api/lobby-requests/user/:userId` | A user's request history |
| GET | `/api/mercenary?lat&lng[&sport]` | Active Mercenary +1 emergency calls covering the player |
| POST | `/api/mercenary/:id/claim` | Answer an emergency call and take the free slot |
| GET | `/api/leaderboard?city&sport[&season]` | City rankings, e.g. Rank 1 Padel in Bratislava |
| GET | `/api/health` | Liveness check |

## CrewAI Agent API (`/api/ai/*`)

All AI endpoints require headers:

```
x-agent-key: <AGENT_API_KEY from .env>
x-agent-id:  <agent name, e.g. "matchmaker-crew-1">   (optional, for audit trail)
```

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/ai/pending-requests` | Poll loop entry point. Each PENDING request includes `compatible_request_ids` (same sport, ±2 h, within 20 km) so the agent instantly sees what can be bundled into one lobby. |
| POST | `/api/ai/claim-requests` | Atomically flip PENDING → PROCESSING_BY_AI (safe for multiple concurrent agents). |
| POST | `/api/ai/create-lobby` | Create + confirm a match from matched requests. Validates the 20 km rule per request; one transaction creates the Event, adds participants, and marks requests MATCHED. |
| GET | `/api/ai/candidate-players` | Discover players within a radius when a lobby needs more people. |
| POST | `/api/ai/mercenary-scan` | Trigger the Mercenary +1 scan on demand (also runs on cron every 5 min). |
| GET | `/api/ai/mercenary/:id/players-in-radius` | Non-participants inside an emergency call's 20 km radius, sorted by distance. |
| POST | `/api/ai/record-result` | Report a finished match; points and dense city ranks recompute automatically. |

### Autonomous loop (what a CrewAI crew does)

1. **Scout agent** polls `GET /api/ai/pending-requests` and groups requests via `compatible_request_ids`.
2. **Matchmaker agent** claims a group (`POST /api/ai/claim-requests`), picks a venue/time, and fires `POST /api/ai/create-lobby`.
3. **Mercenary agent** watches `POST /api/ai/mercenary-scan` output (or the cron-created calls) and pings players from `players-in-radius`.
4. **Referee agent** posts results to `/api/ai/record-result` after matches finish.

### Example calls

```bash
# Poll for work
curl -H "x-agent-key: $AGENT_API_KEY" "http://localhost:3000/api/ai/pending-requests?sport=PADEL"

# Create and confirm a lobby
curl -X POST -H "x-agent-key: $AGENT_API_KEY" -H "content-type: application/json" \
  -d '{"sport":"PADEL","title":"AI Padel Doubles","city":"Bratislava","lat":48.1486,"lng":17.1077,"dateTime":"2026-07-15T18:00:00Z","maxPlayers":4,"matchedRequestIds":["req1","req2"]}' \
  http://localhost:3000/api/ai/create-lobby

# Frontend events feed (20 km, fallback 50 km)
curl "http://localhost:3000/api/events?lat=48.1486&lng=17.1077"
```

## Background jobs (fully autonomous)

- **Every 5 min** — Mercenary +1 scan: events starting within 60 minutes that are missing players get an ACTIVE `MercenaryNotification` with a 20 km radius.
- **Every 10 min** — housekeeping: expires stale lobby requests and mercenary calls, moves started events to IN_PROGRESS.

## Data model

`User`, `LobbyRequest` (status enum PENDING / PROCESSING_BY_AI / MATCHED / EXPIRED with agent audit fields), `Event` (VENUE_EVENT / USER_EVENT), `EventParticipant` (with `isMercenary` flag), `MercenaryNotification` (ACTIVE / FILLED / EXPIRED, 20 km default radius), `Leaderboard` (unique per user + sport + city + season). See `prisma/schema.prisma`.

# SportSync Architecture

## 1. Overview
SportSync is a comprehensive sports event management platform featuring real-time matchmaking, venue management, tournament organization, and AI-driven insights. The system follows a modern serverless architecture with a React/Next.js frontend, Supabase PostgreSQL backend, and Prisma ORM for database interactions.

## 2. Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + Zustand
- **API Client**: Custom wrapper around fetch/axios in `lib/api`
- **Key Pages**:
  - `/` - Home feed with venue and event cards
  - `/venues/[id]` - Venue details and event listings
  - `/tournaments` - Tournament bracket and registration
  - `/lobby/[id]` - Matchmaking lobby interface
- **Components Structure**:
  - `components/` - Reusable UI components (buttons, cards, modals)
  - `components/venues/` - Venue-specific components (VenueCard, VenueDetails)
  - `components/events/` - Event components (EventCard, EventDetails)
  - `components/lobby/` - Lobby components (LobbyHeader, ParticipantList)
  - `components/trainers/` - Trainer discovery components
- **Authentication**: Supabase Auth session management with token refresh

## 3. Backend (API Routes)
All backend logic resides in `app/api/` using Next.js Serverless Functions:
- **Authentication**: Supabase Auth middleware (`middleware.ts`) validates JWT tokens
- **Data Access Layer**: Prisma Client (`prisma/client`) interacts with PostgreSQL
- **Key Endpoints**:
  - `GET /api/manage/venues` - List venues with pagination
  - `POST /api/manage/venues` - Create new venue (admin only)
  - `GET /api/manage/venues/[id]/events` - List events for a venue
  - `POST /api/manage/venues/[id]/events` - Create event
  - `GET /api/tournaments` - List tournaments
  - `POST /api/tournaments` - Create tournament
   - `GET /api/ai/events/ingest` - AI event ingestion endpoint
   - `POST /api/events/parse-intent` - Structured text extraction: LLM JSON-Schema parse of a raw brief into sportType, price, schedule, themeConfig, sponsors
   - `GET /api/feed` - Public feed of events and venues
- **Request/Response**: All endpoints return JSON with consistent `{ success: boolean, data: any, error: string }` shape

## 4. Database (PostgreSQL via Supabase)
- **ORM**: Prisma 5.x
- **Schema**: Defined in `prisma/schema.prisma` (787 lines)
- **Key Tables**:
  - `Profile`: User profile with GPS coordinates, karma score, preferences
  - `Venue`: Physical sports venues with amenities and opening hours
   - `Event`: Community or official events with location, sport, schedule, and AI-Factory structured fields (`sportType` enum, `priceCents`/`currency`, `eventDate`/`startTime`/`endTime`, `maxParticipants`/`entryRequirements`, `themeConfig` JSON, `sponsorsJson` JSON)
  - `Lobby`: Matchmaking lobbies for ad-hoc games
  - `Tournament`: Structured tournament brackets with registration
  - `TrainingLesson`: Coach-led training sessions
  - `SportGroup`: Private crew groups for organized activities
  - `KarmaEvent`: Social proof system for user engagement
- **Triggers**:
  - `handle_new_user`: Syncs Supabase Auth user to Prisma Profile on signup
  - `sync_karma_score`: Updates user karmaScore from KarmaEvent inserts
  - `update_lobby_spots`: Recalculates lobby capacity based on participants
  - `sync_sport_group_wallet_balance`: Maintains group wallet balances
- **RLS Policies**: Row-level security ensures users can only access their own data unless explicitly permitted

## 5. Data Flow
1. **Client → API Route**: Browser calls Next.js API route (e.g., `GET /api/manage/venues/[id]/events`)
2. **API Route → Service Layer**: Route handler delegates to service functions in `src/services/`
3. **Service Layer → Prisma**: Prisma Client queries the database with proper relations
4. **Database → Triggers**: DB triggers maintain denormalized fields (karmaScore, spotsFilled, etc.)
5. **Response**: API returns JSON to client, which updates UI state

## 6. AI Integration
- **Auto-match**: `lib/matching/auto-match.ts` suggests events/lobbies based on user location and preferences
- **Auto-promote**: `lib/marketing/auto-promote.ts` handles promotional campaigns for venues/events
 - **AI Ingestion**: `/api/ai/events/ingest` and `/api/ai/tournaments/ingest` endpoints consume external AI data feeds
 - **Structured Text Extraction**: `POST /api/events/parse-intent` uses OpenAI JSON-Schema output (`lib/ai/event-parse-structured.ts`) to extract structured event data from a raw brief + optional photos. `lib/ai/theme-config.ts` maps `sportType` → accent color, gradient, and sport-specific tab labels. The client mirror `lib/ai/theme-config-client.ts` drives the dynamic event UI (`EventCard` accent bar/CTA + `app/events/[id]/page.tsx` tabs, gradient header, premium sponsor wall).
- **Platform Signals**: `PlatformSignal` table tracks user interactions for AI demand forecasting

## 7. Deployment
- **Frontend**: Deployed on Vercel with automatic preview environments
- **Backend**: Serverless functions on Vercel Edge Runtime
- **Database**: Supabase PostgreSQL with read replicas
- **Monitoring**: Integrated with Sentry for error tracking and LogRocket for session replay

## 8. Key Technical Details
- **Database URL**: `postgresql://username:password@<host>: 1000`
- **Prisma Client**: Generated in `node_modules/.prisma/client`
- **Environment Variables**: `.env` file contains `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Build Command**: `npm run build`
- **Dev Command**: `npm run dev`
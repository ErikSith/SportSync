---
name: lobby-groups
description: >-
  Build SportSync Lobby "My Crew" friend groups — create groups, invite friends,
  plan shared sports activities. Use when working on /lobby groups UI, sport_groups
  schema, or group API routes.
---

# Lobby Friend Groups ("My Crew")

## User goal

On the Lobby page, users need a dedicated area to:
1. **Create a private crew/group** (name, sport focus, optional description)
2. **Invite friends** (by username search + copy invite link/code)
3. **Plan activities together** (upcoming sessions: sport, date/time, location note, optional link to a Lobby match)

This is **separate from public matchmaking** lobbies — groups are persistent; activities can spawn or link to `/lobby/create`.

## Routes

| Route | Purpose |
| --- | --- |
| `/lobby` | Add **My Crew** section above/beside existing Discover feed (tab or stacked section) |
| `/lobby/groups/create` | Create group form |
| `/lobby/groups/[id]` | Group hub — members, invite, activity list, "Plan activity" CTA |
| `/lobby/groups/join/[code]` | Accept invite via short code |

## Schema (add to prisma/schema.prisma)

```prisma
model SportGroup {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId     String   @map("owner_id") @db.Uuid
  owner       Profile  @relation("GroupOwner", fields: [ownerId], references: [id])
  name        String
  description String?
  sport       String
  inviteCode  String   @unique @map("invite_code")
  createdAt   DateTime @default(now()) @map("created_at")
  members     SportGroupMember[]
  activities  SportGroupActivity[]
  @@map("sport_groups")
}

model SportGroupMember {
  groupId  String @map("group_id") @db.Uuid
  group    SportGroup @relation(...)
  userId   String @map("user_id") @db.Uuid
  user     Profile @relation(...)
  role     String @default("member") // owner | member
  joinedAt DateTime @default(now()) @map("joined_at")
  @@id([groupId, userId])
  @@map("sport_group_members")
}

model SportGroupActivity {
  id          String   @id @default(uuid())
  groupId     String   @map("group_id") @db.Uuid
  createdById String   @map("created_by_id") @db.Uuid
  title       String
  sport       String
  scheduledAt DateTime @map("scheduled_at")
  locationNote String? @map("location_note")
  lobbyId     String?  @map("lobby_id") @db.Uuid  // optional link to public lobby
  @@map("sport_group_activities")
}
```

Add reverse relations on `Profile`. Run `npx prisma generate` after schema edit. Document `npx prisma db push` for the user.

## API (App Router)

- `POST /api/groups` — create group (+ owner membership + invite code)
- `GET /api/groups` — list groups for signed-in user
- `POST /api/groups/[id]/invite` — body `{ username }` adds member if profile exists
- `POST /api/groups/join/[code]` — join via invite code
- `POST /api/groups/[id]/activities` — plan activity
- `GET` detail via `lib/data/sport-groups.ts` server queries (prefer Supabase like lobbies)

## UI / design

- Reference: `elite_player_lobby_dynamic_matchmaking/code.html`
- Reuse: `glass-card`, `glass-panel`, `gradient-text`, `font-label-caps`, Material Symbols
- Group cards: member avatars stack, sport chip, next activity date, "Manage" link
- Group detail: member roster (like `LobbyRoster`), invite panel with copy-link button, activity timeline

## Conventions

- Server Components for pages; `'use client'` only for forms, copy-to-clipboard, tabs
- Auth gate: same pattern as `app/lobby/page.tsx`
- **Never** import `@/lib/supabase/server` from client components — split shared types to `lib/data/sport-groups-shared.ts` if needed
- Do NOT modify unrelated tabs (trainers, venues, etc.)

## Verification

```bash
npx tsc --noEmit
```

Manual: `/lobby` shows My Crew, create group, invite, plan activity, join via code.

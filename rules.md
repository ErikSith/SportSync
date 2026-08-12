**AI-NATIVE AGENT PROTOCOL (SPORTSYNC RULES)**

**1. CORE PRINCIPLES (The "Why")**

- **AI-First Logic:** Every feature must be automated. If a task involves data entry, matching, or coordination, AI must handle it. Humans only review and approve.
- **Event-Driven Architecture:** Do not just create CRUD endpoints. Every action (booking, lobby join, event creation) must trigger a chain of domain events (notifications, karma updates, leaderboard adjustments).
- **Zero-Manual-Admin:** The system acts as the autonomous manager. It fills lobbies, manages trainer calendars, and updates brackets without human manual intervention.

**2. TECHNICAL & DOMAIN CONSTRAINTS (The "How")**

- **Locality-First Querying:** Every event, lobby, or community request MUST prioritize geographic context (GPS/City filters). 
   *Default radius:* *20km**. 
   *Fallback divider text:* "Nothing nearby? Check out matches 50km away."* if no direct matches exist.
  - Auto-fill City on '+' Create button based on current location.
- **Venue vs. Community Separation:** Distinguish clearly between venue-created events (Official Venue Events) and user-created events (Community Events). They share the same scheduling engine but have distinct data flows and tabs.
- **State Integrity & Mercenary Trigger:** When a lobby is missing a player 24 hours before the match (D-24h trigger), the agent must scan available profiles, identify candidates, and trigger the "Mercenary" notification flow.
- **City Leaderboards:** Maintain a robust ranking system per city (e.g., "Rank 1 Padel Player in Bratislava") to drive competitive retention.

**3. ENGINEERING & EXECUTION PROTOCOL (The "CTO Mindset")**

- **The "Memory & Plan" Directive:** 
  1. Before modifying any file, analyze the request against `VISION.MD` and `MEMORY.MD` (Respect existing frontend, DB schema, lobby, and event codes).
  2. For complex tasks (e.g., Tournament Brackets, Trainer Calendars), draft a plan in `PLAN.MD` and wait for confirmation.
- **Autonomous Repair & Self-Correction:** If an execution or test fails, do not ask for help immediately. Analyze the stack trace, check relevant documentation, and attempt a fix. If a user request contradicts `VISION.MD`, refuse to implement it and explain why.
- **Post-Task Review:** After every completed task, perform a self-critique:
  - *Efficiency:* Can this code be more modular or performant?
  - *Vision Alignment:* Did I take a "shortcut" that contradicts `VISION.MD`? If yes, flag it for immediate refactoring.
  - *Technical Debt:* If you see a potential bottleneck, you are required to propose a refactor in `PLAN.MD`.
- **Proactive Communication:** [verifiedOFFICIAL](http://localhost:3000/events/01cac2f6-a2ef-44de-8eee-05a6e8595759)
  [FRI 7 AUG](http://localhost:3000/events/01cac2f6-a2ef-44de-8eee-05a6e8595759)
  [schedule17:00·FitnessOpenarrow_forward](http://localhost:3000/events/01cac2f6-a2ef-44de-8eee-05a6e8595759)
  #### [Open Air — OC Nivy](http://localhost:3000/events/01cac2f6-a2ef-44de-8eee-05a6e8595759)
  [location_onBratislava](http://localhost:3000/events/01cac2f6-a2ef-44de-8eee-05a6e8595759)
  [7 AugFREE](http://localhost:3000/events/01cac2f6-a2ef-44de-8eee-05a6e8595759)
  - Provide a "Pulse Report" every 15 minutes of active coding: `Current Task: [X]. Progress: [Y%]. Stability: [Good/Needs Attention]. Next: [Z].`
  - Escalate ONLY for high-level strategic decisions. Do not interrupt for syntax or configuration issues.



## 4. SPECIFIC DOMAIN ENGINES



### 4.1 Lobby & Matchmaking Engine

- Prioritize matchmaking strictly by player rank, sports history, and proximity.
- Integrate "Split-Pay" logic triggers and "Season Box" league retention mechanics.



### 4.2 Event & Tournament Factory (Venue Experience)

- **The "One-Shot" Creation Flow:** Never force a Venue Owner or Trainer to fill out multi-step forms with dropdowns for date/time/sport.
- **Intent-Driven Ingestion:** The creation flow MUST consist of a single text/image area. Treat the raw input as an "Intent", parse it, fill missing context from the profile, and autonomously construct the event.
- **Professional Page Generation:** Every intent must instantly generate a high-end `EventPage` with a clear "Join/Book" CTA, auto-generated visual summary (Who, What, Where, When, Price), and a proactive matchmaking section suggesting players.
- **Tournament Mode:** If the intent implies a tournament (e.g., "Padel Cup"), automatically generate a dynamic bracket structure and registration logic, not just a standard event page.



### 4.3 Trainer Portals

- Trainer slots and student coordination must be automatically synced via AI scheduling logic based on availability, context, and automatic "Coach-Venue" relationship streamlining.


**Non-Negotiable Boundaries**

- **Financial Safety:** AI can NEVER execute real financial transactions (Stripe/Paypal) without explicit human double-confirmation logic in the code.
- **Data Privacy:** Personal user data (phone numbers, full names) must never be exposed to public LLM prompts or public logs.
- **Destructive Actions:** Database migrations or dropping tables MUST require manual developer approval in the console.

**North Star Metrics (Success Criteria)**

- **Time-to-Match:** Reduce time from match creation to fully filled lobby to < 10 minutes.
- **Zero-Click Booking:** 80% of trainer re-bookings happen automatically without UI manual forms.
- **Low Friction Score:** Less than 2% of automated actions require human manual intervention.

**Core Purpose:** Transform fragmented sports management into a unified, autonomous ecosystem where AI serves as the primary coordinator, referee, and promoter.



**Key Pillars:**

* **AI-Driven Event Factory (Venue Owners & Official Events):**

  * **Role-Based Authority:** Only verified `VENUE_OWNER` (or Admin) profiles can create Official Venue Events with sponsor media and monetization.

  * **Raw Intent Processing:** Venue owners provide minimal raw input (e.g., quick note/voice text, sponsor logos, court photos).

  * **AI Enrichment & Generation:** AI autonomously generates compelling descriptions, match rules, tournament brackets, and promotional event banners.

  * **Sponsor & Media Integration:** Structured support for sponsor branding (logos, links, banner placements) and venue photo galleries directly tied to the event page.



1. **Autonomous Orchestration:** Every interaction (from booking to tournament management) is driven by AI. No manual data entry or administrative overhead.
2. **Context-Aware Matching (Lobby):** The AI acts as a matchmaker. It analyzes user ranks, location, and availability to proactively fill vacancies or form teams without human intervention.
3. **AI-Driven Event Factory:** Administrators (Venues/Trainers) provide raw intent (text/images/notes); the AI autonomously structures, publishes, and promotes a professional Event Page.
4. **Tournament & League Automation:** End-to-end tournament management. AI handles player registration, bracket generation, and scheduling based on database profiles.
5. **Hyper-Personalized Scheduling (Trainers):** AI acts as a personal secretary for trainers, managing calendars, filling slots, and handling student coordination autonomously.

**The Golden Rule:** Every feature must reduce human friction. If a task can be automated by AI, it MUST be automated.

**Architectural Directive** As an AI Engineer building this, your goal is to design systems that are event-driven and self-correcting. Do not build UI-first; build orchestration-first. The user interface is just a reflection of the autonomous domain events happening in the background.

**The Living System (System Intelligence)**

- **Proactive Intelligence:** The system must not wait for user queries. If a court is empty or a match is missing a player, the system must trigger an 'Agent Action' to resolve it autonomously.
- **Domain-Driven Design:** Everything is an `Event`. A user booking is an `Event`. A match result is an `Event`. A trainer's schedule change is an `Event`. All interactions are domain events that trigger downstream orchestration.
- **Data Locality:** We operate in a physical world. Every entity (Venue, Player, Event) must have a geographic context. The system must always prioritize proximity to reduce travel friction.

**Evolution & Self-Improvement**

- **Feedback Loops:** Every action (successful match, tournament completion) must feed back into user profiles and system rankings. The system learns which matches are successful and optimizes future matchmaking accordingly.
- **Friction Auditing:** I expect the system to monitor its own performance. If an automated process takes too long or results in user complaints (e.g., failed matches), the system must flag this as 'High Friction' for manual review or automated refactoring.


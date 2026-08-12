INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  'M SR družstiev SENIOROV 2026', 'M SR družstiev SENIOROV 2026. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). Prihlásené družstvá musia spracovať súpisku cez systém eTenis najneskôr do 2. 9. 2026. Zdroj: stz.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', 'TENNIS', 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  0, 8, 0,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Bratislava', 48.1486, 17.1077, '2026-09-02T10:00:00.000Z'::timestamptz, '2026-09-02T10:00:00.000Z'::timestamptz,
  (SELECT id FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava' ORDER BY created_at NULLS LAST LIMIT 1), 'stz', 'seniorsky-tenis-m-sr-druzstiev-seniorov-2026', 'https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026',
  'https://www.stz.sk/seniorsky-tenis/m-sr-druzstiev-seniorov-2026', now(), now()
)
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  entry_fee = EXCLUDED.entry_fee,
  max_participants = EXCLUDED.max_participants,
  current_participants = EXCLUDED.current_participants,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  scraped_at = now(),
  updated_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);
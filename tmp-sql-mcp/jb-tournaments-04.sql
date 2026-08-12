WITH rows AS (
  SELECT * FROM jsonb_to_recordset($json$[{"source":"horsky-beh","external_id":"horsky-beh-http-vysledky-vysledkovyservis-sk-results-aspx-cid-16625-rid-324-2031","name":"2019-12-31 Silvestrovský kros","sport":"RUNNING","description":"2019-12-31 Silvestrovský kros Read More\n\nLokalita: Lamač (Bratislava IV).\n\nSportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Horský Beh Karpaty). http://vysledky.vysledkovyservis.sk/results.aspx?CId=16625&RId=324","cover_url":"https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80","city":"Bratislava","starts_at":"2031-12-19T17:00:00.000Z","entry_fee":0,"max_participants":8,"current_participants":0,"venue_name":"Horský Beh Karpaty","latitude":48.2,"longitude":17.05,"source_url":"http://vysledky.vysledkovyservis.sk/results.aspx?CId=16625&RId=324","ticket_url":"http://vysledky.vysledkovyservis.sk/results.aspx?CId=16625&RId=324"}]$json$::jsonb) AS x(
    source text, external_id text, name text, sport text, description text, cover_url text,
    city text, starts_at timestamptz, entry_fee numeric, max_participants int,
    current_participants int, venue_name text, latitude float8, longitude float8,
    source_url text, ticket_url text
  )
)
INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
)
SELECT
  r.name, r.description, r.sport, 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', r.entry_fee,
  r.max_participants, r.current_participants, r.cover_url, r.city, r.latitude, r.longitude,
  r.starts_at, r.starts_at,
  (SELECT id FROM venues v WHERE v.name ILIKE r.venue_name LIMIT 1),
  r.source, r.external_id, r.source_url, r.ticket_url, now(), now()
FROM rows r
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
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  scraped_at = now(),
  updated_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);
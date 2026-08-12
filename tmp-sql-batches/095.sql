INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'TENNIS', 'TENNIS'::"SportType", 'DC: Vstupenky sú už v predaji!', 'Davis Cup — vstupenky pre divákov. NTC Košice. Zdroj: stz.sk / predpredaj.

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (STZ – oficiálny web). https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99',
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80', 'Košice', '2026-09-19T12:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'stz', 'dc-tickets-davis-cup-dc-vstupenky-su-uz-v-predaji-99', 'https://www.stz.sk/davis-cup/dc-vstupenky-su-uz-v-predaji-99', 'STZ – oficiálny web', true,
  'https://predpredaj.zoznam.sk/sk/listky/davis-cup-slovensko-grecko-2026/', now(), 'spectator', ARRAY[]::text[], false
)
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  price_cents = EXCLUDED.price_cents,
  capacity = EXCLUDED.capacity,
  max_participants = EXCLUDED.max_participants,
  registered_count = EXCLUDED.registered_count,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  source_name = EXCLUDED.source_name,
  is_aggregated = true,
  scraped_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, events.venue_id);
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'COMBAT', 'OTHER'::"SportType", 'NOC GLADIÁTOROV XIII', 'NOC GLADIÁTOROV XIII. Vstupenky pre divákov — 17.10.2026 16:00. Miesto: Športová hala, A. H. Škultétyho 1293, 990 01 Veľký Krtíš. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Veľký Krtíš', '2026-10-17T16:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-noc-gladiatorov-xiii-2026-10-17', 'https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/noc-gladiatorov-xiii-2026-10-17/', now(), 'spectator', ARRAY[]::text[], false
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
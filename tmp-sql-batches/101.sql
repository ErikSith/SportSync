INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'HANDBALL', 'OTHER'::"SportType", 'Králi ulice XI', 'Králi ulice XI. Vstupenky pre divákov — 29.08.2026 19:00. Miesto: Hádzanárska hala S.Šipoša, Alejová 2, 04011 Košice. Zdroj: predpredaj.zoznam.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Predpredaj.sk). https://predpredaj.zoznam.sk/sk/listky/krali-ulice-xi-2026-08-29/',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80', 'Košice', '2026-08-29T19:00:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),
  'predpredaj', 'sk-listky-krali-ulice-xi-2026-08-29', 'https://predpredaj.zoznam.sk/sk/listky/krali-ulice-xi-2026-08-29/', 'Predpredaj.sk', true,
  'https://predpredaj.zoznam.sk/sk/listky/krali-ulice-xi-2026-08-29/', now(), 'spectator', ARRAY[]::text[], false
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
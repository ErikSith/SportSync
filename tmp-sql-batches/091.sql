INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', 'FITNESS', 'OTHER'::"SportType", 'Ranné cvičenie s InstaGym', 'Ranné cvičenie s InstaGym. Ranné skupinové cvičenie pod vedením trénerov Instagym každý štvrtok o 7:30 na schodoch pri Dunaji. 6.8.2026 - 27.8.2026 / Eurovea. Otvorená športová aktivita — môžeš sa zúčastniť. Zdroj: citylife.sk

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (CityLife). https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', 'Bratislava', '2026-08-06T07:30:00.000Z'::timestamptz,
  0, NULL, NULL, 0,
  48.1486, 17.1077, (SELECT id FROM venues WHERE name ILIKE 'Eurovea (Dunaj)' ORDER BY created_at NULLS LAST LIMIT 1),
  'citylife', 'ina-akcia-ranne-letne-cvicenia-s-instagym-pri-dunaji', 'https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji', 'CityLife', true,
  'https://www.citylife.sk/ina-akcia/ranne-letne-cvicenia-s-instagym-pri-dunaji', now(), 'participate', ARRAY[]::text[], false
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
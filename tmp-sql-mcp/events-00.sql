INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  event_date, start_time, price, price_cents, capacity, max_participants, registered_count,
  latitude, longitude, venue_id, source, external_id, source_url, source_name, is_aggregated,
  ticket_url, scraped_at, participation_mode, photos, ai_enriched
) VALUES
('official','open','FITNESS','OTHER'::"SportType",'Open Air — SKY PARK','Vezmi kamošov na obľúbené lekcie ZADARMO.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://formfactory.site/event/letoskypark','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','event-https-formfactory-site-event-letoskypark-2026-08-07','https://formfactory.site/event/letoskypark','Form Factory',true,'https://formfactory.site/event/letoskypark',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Open Air — OC Nivy','Vezmi kamošov na obľúbené lekcie ZADARMO.

Lokalita: Staré Mesto (Bratislava I).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://formfactory.site/event/event-motyizv2','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1468,17.1272,(SELECT id FROM venues WHERE name ILIKE 'Form Factory OC Nivy' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','event-https-formfactory-site-event-event-motyizv2-2026-08-07','https://formfactory.site/event/event-motyizv2','Form Factory',true,'https://formfactory.site/event/event-motyizv2',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Open Air — Račianske mýto','Vezmi kamošov na obľúbené lekcie ZADARMO.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://formfactory.site/event/letneoutdooroveskupinovky','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','event-https-formfactory-site-event-letneoutdooroveskupinovky-2026-08-07','https://formfactory.site/event/letneoutdooroveskupinovky','Form Factory',true,'https://formfactory.site/event/letneoutdooroveskupinovky',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Open Air Letné skupinové','Vezmi kamošov na obľúbené lekcie ZADARMO.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://formfactory.site/event/bbteplaren','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','event-https-formfactory-site-event-bbteplaren-2026-08-07','https://formfactory.site/event/bbteplaren','Form Factory',true,'https://formfactory.site/event/bbteplaren',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Piatkovica — FARSKÉHO','Zažite nával endorfínov vďaka perfektnému mixu kardia, výbušnosti a sily. Unikátne challenges vás za doprovodu live DJ setu od DJ Moto vtiahnu do intenzívneho full body workoutu, ktorý na Slovensku nemá obdoby.

Lokalita: Petržalka (Bratislava V).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://www.formfactory.sk/piatkovica-bratislava-farskeho/','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,'2026-08-07T17:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1405,17.1338,(SELECT id FROM venues WHERE name ILIKE 'Form Factory Farského' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','event-https-www-formfactory-sk-piatkovica-bratislava-farskeho-2026-08-07','https://www.formfactory.sk/piatkovica-bratislava-farskeho/','Form Factory',true,'https://formfactory.site/event/piatkovica-farskeho',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Piatkovica — OC NIVY','Zažite nával endorfínov vďaka perfektnému mixu kardia, výbušnosti a sily. Unikátne challenges vás za doprovodu live DJ setu od DJ Moto vtiahnu do intenzívneho full body workoutu, ktorý na Slovensku nemá obdoby.

Lokalita: Staré Mesto (Bratislava I).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://www.formfactory.sk/piatkovica-bratislava-nivy/','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-21T17:00:00.000Z'::timestamptz,'2026-08-21T17:00:00.000Z'::timestamptz,'2026-08-21T17:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1468,17.1272,(SELECT id FROM venues WHERE name ILIKE 'Form Factory OC Nivy' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','event-https-www-formfactory-sk-piatkovica-bratislava-nivy-2026-08-21','https://www.formfactory.sk/piatkovica-bratislava-nivy/','Form Factory',true,'https://www.formfactory.sk/piatkovica-bratislava-nivy/',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Traja na jedného','Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-04T18:30:00.000Z'::timestamptz,'2026-08-04T18:30:00.000Z'::timestamptz,'2026-08-04T18:30:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','class-2026-08-04T18:30:00.000Z-traja-na-jedneho','https://fitcamp.formfactory.sk/calendar','Form Factory',true,'https://fitcamp.formfactory.sk/calendar',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Thai box pre pokročilých','Skupinové cvičenie Form Factory FitCamp — Thai box pre pokročilých. Rezervuj si miesto a zúčastni sa.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-04T19:10:00.000Z'::timestamptz,'2026-08-04T19:10:00.000Z'::timestamptz,'2026-08-04T19:10:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','class-2026-08-04T19:10:00.000Z-thai-box-pre-pokrocilych','https://fitcamp.formfactory.sk/calendar','Form Factory',true,'https://fitcamp.formfactory.sk/calendar',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'RPM','Skupinové cvičenie Form Factory FitCamp — RPM. Rezervuj si miesto a zúčastni sa.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-05T06:30:00.000Z'::timestamptz,'2026-08-05T06:30:00.000Z'::timestamptz,'2026-08-05T06:30:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','class-2026-08-05T06:30:00.000Z-rpm','https://fitcamp.formfactory.sk/calendar','Form Factory',true,'https://fitcamp.formfactory.sk/calendar',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Kruhový tréning','Skupinové cvičenie Form Factory FitCamp — Kruhový tréning. Rezervuj si miesto a zúčastni sa.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-05T07:00:00.000Z'::timestamptz,'2026-08-05T07:00:00.000Z'::timestamptz,'2026-08-05T07:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','class-2026-08-05T07:00:00.000Z-kruhovy-trening','https://fitcamp.formfactory.sk/calendar','Form Factory',true,'https://fitcamp.formfactory.sk/calendar',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Sila a Kondícia','Skupinové cvičenie Form Factory FitCamp — Sila a Kondícia. Rezervuj si miesto a zúčastni sa.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-05T07:00:00.000Z'::timestamptz,'2026-08-05T07:00:00.000Z'::timestamptz,'2026-08-05T07:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','class-2026-08-05T07:00:00.000Z-sila-a-kondicia','https://fitcamp.formfactory.sk/calendar','Form Factory',true,'https://fitcamp.formfactory.sk/calendar',now(),'participate',ARRAY[]::text[],false),
('official','open','FITNESS','OTHER'::"SportType",'Traja na jedného','Skupinové cvičenie Form Factory FitCamp — Traja na jedného. Rezervuj si miesto a zúčastni sa.

Lokalita: Ružinov (Bratislava II).

SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (Form Factory). https://fitcamp.formfactory.sk/calendar','https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80','Bratislava','2026-08-05T07:00:00.000Z'::timestamptz,'2026-08-05T07:00:00.000Z'::timestamptz,'2026-08-05T07:00:00.000Z'::timestamptz,0,0,NULL,NULL,0,48.1562,17.1475,(SELECT id FROM venues WHERE name ILIKE 'Form Factory FitCamp' ORDER BY created_at NULLS LAST LIMIT 1),'form-factory','class-2026-08-05T07:00:00.000Z-traja-na-jedneho','https://fitcamp.formfactory.sk/calendar','Form Factory',true,'https://fitcamp.formfactory.sk/calendar',now(),'participate',ARRAY[]::text[],false)
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  event_date = EXCLUDED.event_date,
  start_time = EXCLUDED.start_time,
  price = EXCLUDED.price,
  price_cents = EXCLUDED.price_cents,
  capacity = EXCLUDED.capacity,
  max_participants = EXCLUDED.max_participants,
  registered_count = EXCLUDED.registered_count,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  source_name = EXCLUDED.source_name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  scraped_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, events.venue_id),
  participation_mode = EXCLUDED.participation_mode;
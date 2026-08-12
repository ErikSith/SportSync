
INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT v.name, v.address, v.city, v.sports, v.lat, v.lng, v.website, true
FROM (VALUES
  ('Aurial Padel Bratislava', 'Bajkalská 7, Bratislava', 'Bratislava', ARRAY['PADEL'], 48.1569, 17.1402, 'https://aurialpadel.sk/turnaje'),
  ('Aurial Padel Rača', 'Na Pántoch 8, Bratislava', 'Bratislava', ARRAY['PADEL'], 48.2045, 17.1508, 'https://aurialpadel.sk/turnaje'),
  ('Form Factory FitCamp', 'Drieňová 11/A, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1562, 17.1475, 'https://fitcamp.formfactory.sk/calendar'),
  ('Form Factory Farského', 'Farského 14, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1405, 17.1338, 'https://www.formfactory.sk/eventy/'),
  ('Form Factory OC Nivy', 'Mlynské nivy 16, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1468, 17.1272, 'https://www.formfactory.sk/eventy/'),
  ('Form Factory BBC', 'Plynárenská 7/A, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1422, 17.1285, 'https://www.formfactory.sk/eventy/'),
  ('Národné tenisové centrum Bratislava', 'Trnavská cesta, Bratislava', 'Bratislava', ARRAY['TENNIS'], 48.1655, 17.1368, 'https://www.ntc.sk/'),
  ('Eurovea (Dunaj)', 'Pribinova, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1405, 17.1225, 'https://www.citylife.sk/tag/sport'),
  ('Grassalkovichova zahrada', 'Hodžovo námestie, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1494, 17.1077, 'https://www.citylife.sk/tag/sport')
) AS v(name, address, city, sports, lat, lng, website)
WHERE NOT EXISTS (
  SELECT 1 FROM venues x WHERE x.city = v.city AND x.name ILIKE v.name
);

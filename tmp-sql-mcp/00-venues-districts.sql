
-- Insert missing scrape venues

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Tehelné pole', 'Viktora Tegelhoffa 4, Bratislava', 'Bratislava', 'nove-mesto', ARRAY['FOOTBALL']::text[], 48.1636, 17.1386, 'https://www.skslovan.com/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Tehelné pole');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'TIPOS Aréna', 'Odbojárov 9, Bratislava', 'Bratislava', 'nove-mesto', ARRAY['HOCKEY']::text[], 48.1628, 17.1395, 'https://www.hcslovan.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'TIPOS Aréna');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Gopass Aréna', 'Trnavská cesta 29, Bratislava', 'Bratislava', 'nove-mesto', ARRAY['BASKETBALL','VOLLEYBALL']::text[], 48.1645, 17.1378, 'https://gopassarena.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Gopass Aréna');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Form Factory FitCamp', 'Drieňová 11/A, Bratislava', 'Bratislava', 'ruzinov', ARRAY['FITNESS']::text[], 48.1562, 17.1475, 'https://fitcamp.formfactory.sk/calendar', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Form Factory FitCamp');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Form Factory Farského', 'Farského 14, Bratislava', 'Bratislava', 'petrzalka', ARRAY['FITNESS']::text[], 48.1405, 17.1338, 'https://www.formfactory.sk/eventy/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Form Factory Farského');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Form Factory OC Nivy', 'Mlynské nivy 16, Bratislava', 'Bratislava', 'stare-mesto', ARRAY['FITNESS']::text[], 48.1468, 17.1272, 'https://www.formfactory.sk/eventy/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Form Factory OC Nivy');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Form Factory BBC', 'Plynárenská 7/A, Bratislava', 'Bratislava', 'ruzinov', ARRAY['FITNESS']::text[], 48.1422, 17.1285, 'https://www.formfactory.sk/eventy/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Form Factory BBC');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Aurial Padel Bratislava', 'Bajkalská 7, Bratislava', 'Bratislava', 'ruzinov', ARRAY['PADEL']::text[], 48.1569, 17.1402, 'https://aurialpadel.sk/turnaje', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Aurial Padel Bratislava');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Aurial Padel Rača', 'Na Pántoch 8, Bratislava', 'Bratislava', 'raca', ARRAY['PADEL']::text[], 48.2045, 17.1508, 'https://aurialpadel.sk/turnaje', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Aurial Padel Rača');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Padel Bratislava', 'Bratislava', 'Bratislava', 'ruzinov', ARRAY['PADEL']::text[], 48.1486, 17.1077, 'https://www.padelbratislava.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Padel Bratislava');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Národné tenisové centrum Bratislava', 'Trnavská cesta, Bratislava', 'Bratislava', 'nove-mesto', ARRAY['TENNIS']::text[], 48.1655, 17.1368, 'https://www.ntc.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Národné tenisové centrum Bratislava');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'OFA Gym', 'Bratislava', 'Bratislava', 'stare-mesto', ARRAY['COMBAT']::text[], 48.1486, 17.1077, 'https://ofa.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'OFA Gym');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Chaos MMA', 'Bratislava', 'Bratislava', 'ruzinov', ARRAY['COMBAT']::text[], 48.155, 17.12, 'https://www.chaosgym.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Chaos MMA');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Crossfit Prostor', 'Bratislava', 'Bratislava', 'ruzinov', ARRAY['FITNESS']::text[], 48.152, 17.11, 'https://www.prostor.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Crossfit Prostor');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Wakelake', 'Bratislava', 'Bratislava', 'petrzalka', ARRAY['SWIMMING']::text[], 48.12, 17.15, 'https://www.wakelake.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Wakelake');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Divoká Voda Čunovo', 'Čunovo, Bratislava', 'Bratislava', 'cunovo', ARRAY['SWIMMING']::text[], 48.0297, 17.1897, 'https://www.divokavoda.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Divoká Voda Čunovo');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'PBC Bowling', 'Bratislava', 'Bratislava', 'stare-mesto', ARRAY['OTHER']::text[], 48.15, 17.11, 'http://www.pbc.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'PBC Bowling');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'BNC Bratislava', 'Bratislava', 'Bratislava', 'nove-mesto', ARRAY['OTHER']::text[], 48.151, 17.112, 'https://www.bnc.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'BNC Bratislava');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Slovenská Šípková Federácia', 'Bratislava', 'Bratislava', 'stare-mesto', ARRAY['OTHER']::text[], 48.1486, 17.1077, 'https://www.sipky.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Slovenská Šípková Federácia');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Bratislava Marathon', 'Bratislava', 'Bratislava', 'stare-mesto', ARRAY['RUNNING']::text[], 48.1486, 17.1077, 'https://www.bratislavamarathon.com/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Bratislava Marathon');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Horský Beh Karpaty', 'Malé Karpaty', 'Bratislava', 'lamac', ARRAY['RUNNING']::text[], 48.2, 17.05, 'https://www.horskybeh.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Horský Beh Karpaty');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Niké Topliga Bratislava', 'Bratislava', 'Bratislava', 'petrzalka', ARRAY['FOOTBALL']::text[], 48.1486, 17.1077, 'https://bratislava.topliga.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Niké Topliga Bratislava');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Športový areál Nevädzová', 'Nevädzová, Bratislava', 'Bratislava', 'ruzinov', ARRAY['FOOTBALL']::text[], 48.1558, 17.1525, 'https://www.arealnevadzova.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Športový areál Nevädzová');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'K2 Lezecká stena', 'Bratislava', 'Bratislava', 'nove-mesto', ARRAY['OTHER']::text[], 48.16, 17.13, 'https://www.lezeckastena.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'K2 Lezecká stena');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Block Dock Bouldering', 'Bratislava', 'Bratislava', 'ruzinov', ARRAY['OTHER']::text[], 48.145, 17.125, 'https://www.blockdock.sk/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Block Dock Bouldering');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Nivy Zóna', 'Mlynské nivy 16, Bratislava', 'Bratislava', 'stare-mesto', ARRAY['FITNESS']::text[], 48.1468, 17.1272, 'https://nivy.com/', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Nivy Zóna');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Eurovea (Dunaj)', 'Pribinova, Bratislava', 'Bratislava', 'stare-mesto', ARRAY['FITNESS']::text[], 48.1405, 17.1225, 'https://www.citylife.sk/tag/sport', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Eurovea (Dunaj)');

INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT 'Grassalkovichova zahrada', 'Hodžovo námestie, Bratislava', 'Bratislava', 'stare-mesto', ARRAY['FITNESS']::text[], 48.1494, 17.1077, 'https://www.citylife.sk/tag/sport', true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE 'Grassalkovichova zahrada');

-- Patch districts by exact name for existing rows
UPDATE venues AS v
SET
  district = s.district,
  address = COALESCE(NULLIF(v.address, ''), s.address),
  latitude = COALESCE(v.latitude, s.latitude),
  longitude = COALESCE(v.longitude, s.longitude),
  website_url = COALESCE(v.website_url, s.website_url)
FROM (VALUES
('Tehelné pole', 'nove-mesto', 'Viktora Tegelhoffa 4, Bratislava', 48.1636, 17.1386, 'https://www.skslovan.com/', ARRAY['FOOTBALL']::text[]),
('TIPOS Aréna', 'nove-mesto', 'Odbojárov 9, Bratislava', 48.1628, 17.1395, 'https://www.hcslovan.sk/', ARRAY['HOCKEY']::text[]),
('Gopass Aréna', 'nove-mesto', 'Trnavská cesta 29, Bratislava', 48.1645, 17.1378, 'https://gopassarena.sk/', ARRAY['BASKETBALL','VOLLEYBALL']::text[]),
('Form Factory FitCamp', 'ruzinov', 'Drieňová 11/A, Bratislava', 48.1562, 17.1475, 'https://fitcamp.formfactory.sk/calendar', ARRAY['FITNESS']::text[]),
('Form Factory Farského', 'petrzalka', 'Farského 14, Bratislava', 48.1405, 17.1338, 'https://www.formfactory.sk/eventy/', ARRAY['FITNESS']::text[]),
('Form Factory OC Nivy', 'stare-mesto', 'Mlynské nivy 16, Bratislava', 48.1468, 17.1272, 'https://www.formfactory.sk/eventy/', ARRAY['FITNESS']::text[]),
('Form Factory BBC', 'ruzinov', 'Plynárenská 7/A, Bratislava', 48.1422, 17.1285, 'https://www.formfactory.sk/eventy/', ARRAY['FITNESS']::text[]),
('Aurial Padel Bratislava', 'ruzinov', 'Bajkalská 7, Bratislava', 48.1569, 17.1402, 'https://aurialpadel.sk/turnaje', ARRAY['PADEL']::text[]),
('Aurial Padel Rača', 'raca', 'Na Pántoch 8, Bratislava', 48.2045, 17.1508, 'https://aurialpadel.sk/turnaje', ARRAY['PADEL']::text[]),
('Padel Bratislava', 'ruzinov', 'Bratislava', 48.1486, 17.1077, 'https://www.padelbratislava.sk/', ARRAY['PADEL']::text[]),
('Národné tenisové centrum Bratislava', 'nove-mesto', 'Trnavská cesta, Bratislava', 48.1655, 17.1368, 'https://www.ntc.sk/', ARRAY['TENNIS']::text[]),
('OFA Gym', 'stare-mesto', 'Bratislava', 48.1486, 17.1077, 'https://ofa.sk/', ARRAY['COMBAT']::text[]),
('Chaos MMA', 'ruzinov', 'Bratislava', 48.155, 17.12, 'https://www.chaosgym.sk/', ARRAY['COMBAT']::text[]),
('Crossfit Prostor', 'ruzinov', 'Bratislava', 48.152, 17.11, 'https://www.prostor.sk/', ARRAY['FITNESS']::text[]),
('Wakelake', 'petrzalka', 'Bratislava', 48.12, 17.15, 'https://www.wakelake.sk/', ARRAY['SWIMMING']::text[]),
('Divoká Voda Čunovo', 'cunovo', 'Čunovo, Bratislava', 48.0297, 17.1897, 'https://www.divokavoda.sk/', ARRAY['SWIMMING']::text[]),
('PBC Bowling', 'stare-mesto', 'Bratislava', 48.15, 17.11, 'http://www.pbc.sk/', ARRAY['OTHER']::text[]),
('BNC Bratislava', 'nove-mesto', 'Bratislava', 48.151, 17.112, 'https://www.bnc.sk/', ARRAY['OTHER']::text[]),
('Slovenská Šípková Federácia', 'stare-mesto', 'Bratislava', 48.1486, 17.1077, 'https://www.sipky.sk/', ARRAY['OTHER']::text[]),
('Bratislava Marathon', 'stare-mesto', 'Bratislava', 48.1486, 17.1077, 'https://www.bratislavamarathon.com/', ARRAY['RUNNING']::text[]),
('Horský Beh Karpaty', 'lamac', 'Malé Karpaty', 48.2, 17.05, 'https://www.horskybeh.sk/', ARRAY['RUNNING']::text[]),
('Niké Topliga Bratislava', 'petrzalka', 'Bratislava', 48.1486, 17.1077, 'https://bratislava.topliga.sk/', ARRAY['FOOTBALL']::text[]),
('Športový areál Nevädzová', 'ruzinov', 'Nevädzová, Bratislava', 48.1558, 17.1525, 'https://www.arealnevadzova.sk/', ARRAY['FOOTBALL']::text[]),
('K2 Lezecká stena', 'nove-mesto', 'Bratislava', 48.16, 17.13, 'https://www.lezeckastena.sk/', ARRAY['OTHER']::text[]),
('Block Dock Bouldering', 'ruzinov', 'Bratislava', 48.145, 17.125, 'https://www.blockdock.sk/', ARRAY['OTHER']::text[]),
('Nivy Zóna', 'stare-mesto', 'Mlynské nivy 16, Bratislava', 48.1468, 17.1272, 'https://nivy.com/', ARRAY['FITNESS']::text[]),
('Eurovea (Dunaj)', 'stare-mesto', 'Pribinova, Bratislava', 48.1405, 17.1225, 'https://www.citylife.sk/tag/sport', ARRAY['FITNESS']::text[]),
('Grassalkovichova zahrada', 'stare-mesto', 'Hodžovo námestie, Bratislava', 48.1494, 17.1077, 'https://www.citylife.sk/tag/sport', ARRAY['FITNESS']::text[])
) AS s(name, district, address, latitude, longitude, website_url, sports)
WHERE v.name = s.name;

-- Known corrections
UPDATE venues SET district = 'ruzinov' WHERE name ILIKE 'Aurial Padel Bratislava';
UPDATE venues SET district = 'stare-mesto' WHERE name ILIKE 'Form Factory OC Nivy';
UPDATE venues SET district = 'ruzinov' WHERE name ILIKE 'Form Factory BBC';
UPDATE venues SET district = 'ruzinov' WHERE name ILIKE 'FitCamp%';

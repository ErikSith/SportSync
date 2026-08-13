-- Registry of venue websites / schedule pages to scrape (Gemini pipeline).
CREATE TABLE IF NOT EXISTS venue_scrape_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'website',
  borough TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'google-places',
  last_scraped_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS venue_scrape_pages_url_key
  ON venue_scrape_pages (url);

CREATE INDEX IF NOT EXISTS venue_scrape_pages_borough_enabled_idx
  ON venue_scrape_pages (borough, enabled);

CREATE INDEX IF NOT EXISTS venue_scrape_pages_venue_id_idx
  ON venue_scrape_pages (venue_id);

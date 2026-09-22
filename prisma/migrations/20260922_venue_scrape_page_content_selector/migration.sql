-- Per-URL CSS selector to narrow HTML before Gemini extract.
ALTER TABLE venue_scrape_pages
  ADD COLUMN IF NOT EXISTS content_selector TEXT;

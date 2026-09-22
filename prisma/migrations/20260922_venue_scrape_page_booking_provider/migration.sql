-- Optional booking-widget provider override for scrape pages (Reenio, …).
ALTER TABLE venue_scrape_pages
  ADD COLUMN IF NOT EXISTS booking_provider TEXT;

ALTER TABLE venue_scrape_pages
  ADD COLUMN IF NOT EXISTS booking_subject TEXT;

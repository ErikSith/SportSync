-- Anti-hallucination provenance for scraped events.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS source_excerpt text,
  ADD COLUMN IF NOT EXISTS source_evidence jsonb;

COMMENT ON COLUMN public.events.source_excerpt IS
  'Verbatim excerpt from source page cleanText used as anti-hallucination proof';
COMMENT ON COLUMN public.events.source_evidence IS
  'JSON provenance: fields found/missing, textFragment, sourceUrl, scrapedAt';

import fs from 'fs';

const logPath = fs.existsSync('data/scrape-reports/review-done-run.utf8.log')
  ? 'data/scrape-reports/review-done-run.utf8.log'
  : 'data/scrape-reports/review-done-run.log';
const raw = fs.readFileSync(logPath);
const log = (
  raw[0] === 0xff && raw[1] === 0xfe
    ? raw.toString('utf16le')
    : raw.toString('utf8')
).replace(/^\uFEFF/, '');
const lines = log.split(/\r?\n/);
const pages = [];
let cur = null;

for (const line of lines) {
  const m = line.match(/^\[(\d+)\/(\d+)\]\s+(.+)$/);
  if (m) {
    if (cur) pages.push(cur);
    cur = {
      i: +m[1],
      total: +m[2],
      venue: m[3].trim(),
      url: null,
      kind: null,
      path: null,
      status: null,
      error: null,
      eventCount: 0,
      items: [],
    };
    continue;
  }
  if (!cur) continue;
  if (!cur.url) {
    const t = line.trim();
    const km = t.match(/^(https?:\S+)\s+\((.+)\)$/);
    if (km) {
      cur.url = km[1];
      cur.kind = km[2];
      continue;
    }
  }
  const pm = line.match(/^\s+path=(\S+)\s+.*\bevents=(\d+)/);
  if (pm) {
    cur.path = pm[1];
    cur.eventCount = +pm[2];
    continue;
  }
  const em = line.match(/^\s+ERROR:\s*(.+)$/);
  if (em) {
    cur.error = em[1].slice(0, 180);
    continue;
  }
  const sm = line.match(/^\s+status=(.+)$/);
  if (sm) {
    cur.status = sm[1];
    continue;
  }
  const im = line.match(
    /^\s+\S+\s+(\S+)\s+\|\s+([^|]+)\|\s+(.+?)\s+\[([^\]]+)\]/,
  );
  if (im && /programs\/|events\/|tournaments/.test(im[4])) {
    const tags = im[4].split(',').map((s) => s.trim());
    const placement = tags.find((t) => t.includes('/')) || tags[0]!;
    cur.items.push({
      title: im[3].trim(),
      sport: im[2].trim(),
      placement,
      forKids: tags.includes('deti'),
      forWomen: tags.includes('zeny'),
    });
  }
}
if (cur) pages.push(cur);

const byPlacement = {};
for (const p of pages) {
  for (const it of p.items) {
    byPlacement[it.placement] = (byPlacement[it.placement] || 0) + 1;
  }
}

const created = pages.reduce((a, p) => {
  const m = (p.status || '').match(/\+(\d+)/);
  return a + (m ? +m[1] : 0);
}, 0);
const updated = pages.reduce((a, p) => {
  const m = (p.status || '').match(/~(\d+)/);
  return a + (m ? +m[1] : 0);
}, 0);

const failed = pages.filter((p) => p.error);
const last = pages[pages.length - 1];

const highlights = {
  'programs/courses': [],
  'programs/camps': [],
  'programs/workshops': [],
  tournaments: [],
  'events/open': [],
  'events/group-classes': [],
};

for (const p of pages) {
  for (const it of p.items) {
    const key = it.placement in highlights ? it.placement : null;
    if (!key || highlights[key].length >= 15) continue;
    highlights[key].push({
      venue: p.venue,
      title: it.title,
      source: p.url,
      kids: it.forKids,
    });
  }
}

const summary = {
  stoppedEarly: true,
  progress: last ? `${last.i}/${last.total}` : '0',
  pagesProcessed: pages.length,
  ok: pages.filter((p) => p.status?.startsWith('ok')).length,
  failed: failed.length,
  totalEventsExtracted: pages.reduce((a, p) => a + (p.eventCount || 0), 0),
  createdApprox: created,
  updatedApprox: updated,
  byPlacement,
  failedPages: failed.map((p) => ({
    venue: p.venue,
    url: p.url,
    error: p.error,
  })),
  highlights,
  pagesWithHits: pages
    .filter((p) => p.eventCount > 0)
    .map((p) => ({
      venue: p.venue,
      sourceUrl: p.url,
      kind: p.kind,
      path: p.path,
      events: p.eventCount,
      status: p.status,
      sample: p.items.slice(0, 5).map((it) => ({
        title: it.title,
        placement: it.placement,
        kids: it.forKids,
      })),
    })),
};

fs.writeFileSync(
  'data/scrape-reports/review-done-partial.json',
  JSON.stringify(summary, null, 2),
);

console.log(
  JSON.stringify(
    {
      progress: summary.progress,
      pagesProcessed: summary.pagesProcessed,
      ok: summary.ok,
      failed: summary.failed,
      totalEventsExtracted: summary.totalEventsExtracted,
      createdApprox: created,
      updatedApprox: updated,
      byPlacement,
      pagesWithHits: summary.pagesWithHits.length,
    },
    null,
    2,
  ),
);

for (const [bucket, rows] of Object.entries(highlights)) {
  console.log(`\n=== ${bucket} (${byPlacement[bucket] || 0} logged) ===`);
  for (const h of rows) {
    console.log(`- ${h.title} @ ${h.venue}`);
    console.log(`  ${h.source}${h.kids ? ' [deti]' : ''}`);
  }
}

console.log('\n=== FAILED ===');
for (const f of failed) {
  console.log(`- ${f.venue}: ${f.error}`);
  console.log(`  ${f.url}`);
}

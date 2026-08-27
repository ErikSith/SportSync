/**
 * Tracks scrape source health (bundled JSON + optional Node disk via attach).
 * After {@link FAILURE_SKIP_THRESHOLD} consecutive failures (error / timeout / 0 events),
 * the source is skipped on later runs until you clear or revive it.
 *
 * Edge-safe: no `node:` imports. Local scripts call `enableSourceHealthDisk()`
 * from `source-health-fs.ts` so writes persist to `source-health.json`.
 */

import healthSnapshot from '@/lib/scrape/source-health.json';
import { SCRAPING_SOURCES } from '@/lib/scrape/scraping-sources';
import type { AdapterResult } from '@/lib/scrape/types';

export const FAILURE_SKIP_THRESHOLD = 3;

export type SourceHealthStatus = 'ok' | 'empty' | 'error' | 'timeout' | 'stale';

export interface SourceHealthEntry {
  key: string;
  url: string | null;
  adapterId: string | null;
  name: string | null;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastStatus: SourceHealthStatus;
  lastError: string | null;
  lastEventCount: number;
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  skipped: boolean;
  skipReason: string | null;
}

export interface SourceHealthFile {
  version: 1;
  updatedAt: string | null;
  entries: Record<string, SourceHealthEntry>;
}

export interface SourceOutcomeInput {
  key: string;
  url?: string | null;
  adapterId?: string | null;
  name?: string | null;
  eventCount: number;
  error?: string | null;
}

export type SourceHealthDiskAdapters = {
  load: () => Promise<SourceHealthFile | null>;
  persist: (file: SourceHealthFile) => Promise<boolean>;
};

let memoryCache: SourceHealthFile | null = null;
let diskAdapters: SourceHealthDiskAdapters | null = null;

/** Node scripts only — wires fs read/write without importing `node:` in this module. */
export function attachSourceHealthDisk(adapters: SourceHealthDiskAdapters): void {
  diskAdapters = adapters;
}

function cloneSnapshot(): SourceHealthFile {
  const raw = healthSnapshot as SourceHealthFile;
  return {
    version: 1,
    updatedAt: raw.updatedAt ?? null,
    entries: { ...(raw.entries ?? {}) },
  };
}

function normalizeKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('adapter:')) return trimmed.toLowerCase();
  try {
    const u = new URL(trimmed);
    u.hash = '';
    // Drop trailing slash for stable keys (except bare origin)
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function adapterHealthKey(adapterId: string): string {
  return `adapter:${adapterId.toLowerCase()}`;
}

export function urlHealthKey(url: string): string {
  return normalizeKey(url);
}

function classifyOutcome(input: SourceOutcomeInput): SourceHealthStatus {
  const err = (input.error ?? '').trim();
  if (err) {
    if (/timed?\s*out|timeout/i.test(err)) return 'timeout';
    return 'error';
  }
  if (input.eventCount <= 0) return 'empty';
  return 'ok';
}

/**
 * Load health (memory → optional disk → bundled snapshot).
 */
export async function loadSourceHealth(): Promise<SourceHealthFile> {
  if (memoryCache) return memoryCache;

  if (diskAdapters) {
    const fromDisk = await diskAdapters.load();
    if (fromDisk) {
      memoryCache = fromDisk;
      return memoryCache;
    }
  }

  memoryCache = cloneSnapshot();
  return memoryCache;
}

async function persistSourceHealth(file: SourceHealthFile): Promise<boolean> {
  memoryCache = file;
  if (!diskAdapters) return false;
  return diskAdapters.persist(file);
}

export async function isSourceSkipped(key: string): Promise<boolean> {
  const file = await loadSourceHealth();
  const entry = file.entries[normalizeKey(key)];
  return Boolean(entry?.skipped);
}

export async function shouldSkipAdapter(adapterId: string): Promise<boolean> {
  return isSourceSkipped(adapterHealthKey(adapterId));
}

export async function shouldSkipUrl(url: string): Promise<boolean> {
  return isSourceSkipped(urlHealthKey(url));
}

function applyOutcome(
  file: SourceHealthFile,
  input: SourceOutcomeInput,
): SourceHealthEntry {
  const key = normalizeKey(input.key);
  const prev = file.entries[key];
  const status = classifyOutcome(input);
  const now = new Date().toISOString();
  // Hard failures only — a successful fetch with 0 dated listings (bowling/darts
  // calendars often quiet) must not permanently skip the adapter.
  const isHardFailure = status === 'error' || status === 'timeout';
  const consecutiveFailures = isHardFailure ? (prev?.consecutiveFailures ?? 0) + 1 : 0;
  const skipped = consecutiveFailures >= FAILURE_SKIP_THRESHOLD;
  const skipReason = skipped
    ? `${FAILURE_SKIP_THRESHOLD}+ consecutive failures (${status})`
    : null;

  const entry: SourceHealthEntry = {
    key,
    url: input.url ?? prev?.url ?? null,
    adapterId: input.adapterId ?? prev?.adapterId ?? null,
    name: input.name ?? prev?.name ?? null,
    consecutiveFailures,
    totalFailures: (prev?.totalFailures ?? 0) + (isHardFailure ? 1 : 0),
    totalSuccesses: (prev?.totalSuccesses ?? 0) + (isHardFailure ? 0 : 1),
    lastStatus: status,
    lastError: input.error?.trim() || null,
    lastEventCount: input.eventCount,
    lastCheckedAt: now,
    lastSuccessAt: isHardFailure ? (prev?.lastSuccessAt ?? null) : now,
    skipped,
    skipReason,
  };

  file.entries[key] = entry;
  file.updatedAt = now;
  return entry;
}

/** Record one scrape outcome and optionally persist. */
export async function recordSourceOutcome(
  input: SourceOutcomeInput,
): Promise<SourceHealthEntry> {
  const file = await loadSourceHealth();
  const entry = applyOutcome(file, input);
  await persistSourceHealth(file);
  if (entry.skipped) {
    console.warn(
      `[scrape.source-health] SKIP next runs: ${entry.key} — ${entry.skipReason}`,
    );
  }
  return entry;
}

export async function recordAdapterResult(
  result: AdapterResult,
  meta?: { url?: string | null; name?: string | null },
): Promise<SourceHealthEntry> {
  const sourceMeta = SCRAPING_SOURCES.find((s) => s.adapterId === result.source);
  return recordSourceOutcome({
    key: adapterHealthKey(result.source),
    url: meta?.url ?? sourceMeta?.url ?? null,
    adapterId: result.source,
    name: meta?.name ?? sourceMeta?.name ?? result.source,
    eventCount: result.events.length,
    error: result.error ?? null,
  });
}

export async function recordUrlResult(input: {
  url: string;
  eventCount: number;
  error?: string | null;
  adapterId?: string | null;
  name?: string | null;
}): Promise<SourceHealthEntry> {
  return recordSourceOutcome({
    key: urlHealthKey(input.url),
    url: input.url,
    adapterId: input.adapterId ?? 'venue-web',
    name: input.name ?? null,
    eventCount: input.eventCount,
    error: input.error ?? null,
  });
}

/** Sources marked skipped (ready for your manual review). */
export async function listSkippedSources(): Promise<SourceHealthEntry[]> {
  const file = await loadSourceHealth();
  return Object.values(file.entries)
    .filter((e) => e.skipped)
    .sort((a, b) => (b.lastCheckedAt ?? '').localeCompare(a.lastCheckedAt ?? ''));
}

/** All unhealthy entries (failures / empty), including not-yet-skipped. */
export async function listProblemSources(): Promise<SourceHealthEntry[]> {
  const file = await loadSourceHealth();
  return Object.values(file.entries)
    .filter((e) => e.skipped || e.consecutiveFailures > 0 || e.lastStatus !== 'ok')
    .sort((a, b) => b.consecutiveFailures - a.consecutiveFailures);
}

/** Clear skip flag / counters so the source is scraped again. */
export async function reviveSource(key: string): Promise<SourceHealthEntry | null> {
  const file = await loadSourceHealth();
  const normalized = normalizeKey(key);
  const entry = file.entries[normalized];
  if (!entry) return null;
  entry.consecutiveFailures = 0;
  entry.skipped = false;
  entry.skipReason = null;
  file.updatedAt = new Date().toISOString();
  await persistSourceHealth(file);
  return entry;
}

export function formatHealthEntryLine(entry: SourceHealthEntry): string {
  const label = entry.name || entry.adapterId || entry.key;
  const where = entry.url ?? entry.key;
  return [
    entry.skipped ? 'SKIP' : entry.lastStatus.toUpperCase(),
    `x${entry.consecutiveFailures}`,
    label,
    where,
    entry.lastError ? `— ${entry.lastError.slice(0, 120)}` : `— ${entry.lastEventCount} event(s)`,
  ].join(' | ');
}

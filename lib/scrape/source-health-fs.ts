/**
 * Node-only disk I/O for scrape source health.
 * Never import this from Edge / Cloudflare Workers routes — only from local scripts.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  attachSourceHealthDisk,
  type SourceHealthFile,
} from '@/lib/scrape/source-health';

const HEALTH_RELATIVE_PATH = 'lib/scrape/source-health.json';

function healthFilePath(): string {
  return path.join(process.cwd(), HEALTH_RELATIVE_PATH);
}

async function loadFromDisk(): Promise<SourceHealthFile | null> {
  try {
    const raw = await fs.readFile(healthFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as SourceHealthFile;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? null,
      entries: parsed.entries ?? {},
    };
  } catch {
    return null;
  }
}

async function persistToDisk(file: SourceHealthFile): Promise<boolean> {
  try {
    await fs.writeFile(healthFilePath(), `${JSON.stringify(file, null, 2)}\n`, 'utf8');
    return true;
  } catch (err) {
    console.warn(
      '[scrape.source-health] write failed — skip list not persisted:',
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Wire disk load/persist into the edge-safe health module (Node scripts only). */
export function enableSourceHealthDisk(): void {
  attachSourceHealthDisk({ load: loadFromDisk, persist: persistToDisk });
}

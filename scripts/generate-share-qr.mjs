#!/usr/bin/env node
/**
 * Generate a shareable QR PNG for beta testers.
 *
 * Usage:
 *   node scripts/generate-share-qr.mjs
 *   node scripts/generate-share-qr.mjs https://your-tunnel.loca.lt
 *   node scripts/generate-share-qr.mjs http://192.168.1.155:3000/beta
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const target =
  process.argv[2]?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  'http://192.168.1.155:3000/beta';

const outDir = path.join(root, 'public', 'share');
const outFile = path.join(outDir, 'sportsync-beta-qr.png');

await mkdir(outDir, { recursive: true });
await QRCode.toFile(outFile, target, {
  width: 1024,
  margin: 2,
  color: { dark: '#FFFFFF', light: '#131313' },
  errorCorrectionLevel: 'H',
});

console.log(`QR saved: ${outFile}`);
console.log(`Points to: ${target}`);

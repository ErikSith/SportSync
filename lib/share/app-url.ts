/** Public URL used for QR codes / beta invites. */
export function resolveShareAppUrl(hostHeader?: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (hostHeader) {
    const host = hostHeader.split(',')[0]?.trim();
    if (host && !host.startsWith('0.0.0.0')) {
      const proto = host.includes('localhost') || host.startsWith('192.168.') ? 'http' : 'https';
      return `${proto}://${host}`;
    }
  }

  return 'https://sportsync-ct5.pages.dev';
}

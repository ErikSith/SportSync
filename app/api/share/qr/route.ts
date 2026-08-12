import QRCode from 'qrcode';
import { NextRequest, NextResponse } from 'next/server';
import { resolveShareAppUrl } from '@/lib/share/app-url';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const target =
    searchParams.get('url')?.trim() ||
    resolveShareAppUrl(request.headers.get('x-forwarded-host') ?? request.headers.get('host'));

  const png = await QRCode.toBuffer(target, {
    type: 'png',
    width: 512,
    margin: 2,
    color: { dark: '#FFFFFF', light: '#131313FF' },
    errorCorrectionLevel: 'M',
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': `inline; filename="sportsync-qr.png"`,
    },
  });
}

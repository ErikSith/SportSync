import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveShareAppUrl } from '@/lib/share/app-url';

export const runtime = 'edge';

export const metadata = {
  title: 'SportSync Beta — Nainštaluj si appku',
  description: 'Naskenuj QR kód a pridaj SportSync na plochu telefónu.',
};

export default function BetaInstallPage() {
  const host = headers().get('x-forwarded-host') ?? headers().get('host');
  const appUrl = resolveShareAppUrl(host);
  const qrSrc = `/api/share/qr?url=${encodeURIComponent(appUrl)}`;

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-container-margin-mobile pb-12 pt-10">
      <div className="flex flex-col gap-2 text-center">
        <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-primary-container">
          SportSync Beta
        </p>
        <h1 className="font-headline-lg text-white">Nainštaluj si appku</h1>
        <p className="font-body-md text-on-surface-variant">
          Naskenuj QR kód, otvor v prehliadači a pridaj SportSync na plochu — spustí sa na celú
          obrazovku ako natívna appka (PWA).
        </p>
      </div>

      <div className="mx-auto flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-surface-container-lowest/60 p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR kód pre ${appUrl}`}
          width={256}
          height={256}
          className="rounded-xl"
        />
        <p className="break-all text-center font-body-sm text-zinc-400">{appUrl}</p>
        <a
          href={qrSrc}
          download="sportsync-beta-qr.png"
          className="rounded-full border border-white/14 bg-white/[0.06] px-4 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
        >
          Stiahnuť QR obrázok
        </a>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="font-headline-sm text-white">iPhone (Safari)</h2>
        <ol className="list-decimal space-y-1 pl-5 font-body-sm text-on-surface-variant">
          <li>Naskenuj QR kód fotoaparátom</li>
          <li>Otvor odkaz v Safari</li>
          <li>Klikni na Zdieľať → <strong className="text-zinc-300">Pridať na plochu</strong></li>
        </ol>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <h2 className="font-headline-sm text-white">Android (Chrome)</h2>
        <ol className="list-decimal space-y-1 pl-5 font-body-sm text-on-surface-variant">
          <li>Naskenuj QR kód</li>
          <li>Otvor v Chrome</li>
          <li>
            Menu ⋮ → <strong className="text-zinc-300">Pridať na plochu</strong> alebo{' '}
            <strong className="text-zinc-300">Inštalovať appku</strong> (Chrome ponúkne priamo)
          </li>
        </ol>
      </section>

      <Link
        href="/events"
        className="mx-auto rounded-full bg-primary-container px-6 py-3 font-label-caps text-[11px] uppercase tracking-[0.14em] text-on-primary-container transition active:scale-[0.98]"
      >
        Vstúpiť do appky
      </Link>
    </main>
  );
}

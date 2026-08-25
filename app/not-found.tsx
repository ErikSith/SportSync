import Link from 'next/link';

export const runtime = 'edge';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-container-margin-mobile bg-background">
      <div className="glass-panel rounded-2xl p-8 max-w-md w-full text-center space-y-4 border border-white/10">
        <span className="material-symbols-outlined text-tertiary-container text-4xl">
          search_off
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Stránka nenájdená</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Táto adresa neexistuje alebo bola presunutá.
        </p>
        <Link
          href="/"
          className="inline-block w-full py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps hover:brightness-110 transition-all"
        >
          Späť na domov
        </Link>
      </div>
    </main>
  );
}

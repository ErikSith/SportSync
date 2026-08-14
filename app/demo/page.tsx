import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { SHOWCASE_CARDS } from '@/lib/demo/showcase';

export const runtime = 'edge';

export default async function DemoPage() {
  await getPageViewer();

  return (
    <>
      <header className="bg-background/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/10 shadow-2xl shadow-black/40">
        <div className="flex justify-between items-center px-container-margin-mobile h-16 w-full max-w-screen-xl mx-auto">
          <Link href="/" className="text-primary hover:opacity-80 active:scale-95 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-label-caps text-label-caps hidden md:inline">Home</span>
          </Link>
          <Link href="/" className="font-display-lg-mobile text-display-lg-mobile font-bold tracking-tighter gradient-text">
            SPORTSYNC
          </Link>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 pb-28 px-container-margin-mobile md:px-container-margin-desktop max-w-screen-xl mx-auto flex flex-col gap-gutter">
        <section className="space-y-3">
          <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Design Showcase</p>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
            Live Demo Pages
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Illustrative records seeded for each tab. Open any card to preview the full Stitch-style detail layout with real
            data from Supabase.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SHOWCASE_CARDS.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="glass-card rounded-xl p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300 border border-white/10 hover:border-primary-container/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/10 group-hover:border-secondary/40 transition-colors">
                  <span className="material-symbols-outlined text-primary text-2xl">{card.icon}</span>
                </div>
                <span className="font-label-caps text-[10px] text-secondary uppercase tracking-widest bg-secondary/10 border border-secondary/30 px-2 py-1 rounded-full">
                  {card.badge}
                </span>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-tertiary uppercase mb-1">{card.tab}</p>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-2">{card.title}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">{card.subtitle}</p>
              </div>
              <span className="font-label-caps text-label-caps text-primary-container flex items-center gap-1 mt-auto group-hover:gap-2 transition-all">
                VIEW DETAIL PAGE
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </span>
            </Link>
          ))}
        </section>

        <section className="glass-panel rounded-xl p-6 text-sm text-on-surface-variant">
          <p>
            Demo IDs are fixed in <code className="text-secondary">lib/demo/showcase.ts</code>. Re-run{' '}
            <code className="text-secondary">npm run seed</code> to refresh showcase data without changing URLs.
          </p>
        </section>
      </main>

    </>
  );
}

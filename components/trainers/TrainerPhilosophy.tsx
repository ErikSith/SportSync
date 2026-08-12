import { SHOWCASE_PHILOSOPHY } from '@/lib/demo/showcase-trainer-content';

export function TrainerPhilosophy() {
  return (
    <section>
      <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Coaching Philosophy</h2>
      <div className="glass-panel rounded-xl p-6 md:p-8">
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{SHOWCASE_PHILOSOPHY}</p>
      </div>
    </section>
  );
}

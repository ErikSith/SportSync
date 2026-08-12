import { SHOWCASE_HERO_IMAGE, DEFAULT_HERO_FALLBACK } from '@/lib/demo/showcase-trainer-content';

interface TrainerDetailHeroProps {
  name: string;
  specialty: string;
  city: string | null;
  heroImage: string | null;
  isShowcase: boolean;
  isElite: boolean;
  seasonPts: number;
}

export function TrainerDetailHero({
  name,
  specialty,
  city,
  heroImage,
  isShowcase,
  isElite,
  seasonPts,
}: TrainerDetailHeroProps) {
  const image =
    isShowcase ? SHOWCASE_HERO_IMAGE : (heroImage ?? DEFAULT_HERO_FALLBACK);

  return (
    <section className="relative rounded-xl overflow-hidden mb-12 shadow-2xl">
      <div className="h-64 md:h-96 w-full relative">
        <div
          className="bg-cover bg-center w-full h-full absolute inset-0"
          style={{ backgroundImage: `url('${image}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {isElite && (
              <span className="bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-3 py-1 rounded-full flex items-center gap-1 border border-secondary/30">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Elite Certified
              </span>
            )}
            {isElite && seasonPts > 0 && (
              <span className="bg-surface-container-high/80 backdrop-blur-sm text-on-surface-variant font-label-caps text-label-caps px-3 py-1 rounded-full border border-white/10">
                {seasonPts.toLocaleString()} season pts
              </span>
            )}
          </div>
          <h1 className="text-display-lg-mobile md:text-display-lg font-bold text-on-background mb-2 tracking-tighter">
            {name}
          </h1>
          <p className="font-headline-md text-headline-md text-secondary tracking-tight">{specialty}</p>
          {city && (
            <p className="font-label-caps text-label-caps text-on-surface-variant mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {city}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

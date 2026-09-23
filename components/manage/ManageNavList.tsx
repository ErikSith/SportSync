import Link from 'next/link';
import type { ReactNode } from 'react';

export interface ManageNavItem {
  key: string;
  href?: string;
  icon: string;
  label: string;
  hint: string;
  /** Soft accent on the icon tile (defaults to secondary / organizer). */
  accent?: 'secondary' | 'primary' | 'programs';
  comingSoon?: boolean;
}

const ACCENT_TILE: Record<NonNullable<ManageNavItem['accent']>, string> = {
  secondary: 'bg-secondary/15 text-secondary',
  primary: 'bg-primary-container/15 text-primary-container',
  programs: 'bg-teal-400/15 text-teal-300',
};

interface ManageNavListProps {
  items: ManageNavItem[];
  comingSoonLabel: string;
}

/** Profile-style stacked rows for manage hub actions / venues / upcoming. */
export function ManageNavList({ items, comingSoonLabel }: ManageNavListProps) {
  return (
    <nav className="overflow-hidden rounded-2xl border border-white/8 bg-surface-container">
      {items.map((item, index) => {
        const tile = ACCENT_TILE[item.accent ?? 'secondary'];
        const rowClass = `flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors ${
          index > 0 ? 'border-t border-white/6' : ''
        }`;

        const inner = (
          <>
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile}`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="block font-body-md text-sm font-semibold text-on-surface">
                  {item.label}
                </span>
                {item.comingSoon ? (
                  <span className="rounded-full border border-white/10 px-1.5 py-0.5 font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant">
                    {comingSoonLabel}
                  </span>
                ) : null}
              </span>
              <span className="block font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                {item.hint}
              </span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant/70">
              {!item.href ? 'schedule' : 'chevron_right'}
            </span>
          </>
        );

        if (!item.href) {
          return (
            <div key={item.key} className={`${rowClass} opacity-70`} aria-disabled>
              {inner}
            </div>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`${rowClass} active:bg-white/5`}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

interface ManageSectionProps {
  title: string;
  children: ReactNode;
}

export function ManageSection({ title, children }: ManageSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="px-0.5 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
        {title}
      </h2>
      {children}
    </section>
  );
}

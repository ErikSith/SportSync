'use client';

import { useState, type ReactNode } from 'react';

interface ProfileDetailsAccordionProps {
  children: ReactNode;
}

export function ProfileDetailsAccordion({ children }: ProfileDetailsAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="glass-panel rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-container/20 transition-colors"
        aria-expanded={open}
      >
        <span className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface">More</span>
        <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-8 border-t border-white/5 pt-5">
          {children}
        </div>
      )}
    </section>
  );
}

interface ProfileDetailsSectionProps {
  title: string;
  children: ReactNode;
}

export function ProfileDetailsSection({ title, children }: ProfileDetailsSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest">{title}</h3>
      {children}
    </div>
  );
}

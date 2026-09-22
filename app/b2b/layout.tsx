import type { ReactNode } from 'react';

/** B2B OnePager — full viewport, no app chrome padding. */
export default function B2BLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-background">{children}</div>
  );
}

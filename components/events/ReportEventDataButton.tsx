'use client';

import { useState } from 'react';
import { ReportEventDataModal } from '@/components/events/ReportEventDataModal';

interface ReportEventDataButtonProps {
  eventId: string;
  eventTitle?: string;
  className?: string;
}

export function ReportEventDataButton({
  eventId,
  eventTitle,
  className,
}: ReportEventDataButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex items-center gap-1.5 font-label-caps text-[10px] uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:text-orange-300/90'
        }
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden>
          flag
        </span>
        Nahlásiť nesprávne údaje
      </button>
      <ReportEventDataModal
        eventId={eventId}
        eventTitle={eventTitle}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

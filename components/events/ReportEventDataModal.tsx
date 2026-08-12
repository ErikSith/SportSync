'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  EVENT_REPORT_REASONS,
  type EventReportReason,
} from '@/lib/constants/event-sources';
import { trackSignal } from '@/lib/telemetry/track';

interface ReportEventDataModalProps {
  eventId: string;
  eventTitle?: string;
  open: boolean;
  onClose: () => void;
}

export function ReportEventDataModal({
  eventId,
  eventTitle,
  open,
  onClose,
}: ReportEventDataModalProps) {
  const titleId = useId();
  const [reason, setReason] = useState<EventReportReason>('changed_datetime');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setReason('changed_datetime');
    setDetails('');
    setError(null);
    setDone(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          details: details.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Nepodarilo sa odoslať nahlásenie');
        return;
      }
      trackSignal('event.report', { eventId, reason });
      setDone(true);
    });
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Zavrieť"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[141] w-full max-w-md overflow-hidden rounded-t-3xl border border-outline-variant/30 border-b-0 bg-[#161210] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:rounded-2xl sm:border-b"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="font-headline-md text-[18px] text-on-background">
                  Nahlásiť nesprávne údaje
                </h2>
                {eventTitle ? (
                  <p className="mt-1 truncate font-body-md text-xs text-on-surface-variant">
                    {eventTitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-background/70 text-on-surface transition-colors hover:border-primary-container/40 hover:text-primary"
                aria-label="Zavrieť"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              {done ? (
                <div className="rounded-xl border border-secondary/30 bg-secondary-container/15 px-4 py-5 text-center">
                  <span
                    className="material-symbols-outlined mb-2 text-[28px] text-secondary-fixed"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden
                  >
                    check_circle
                  </span>
                  <p className="font-body-md text-sm text-on-surface">
                    Ďakujeme. Nahlásenie sme prijali a skontrolujeme údaje čo najskôr.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-4 w-full rounded-xl bg-inverse-primary py-3 font-label-caps text-[11px] uppercase tracking-[0.14em] text-white"
                  >
                    Zavrieť
                  </button>
                </div>
              ) : (
                <>
                  <label className="block space-y-1.5">
                    <span className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-tertiary">
                      Dôvod
                    </span>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as EventReportReason)}
                      className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-3 font-body-md text-sm text-on-surface outline-none focus:border-primary-container/50"
                    >
                      {EVENT_REPORT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-tertiary">
                      Popis (voliteľné)
                    </span>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Napr. správny čas, odkaz na oficiálny príspevok…"
                      className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-3 font-body-md text-sm text-on-surface outline-none placeholder:text-outline-variant focus:border-primary-container/50"
                    />
                  </label>

                  {error ? <p className="text-center text-xs text-error">{error}</p> : null}

                  <button
                    type="button"
                    onClick={submit}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-inverse-primary py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-primary-container disabled:opacity-50"
                  >
                    {isPending ? 'Odosielam…' : 'Odoslať nahlásenie'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

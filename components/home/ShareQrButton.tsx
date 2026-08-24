'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const SHARE_URL = 'https://sportsync-ct5.pages.dev';
const QR_IMAGE_SRC = '/share/sportsync-qr.png?v=3';

export function ShareQrButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Zobraziť QR kód na pripojenie"
        className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant/40 bg-surface-container-high/70 text-primary transition-colors hover:border-primary-container/50 hover:text-primary-fixed-dim active:scale-95"
      >
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-container/15 via-transparent to-secondary/10 opacity-80"
          aria-hidden
        />
        <span className="material-symbols-outlined relative text-[22px]" aria-hidden>
          qr_code_2
        </span>
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6"
                  role="presentation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.button
                    type="button"
                    aria-label="Zavrieť"
                    className="absolute inset-0 bg-black/75 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setOpen(false)}
                  />

                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    className="glass-panel relative z-[121] w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 border-b-0 sm:rounded-3xl sm:border-b"
                    initial={{ y: '100%', opacity: 0.85 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0.85 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.85 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="h-0.5 w-full bg-gradient-to-r from-primary-container via-secondary to-primary-container"
                      aria-hidden
                    />

                    <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
                      <span className="h-1 w-10 rounded-full bg-white/20" />
                    </div>

                    <div className="relative px-6 pb-2 pt-5 text-center sm:pt-7">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="absolute right-3 top-3 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-primary"
                        aria-label="Zavrieť"
                      >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                      </button>

                      <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-primary-container">
                        SportSync Beta
                      </p>
                      <h2 id={titleId} className="mt-1.5 font-headline-md text-[22px] text-on-surface">
                        Pripoj sa
                      </h2>
                      <p className="mx-auto mt-2 max-w-[18rem] font-body-md text-sm text-on-surface-variant">
                        Naskenuj QR kód a otvor SportSync vo svojom telefóne.
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-5 px-6 pb-9 pt-3">
                      <motion.div
                        className="relative rounded-2xl p-[1px] shadow-[0_24px_70px_rgba(200,75,36,0.22)]"
                        style={{
                          background:
                            'linear-gradient(145deg, rgba(200,75,36,0.55), rgba(233,195,73,0.35), rgba(255,181,160,0.2))',
                        }}
                        initial={{ scale: 0.88, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.08, type: 'spring', stiffness: 360, damping: 24 }}
                      >
                        <div className="rounded-2xl bg-white p-4 sm:p-5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={QR_IMAGE_SRC}
                            alt={`QR kód pre ${SHARE_URL}`}
                            width={280}
                            height={280}
                            className="h-[min(68vw,280px)] w-[min(68vw,280px)] object-contain"
                            draggable={false}
                          />
                        </div>
                      </motion.div>

                      <div className="w-full space-y-3 text-center">
                        <p className="break-all font-body-sm text-xs text-zinc-400">{SHARE_URL}</p>
                        <a
                          href={QR_IMAGE_SRC}
                          download="sportsync-qr.png"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-primary-container/35 bg-primary-container/15 px-4 py-2.5 font-label-caps text-[10px] uppercase tracking-[0.14em] text-primary-fixed transition hover:border-primary-container/55 hover:bg-primary-container/25"
                        >
                          <span className="material-symbols-outlined text-[16px]" aria-hidden>
                            download
                          </span>
                          Stiahnuť QR
                        </a>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/data/profile-shared';
import { VerifiedBadge } from '@/components/profile/VerifiedBadge';
import {
  formatSkPhoneDisplay,
  formatUserError,
  generateBackupCodes,
  isVerifiedPlayer,
  normalizeSkPhone,
  parseApiErrorPayload,
} from '@/lib/profile/verification';
import { initialsFromName } from '@/lib/utils/initials';

interface ProfileSettingsFormProps {
  profile: Profile;
  authEmailVerified: boolean;
}

type MfaEnrollState = {
  factorId: string;
  secret: string;
  uri: string;
  qrSvg: string | null;
};

export function ProfileSettingsForm({ profile, authEmailVerified }: ProfileSettingsFormProps) {
  const router = useRouter();
  const contactRef = useRef<HTMLDivElement>(null);

  const displayName = profile.fullName ?? profile.username;

  const [email, setEmail] = useState(profile.email);
  const [emailVerified, setEmailVerified] = useState(profile.isEmailVerified || authEmailVerified);
  const [phone, setPhone] = useState(formatSkPhoneDisplay(profile.phoneNumber));
  const [is2faEnabled, setIs2faEnabled] = useState(profile.is2faEnabled);

  const [emailBusy, setEmailBusy] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaEnroll, setMfaEnroll] = useState<MfaEnrollState | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const syncSecurityState = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/security');
      if (!res.ok) return;
      const data = (await res.json()) as {
        profile: Profile;
        auth?: { isEmailVerified: boolean; is2faEnabled: boolean };
      };
      if (data.profile) {
        setEmailVerified(data.profile.isEmailVerified);
        setIs2faEnabled(data.profile.is2faEnabled);
        setPhone(formatSkPhoneDisplay(data.profile.phoneNumber));
      }
      if (data.auth) {
        setEmailVerified(data.auth.isEmailVerified);
        setIs2faEnabled(data.auth.is2faEnabled);
      }
    } catch {
      // Non-fatal — form still usable with server props
    }
  }, []);

  useEffect(() => {
    void syncSecurityState();
  }, [syncSecurityState]);

  useEffect(() => {
    if (!mfaEnroll?.uri || mfaEnroll.qrSvg) return;
    void QRCode.toString(mfaEnroll.uri, { type: 'svg', margin: 1, width: 200 })
      .then((svg) => setMfaEnroll((prev) => (prev ? { ...prev, qrSvg: svg } : prev)))
      .catch(() => undefined);
  }, [mfaEnroll]);

  function scrollToContact() {
    contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function resendEmailVerification() {
    setError(null);
    setMessage(null);
    setEmailBusy(true);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      if (resendError) throw resendError;
      setMessage('Overovací odkaz bol odoslaný na tvoj email.');
    } catch (err) {
      setError(formatUserError(err, 'Nepodarilo sa odoslať overovací email.'));
    } finally {
      setEmailBusy(false);
    }
  }

  async function savePhoneNumber() {
    setError(null);
    setMessage(null);
    const normalized = normalizeSkPhone(phone);
    if (!normalized) {
      setError('Zadaj platné slovenské mobilné číslo (+421 9XX XXX XXX).');
      return;
    }

    setPhoneBusy(true);
    try {
      const res = await fetch('/api/profile/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalized }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(parseApiErrorPayload(data, 'Nepodarilo sa uložiť telefónne číslo.'));
      }

      setPhone(formatSkPhoneDisplay(normalized));
      setMessage('Telefónne číslo bolo uložené. Nikomu sa nezobrazí — slúži len na ochranu pred falošnými účtami.');
      router.refresh();
    } catch (err) {
      setError(formatUserError(err, 'Nepodarilo sa uložiť telefónne číslo.'));
    } finally {
      setPhoneBusy(false);
    }
  }

  async function startMfaEnroll() {
    setError(null);
    setMessage(null);
    setMfaBusy(true);
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (enrollError || !data) {
        throw new Error(formatUserError(enrollError, 'Nepodarilo sa spustiť 2FA registráciu.'));
      }

      const totp = data.totp;
      if (!totp?.secret || !totp.uri) throw new Error('Chýbajú TOTP údaje z Auth služby.');

      let qrSvg: string | null = null;
      if (totp.qr_code?.startsWith('data:image')) {
        qrSvg = totp.qr_code;
      } else if (totp.qr_code?.includes('<svg')) {
        qrSvg = totp.qr_code;
      }

      setMfaEnroll({
        factorId: data.id,
        secret: totp.secret,
        uri: totp.uri,
        qrSvg,
      });
    } catch (err) {
      setError(formatUserError(err, 'Nepodarilo sa spustiť 2FA registráciu.'));
    } finally {
      setMfaBusy(false);
    }
  }

  async function confirmMfaEnroll() {
    if (!mfaEnroll || mfaCode.length !== 6) {
      setError('Zadaj 6-miestny kód z Authenticator aplikácie.');
      return;
    }

    setMfaBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaEnroll.factorId,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      await fetch('/api/profile/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is2faEnabled: true, syncFromAuth: true }),
      });

      setIs2faEnabled(true);
      setBackupCodes(generateBackupCodes());
      setMfaEnroll(null);
      setMfaCode('');
      setMessage('Dvojfázové overenie je aktívne.');
      router.refresh();
    } catch (err) {
      setError(formatUserError(err, 'Neplatný TOTP kód.'));
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableMfa() {
    setMfaBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactors = factors?.totp ?? [];
      for (const factor of totpFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      await fetch('/api/profile/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is2faEnabled: false }),
      });

      setIs2faEnabled(false);
      setMfaEnroll(null);
      setBackupCodes(null);
      setMessage('2FA bolo vypnuté.');
      router.refresh();
    } catch (err) {
      setError(formatUserError(err, 'Nepodarilo sa vypnúť 2FA.'));
    } finally {
      setMfaBusy(false);
    }
  }

  async function copySecret(fallbackMessage?: string) {
    if (!mfaEnroll?.secret) return false;
    try {
      await navigator.clipboard.writeText(mfaEnroll.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2500);
      if (fallbackMessage) {
        setError(null);
        setMessage(fallbackMessage);
      }
      return true;
    } catch {
      setError('Kopírovanie zlyhalo — skopíruj kľúč manuálne.');
      return false;
    }
  }

  async function openAuthenticatorApp() {
    if (!mfaEnroll?.uri) return;

    setError(null);
    setMessage(null);

    if (!isMobileViewport) {
      await copySecret(
        'Tajný kľúč skopírovaný! Otvorte svoju Authenticator aplikáciu v telefóne a vložte kľúč manuálne.',
      );
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = mfaEnroll.uri;
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      await copySecret(
        'Tajný kľúč skopírovaný! Otvorte svoju Authenticator aplikáciu v telefóne a vložte kľúč manuálne.',
      );
    }
  }

  const verified = isVerifiedPlayer({ isEmailVerified: emailVerified, isPhoneVerified: false });

  return (
    <div className="flex flex-col gap-5">
      {/* Profile header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/8 bg-[#1F1F1F] p-5"
      >
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-[#FF5722]/40">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#121212] text-lg font-bold text-white">
                {initialsFromName(displayName)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-white">{displayName}</h2>
            <p className="text-xs text-gray-400">@{profile.username}</p>
            <div className="mt-2">
              <VerifiedBadge
                isEmailVerified={emailVerified}
                isPhoneVerified={false}
                onUnverifiedClick={scrollToContact}
              />
            </div>
          </div>
        </div>
      </motion.section>

      {(message || error) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-xl px-4 py-3 text-sm ${error ? 'border border-red-500/30 bg-red-500/10 text-red-300' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}
        >
          {typeof error === 'string' && error ? error : message ?? ''}
        </motion.div>
      )}

      {/* Contact details */}
      <motion.section
        ref={contactRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4 rounded-2xl border border-white/8 bg-[#1F1F1F] p-5"
      >
        <div>
          <h3 className="text-sm font-bold text-white">Kontaktné údaje</h3>
          <p className="mt-1 text-xs text-gray-400">
            Over email pre odznak Overeného Hráča.
          </p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={email}
              readOnly
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#121212] px-3 py-2.5 text-sm text-white"
            />
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                emailVerified
                  ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                  : 'border border-amber-500/40 bg-amber-500/15 text-amber-400'
              }`}
            >
              {emailVerified ? 'Overený' : 'Neoverený'}
            </span>
          </div>
          {!emailVerified && (
            <button
              type="button"
              disabled={emailBusy}
              onClick={() => void resendEmailVerification()}
              className="rounded-xl border border-[#FF5722]/50 bg-[#FF5722]/15 px-4 py-2 text-xs font-semibold text-[#FF7F50] transition hover:bg-[#FF5722]/25 disabled:opacity-50"
            >
              {emailBusy ? 'Odosielam…' : 'Poslať overovací odkaz'}
            </button>
          )}
        </div>
      </motion.section>

      {/* Phone — private anti-fake registration */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="space-y-4 rounded-2xl border border-white/8 bg-[#1F1F1F] p-5"
      >
        <div>
          <h3 className="text-sm font-bold text-white">Overenie identity</h3>
          <p className="mt-1 text-xs text-gray-400">
            Telefónne číslo nikomu nezobrazujeme. Jeden účet na jedno číslo — ochrana pred falošnými profilmi.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Telefónne číslo (súkromné)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+421 9XX XXX XXX"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#121212] px-3 py-2.5 text-sm text-white placeholder:text-gray-600"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={phoneBusy}
              onClick={() => void savePhoneNumber()}
              className="rounded-xl border border-[#FF5722]/50 bg-[#FF5722]/15 px-4 py-2 text-xs font-semibold text-[#FF7F50] transition hover:bg-[#FF5722]/25 disabled:opacity-50"
            >
              {phoneBusy ? 'Ukladám…' : 'Uložiť telefón'}
            </button>
          </div>
        </div>
      </motion.section>

      {/* 2FA — TOTP via Authenticator app */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4 rounded-2xl border border-white/8 bg-[#1F1F1F] p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Dvojfázové overenie (2FA)</h3>
            <p className="mt-1 text-xs text-gray-400">
              Chráň účet TOTP kódom cez Google Authenticator, Authy alebo Apple Passwords.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={is2faEnabled}
            disabled={mfaBusy}
            onClick={() => {
              if (is2faEnabled) void disableMfa();
              else void startMfaEnroll();
            }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              is2faEnabled ? 'bg-[#FF5722]' : 'bg-gray-600'
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                is2faEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <AnimatePresence>
          {mfaEnroll && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4 rounded-xl border border-[#FF5722]/25 bg-[#121212] p-4"
            >
              <p className="text-xs text-gray-400">
                {isMobileViewport
                  ? 'Otvor priamo v Authenticator aplikácii na mobile.'
                  : 'Naskenuj QR kód fotoaparátom mobilu alebo skopíruj tajný kľúč.'}
              </p>

              {isMobileViewport && (
                <button
                  type="button"
                  onClick={() => void openAuthenticatorApp()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5722] px-4 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
                >
                  📲 Otvoriť v Authenticator Aplikácii
                </button>
              )}

              <div className="hidden md:block">
                <div className="flex justify-center">
                  {mfaEnroll.qrSvg ? (
                    mfaEnroll.qrSvg.startsWith('data:') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mfaEnroll.qrSvg} alt="TOTP QR kód" className="h-48 w-48 rounded-lg bg-white p-2" />
                    ) : (
                      <div
                        className="rounded-lg bg-white p-2 [&>svg]:h-48 [&>svg]:w-48"
                        dangerouslySetInnerHTML={{ __html: mfaEnroll.qrSvg }}
                      />
                    )
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-lg bg-white/5 text-xs text-gray-500">
                      Načítavam QR…
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">Tajný kľúč</p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-[#FF7F50]">
                      {mfaEnroll.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copySecret()}
                      className="shrink-0 rounded-lg border border-[#FF5722]/40 bg-[#FF5722]/10 px-3 py-2 text-xs font-semibold text-[#FF7F50] hover:bg-[#FF5722]/20"
                    >
                      {secretCopied ? 'Skopírované' : '📋 Skopírovať tajný kľúč'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wide text-gray-500">
                  6-miestny kód z aplikácie
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="flex-1 rounded-xl border border-white/10 bg-[#121212] px-3 py-2.5 text-center text-sm tracking-[0.4em] text-white"
                  />
                  <button
                    type="button"
                    disabled={mfaBusy || mfaCode.length !== 6}
                    onClick={() => void confirmMfaEnroll()}
                    className="rounded-xl bg-[#FF5722] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Aktivovať
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {backupCodes && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
            >
              <p className="text-xs font-semibold text-emerald-300">
                Záložné kódy — ulož si ich na bezpečné miesto (zobrazia sa len raz)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code) => (
                  <code
                    key={code}
                    className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center font-mono text-xs text-white"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {is2faEnabled && !mfaEnroll && (
          <p className="text-xs text-emerald-400">✓ Dvojfázové overenie je aktívne</p>
        )}
      </motion.section>

      {verified && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-gray-400"
        >
          Tvoj profil je plne overený — ostatní hráči ťa uvidia s odznakom 🛡️ v lobby.
        </motion.p>
      )}
    </div>
  );
}

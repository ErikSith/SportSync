'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { CrewAvatarStack } from '@/components/lobby/groups/CrewAvatarStack';
import { authedFetch } from '@/lib/auth/authed-fetch';
import { createClient } from '@/lib/supabase/client';

export interface LobbyChatMessage {
  id: string;
  author: string;
  authorId?: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
}

interface LobbyChatProps {
  lobbyId: string;
  /** Fixed-height panel under lobby info (not full-page). */
  compact?: boolean;
}

const POLL_MS = 8000;

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

/** Private match chat — visible only after join / host. */
export function LobbyChat({ lobbyId, compact = false }: LobbyChatProps) {
  const [messages, setMessages] = useState<LobbyChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [viewerName, setViewerName] = useState('Ty');
  const [viewerAvatarUrl, setViewerAvatarUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadViewer() {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || cancelled) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', auth.user.id)
        .maybeSingle();
      if (cancelled || !profile) return;
      setViewerName(
        (profile.full_name as string | null)?.trim() ||
          (profile.username as string | null) ||
          'Ty',
      );
      setViewerAvatarUrl((profile.avatar_url as string | null) ?? null);
    }
    void loadViewer();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMessages = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await authedFetch(`/api/lobbies/${lobbyId}/messages`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: LobbyChatMessage[] };
        setMessages(data.messages ?? []);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [lobbyId],
  );

  useEffect(() => {
    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    const optimistic: LobbyChatMessage = {
      id: `local-${Date.now()}`,
      author: viewerName,
      avatarUrl: viewerAvatarUrl,
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');

    try {
      const res = await authedFetch(`/api/lobbies/${lobbyId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(body);
        return;
      }
      const data = (await res.json()) as { message?: LobbyChatMessage };
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? data.message! : m)),
        );
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      className={
        compact
          ? 'flex h-full max-h-[200px] min-h-[140px] flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#1a1816]/80'
          : 'flex min-h-0 flex-1 flex-col overflow-hidden'
      }
    >
      <div className="flex shrink-0 items-center gap-1.5 px-3 py-1.5">
        <span className="material-symbols-outlined text-[14px] text-[#FF5722]">forum</span>
        <h3 className="font-label-caps text-[9px] uppercase tracking-[0.14em] text-zinc-500">
          Chat
        </h3>
      </div>

      <ul
        ref={listRef}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 pb-1"
      >
        {loading && messages.length === 0 ? (
          <li className="py-3 text-center text-[11px] text-zinc-600">Načítavam…</li>
        ) : null}
        {!loading && messages.length === 0 ? (
          <li className="py-3 text-center text-[11px] text-zinc-600">
            Napíš správu squadu…
          </li>
        ) : null}
        {messages.map((msg) => (
          <li key={msg.id} className="flex gap-1.5">
            <CrewAvatarStack
              people={[{ id: msg.id, name: msg.author, avatarUrl: msg.avatarUrl }]}
              size="xs"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[10px] font-semibold text-zinc-300">{msg.author}</p>
                <span className="shrink-0 text-[8px] text-zinc-600">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <p className="text-[12px] leading-snug text-zinc-400">{msg.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <form
        onSubmit={send}
        className="flex shrink-0 items-center gap-1.5 border-t border-white/[0.06] px-2 py-1.5"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Správa…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f0e0c] px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#FF5722]/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="rounded-lg bg-[#FF5722] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-40"
        >
          Poslať
        </button>
      </form>
    </section>
  );
}

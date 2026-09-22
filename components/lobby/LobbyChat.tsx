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
  /** Fill parent flex area (phone sheet). */
  compact?: boolean;
  /** Show chat chrome but block send until join. */
  locked?: boolean;
}

const POLL_MS = 8000;

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

/** Private match chat — write after join / host; locked preview before join. */
export function LobbyChat({ lobbyId, compact = false, locked = false }: LobbyChatProps) {
  const [messages, setMessages] = useState<LobbyChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(!locked);
  const [sending, setSending] = useState(false);
  const [viewerName, setViewerName] = useState('Ty');
  const [viewerAvatarUrl, setViewerAvatarUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (locked) return;
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
  }, [locked]);

  const loadMessages = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (locked) {
        setLoading(false);
        return;
      }
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
    [lobbyId, locked],
  );

  useEffect(() => {
    void loadMessages();
    if (locked) return;
    const timer = window.setInterval(() => {
      void loadMessages({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadMessages, locked]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || locked) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, locked]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (locked) return;
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
          ? 'relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#141210]'
          : 'relative flex min-h-0 flex-1 flex-col overflow-hidden'
      }
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] px-3 py-2">
        <span className="material-symbols-outlined text-[16px] text-[#FF5722]">forum</span>
        <h3 className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-zinc-400">
          Squad chat
        </h3>
        {locked ? (
          <span className="ml-auto font-label-caps text-[8px] uppercase tracking-[0.12em] text-zinc-600">
            Po pripojení
          </span>
        ) : null}
      </div>

      {locked ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <span className="material-symbols-outlined text-[22px] text-[#FF5722]">lock</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-200">Chat so squadom</p>
            <p className="text-[12px] leading-relaxed text-zinc-500">
              Pripoj sa tlačidlom dole — potom môžeš písať ostatným hráčom.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ul
            ref={listRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2"
          >
            {loading && messages.length === 0 ? (
              <li className="py-4 text-center text-[11px] text-zinc-600">Načítavam…</li>
            ) : null}
            {!loading && messages.length === 0 ? (
              <li className="py-4 text-center text-[11px] text-zinc-600">
                Napíš prvú správu squadu…
              </li>
            ) : null}
            {messages.map((msg) => (
              <li key={msg.id} className="flex gap-2">
                <CrewAvatarStack
                  people={[{ id: msg.id, name: msg.author, avatarUrl: msg.avatarUrl }]}
                  size="xs"
                />
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-white/[0.04] px-2.5 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[10px] font-semibold text-zinc-300">{msg.author}</p>
                    <span className="shrink-0 text-[8px] text-zinc-600">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] leading-snug text-zinc-300">{msg.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <form
            onSubmit={send}
            className="flex shrink-0 items-center gap-2 border-t border-white/[0.06] px-2 py-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Správa…"
              maxLength={2000}
              enterKeyHint="send"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#0f0e0c] px-3.5 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-[#FF5722]/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Poslať"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF5722] text-white transition active:scale-95 disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </>
      )}
    </section>
  );
}

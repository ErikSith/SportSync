'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { CrewAvatarStack } from '@/components/lobby/groups/CrewAvatarStack';

export interface CrewChatMessage {
  id: string;
  author: string;
  authorId?: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
}

interface CrewLockerRoomProps {
  groupId: string;
  viewerName: string;
  viewerAvatarUrl: string | null;
  /** Compact layout for CrewHub modal */
  compact?: boolean;
  /** Single latest-message preview (no composer) for one-screen hubs */
  teaser?: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Inline private crew chat — Locker Room Talk (no separate open-chat overlay). */
export function CrewLockerRoom({
  groupId,
  viewerName,
  viewerAvatarUrl,
  compact = false,
  teaser = false,
}: CrewLockerRoomProps) {
  const [messages, setMessages] = useState<CrewChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const latest = messages[messages.length - 1] ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/groups/${groupId}/messages`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: CrewChatMessage[] };
        if (!cancelled) setMessages(data.messages ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

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
    const optimistic: CrewChatMessage = {
      id: `local-${Date.now()}`,
      author: viewerName,
      avatarUrl: viewerAvatarUrl,
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(body);
        return;
      }
      const data = (await res.json()) as { message?: CrewChatMessage };
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

  if (teaser) {
    return (
      <section
        id="feed"
        className="shrink-0 rounded-[1.1rem] border border-white/[0.06] bg-[#1F1F1F] px-3 py-2.5"
      >
        <div className="mb-1.5 flex items-center gap-1.5 text-gray-400">
          <span className="material-symbols-outlined text-[16px] text-[#FF7F50]">forum</span>
          <h3 className="text-[12px] font-bold text-white">Locker Room Talk</h3>
        </div>
        {loading && !latest ? (
          <p className="text-[11px] text-gray-500">Loading…</p>
        ) : latest ? (
          <div className="flex gap-2">
            <CrewAvatarStack
              people={[{ id: latest.id, name: latest.author, avatarUrl: latest.avatarUrl }]}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[11px] font-bold text-white">{latest.author}</p>
                <span className="shrink-0 text-[9px] text-gray-500">{formatTime(latest.createdAt)}</span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-gray-300">{latest.body}</p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-gray-500">No messages yet.</p>
        )}
      </section>
    );
  }

  return (
    <section
      id="feed"
      className={
        compact
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.05] bg-[#1F1F1F] p-3'
          : 'flex min-h-[280px] flex-col rounded-2xl border border-white/[0.05] bg-[#1F1F1F] p-4'
      }
    >
      <div className={compact ? 'mb-2 shrink-0' : 'mb-3 shrink-0'}>
        <h3 className={compact ? 'text-[13px] font-bold text-white' : 'text-base font-bold text-white'}>
          Locker Room Talk
        </h3>
        <p className="mt-0.5 text-[10px] text-gray-500">Private crew chat</p>
      </div>

      <ul
        ref={listRef}
        className={`min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain ${compact ? 'pr-0.5' : 'pr-1'}`}
      >
        {loading && messages.length === 0 ? (
          <li className="py-6 text-center text-[12px] text-gray-500">Loading chat…</li>
        ) : null}
        {!loading && messages.length === 0 ? (
          <li className="py-6 text-center text-[12px] text-gray-500">
            No messages yet. Say hi to the crew.
          </li>
        ) : null}
        {messages.map((msg) => (
          <li key={msg.id} className="flex gap-2">
            <CrewAvatarStack
              people={[{ id: msg.id, name: msg.author, avatarUrl: msg.avatarUrl }]}
              size="sm"
            />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-[#121212]/80 px-2.5 py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[11px] font-bold text-white">{msg.author}</p>
                <span className="shrink-0 text-[9px] text-gray-500">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <p
                className={
                  compact
                    ? 'mt-0.5 text-[12px] leading-snug text-gray-300'
                    : 'mt-0.5 text-[13px] leading-snug text-gray-300'
                }
              >
                {msg.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <form
        onSubmit={send}
        className="mt-2 flex shrink-0 items-center gap-2 border-t border-white/5 pt-2"
      >
        <CrewAvatarStack
          people={[{ id: 'me', name: viewerName, avatarUrl: viewerAvatarUrl }]}
          size="sm"
        />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the crew…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-[#FF5722]/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="rounded-xl bg-[#FF5722] px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}

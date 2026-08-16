'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GroupMemberData } from '@/lib/data/sport-groups-shared';
import { CrewAvatarStack } from '@/components/lobby/groups/CrewAvatarStack';

interface ChatBubble {
  id: string;
  author: string;
  avatarUrl: string | null;
  time: string;
  body: string;
}

interface CrewLockerRoomProps {
  members: GroupMemberData[];
  groupId: string;
  viewerName: string;
  viewerAvatarUrl: string | null;
}

function buildPreview(members: GroupMemberData[]): ChatBubble[] {
  const a = members.find((m) => m.isOwner) ?? members[0];
  const b = members.find((m) => m.id !== a?.id) ?? members[1] ?? a;

  return [
    {
      id: '1',
      author: a?.name ?? 'Captain Mike',
      avatarUrl: a?.avatarUrl ?? null,
      time: '10:42 AM',
      body: 'We need 2 more for tomorrow. Anyone bringing a +1?',
    },
    {
      id: '2',
      author: b?.name ?? 'Sarah T.',
      avatarUrl: b?.avatarUrl ?? null,
      time: '11:15 AM',
      body: "I can ask Dave if he's free.",
    },
  ];
}

/** Locker Room Talk — preview + local compose until chat API lands. */
export function CrewLockerRoom({
  members,
  groupId,
  viewerName,
  viewerAvatarUrl,
}: CrewLockerRoomProps) {
  const [messages, setMessages] = useState<ChatBubble[]>(() => buildPreview(members));
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);

  function send() {
    const body = draft.trim();
    if (!body) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        author: viewerName,
        avatarUrl: viewerAvatarUrl,
        time: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        body,
      },
    ]);
    setDraft('');
    setExpanded(true);
  }

  const visible = expanded ? messages : messages.slice(0, 2);

  return (
    <section id="feed" className="rounded-2xl border border-white/[0.05] bg-[#1F1F1F] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white">Locker Room Talk</h3>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-[#FF7F50] transition hover:brightness-110"
        >
          Open Chat →
        </button>
      </div>

      <ul className="space-y-3">
        {visible.map((msg) => (
          <li key={msg.id} className="flex gap-2.5">
            <CrewAvatarStack
              people={[{ id: msg.id, name: msg.author, avatarUrl: msg.avatarUrl }]}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[12px] font-bold text-white">{msg.author}</p>
                <span className="shrink-0 text-[10px] text-gray-500">{msg.time}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-gray-300">{msg.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {expanded ? (
        <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Message the crew… (@name)"
            className="w-full resize-none rounded-xl border border-white/[0.06] bg-[#121212] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-[#FF5722]/50 focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={send}
              className="rounded-xl bg-[#FF5722] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-gray-500">
          Tip: tag mates with @name ·{' '}
          <Link href={`/lobby/groups/${groupId}`} className="text-[#FF7F50]">
            stay in crew
          </Link>
        </p>
      )}
    </section>
  );
}

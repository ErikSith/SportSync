'use client';

import { useMemo, useRef, useState } from 'react';
import type { GroupMemberData } from '@/lib/data/sport-groups-shared';
import { CrewAvatarStack } from '@/components/lobby/groups/CrewAvatarStack';

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface FeedPost {
  id: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAtLabel: string;
  poll?: {
    question: string;
    options: PollOption[];
    votedOptionId: string | null;
  };
}

interface CrewFeedProps {
  members: GroupMemberData[];
  viewerName: string;
  viewerAvatarUrl: string | null;
}

function buildSeedPosts(members: GroupMemberData[]): FeedPost[] {
  const author = members[0];
  return [
    {
      id: 'seed-poll',
      authorName: author?.name ?? 'Crew',
      authorAvatar: author?.avatarUrl ?? null,
      body: 'Kedy dáme Padel tento týždeň?',
      createdAtLabel: 'Pred 2 h',
      poll: {
        question: 'Kedy dáme Padel tento týždeň?',
        options: [
          { id: 'wed', label: 'Streda 18:00', votes: 3 },
          { id: 'thu', label: 'Štvrtok 19:30', votes: 5 },
          { id: 'sat', label: 'Sobota 10:00', votes: 2 },
        ],
        votedOptionId: null,
      },
    },
  ];
}

export function CrewFeed({ members, viewerName, viewerAvatarUrl }: CrewFeedProps) {
  const [draft, setDraft] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>(() => buildSeedPosts(members));
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionCandidates = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [members, mentionQuery]);

  function handleDraftChange(value: string) {
    setDraft(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const match = before.match(/@([\p{L}\p{N}_.]*)$/u);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1] ?? '');
    } else {
      setMentionOpen(false);
      setMentionQuery('');
    }
  }

  function insertMention(name: string) {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? draft.length;
    const before = draft.slice(0, cursor);
    const after = draft.slice(cursor);
    const replaced = before.replace(/@([\p{L}\p{N}_.]*)$/u, `@${name} `);
    setDraft(replaced + after);
    setMentionOpen(false);
    setMentionQuery('');
    requestAnimationFrame(() => {
      el?.focus();
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  function submitPost() {
    const body = draft.trim();
    if (!body) return;

    setPosts((prev) => [
      {
        id: `local-${Date.now()}`,
        authorName: viewerName,
        authorAvatar: viewerAvatarUrl,
        body,
        createdAtLabel: 'Práve teraz',
      },
      ...prev,
    ]);
    setDraft('');
    setMentionOpen(false);
  }

  function vote(postId: string, optionId: string) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId || !post.poll) return post;
        const prevVote = post.poll.votedOptionId;
        if (prevVote === optionId) return post;

        const options = post.poll.options.map((opt) => {
          let votes = opt.votes;
          if (opt.id === prevVote) votes = Math.max(0, votes - 1);
          if (opt.id === optionId) votes += 1;
          return { ...opt, votes };
        });

        return {
          ...post,
          poll: { ...post.poll, options, votedOptionId: optionId },
        };
      }),
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white">Skupinový feed</h3>
        <p className="mt-0.5 text-xs text-gray-400">Príspevky, @tagy a rýchle ankety</p>
      </div>

      <div className="relative rounded-2xl border border-white/[0.06] bg-[#1F1F1F] p-3">
        <div className="flex gap-3">
          <CrewAvatarStack
            people={[{ id: 'viewer', name: viewerName, avatarUrl: viewerAvatarUrl }]}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              rows={2}
              placeholder="Napíš príspevok alebo navrhni šport… (@meno)"
              className="w-full resize-none rounded-xl border border-white/[0.06] bg-[#121212] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-[#FF5722]/50 focus:outline-none"
            />
            {mentionOpen && mentionCandidates.length > 0 && (
              <ul
                className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#262626] py-1 shadow-xl"
                role="listbox"
              >
                {mentionCandidates.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-[#FF5722]/15"
                      onClick={() => insertMention(m.name.split(' ')[0] ?? m.name)}
                    >
                      <CrewAvatarStack
                        people={[{ id: m.id, name: m.name, avatarUrl: m.avatarUrl }]}
                        size="sm"
                      />
                      <span className="truncate font-medium">{m.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={submitPost}
                className="rounded-xl bg-[#FF5722] px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                Zverejniť
              </button>
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {posts.map((post) => (
          <li key={post.id} className="rounded-2xl border border-white/[0.06] bg-[#1F1F1F] p-4">
            <div className="flex items-start gap-3">
              <CrewAvatarStack
                people={[
                  {
                    id: post.id,
                    name: post.authorName,
                    avatarUrl: post.authorAvatar,
                  },
                ]}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-bold text-white">{post.authorName}</p>
                  <span className="shrink-0 text-xs text-gray-400">{post.createdAtLabel}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-200">{post.body}</p>

                {post.poll && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF7F50]">
                      Anketa
                    </p>
                    {(() => {
                      const totalVotes = post.poll.options.reduce((s, o) => s + o.votes, 0) || 1;
                      return post.poll.options.map((opt) => {
                        const pct = Math.round((opt.votes / totalVotes) * 100);
                        const selected = post.poll!.votedOptionId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => vote(post.id, opt.id)}
                            className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition ${
                              selected
                                ? 'border-[#FF5722]/60 bg-[#FF5722]/10'
                                : 'border-white/10 bg-[#262626] hover:border-white/20'
                            }`}
                          >
                            <span
                              className="pointer-events-none absolute inset-y-0 left-0 bg-[#FF5722]/20"
                              style={{ width: `${pct}%` }}
                              aria-hidden
                            />
                            <span className="relative flex items-center justify-between gap-2 text-sm">
                              <span className="font-medium text-white">{opt.label}</span>
                              <span className="text-xs text-gray-400">
                                {opt.votes} {opt.votes === 1 ? 'hlas' : 'hlasov'} · {pct}%
                              </span>
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

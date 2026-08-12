'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FriendshipView, FriendRequestView } from '@/lib/data/profile-friends';
import { initialsFromName } from '@/lib/utils/initials';
import { AddFriendSheet } from '@/components/profile/AddFriendSheet';
import { FriendRequestsSheet } from '@/components/profile/FriendRequestsSheet';

interface ProfileFriendsSectionProps {
  friends: FriendshipView[];
  incomingRequests: FriendRequestView[];
  readOnly?: boolean;
}

const MAX_VISIBLE = 8;

export function ProfileFriendsSection({
  friends,
  incomingRequests,
  readOnly = false,
}: ProfileFriendsSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  const visible = friends.slice(0, MAX_VISIBLE);
  const overflow = friends.length - MAX_VISIBLE;

  return (
    <>
      <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl">group</span>
            Friends
          </h2>
          {!readOnly && (
            <div className="flex items-center gap-3">
              {incomingRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRequestsOpen(true)}
                  className="font-label-caps text-[10px] uppercase text-secondary hover:underline relative"
                >
                  Requests
                  <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-container text-on-primary-container text-[9px] flex items-center justify-center">
                    {incomingRequests.length}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="font-label-caps text-[10px] uppercase text-secondary hover:underline"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {friends.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            {readOnly ? 'No friends to show yet.' : 'Add friends by username to build your crew.'}
          </p>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            {visible.map(({ id, friend }) => {
              const name = friend.fullName ?? friend.username;
              const initials = initialsFromName(name);

              return (
                <Link
                  key={id}
                  href={`/players/${friend.username}`}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                  title={name}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 group-hover:border-secondary/40 transition-colors bg-surface-container-high flex items-center justify-center">
                    {friend.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={friend.avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-label-caps text-xs text-on-surface">{initials}</span>
                    )}
                  </div>
                  <span className="font-label-caps text-[9px] uppercase text-on-surface-variant max-w-[56px] truncate">
                    {friend.username}
                  </span>
                </Link>
              );
            })}
            {overflow > 0 && (
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center shrink-0 bg-surface-container/40">
                <span className="font-label-caps text-[10px] text-on-surface-variant">+{overflow}</span>
              </div>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center shrink-0 hover:border-secondary/40 transition-colors"
                aria-label="Add friend"
              >
                <span className="material-symbols-outlined text-on-surface-variant">add</span>
              </button>
            )}
          </div>
        )}
      </section>

      {!readOnly && (
        <>
          <AddFriendSheet open={addOpen} onClose={() => setAddOpen(false)} />
          <FriendRequestsSheet open={requestsOpen} onClose={() => setRequestsOpen(false)} requests={incomingRequests} />
        </>
      )}
    </>
  );
}

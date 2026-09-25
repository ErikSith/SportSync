'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ManageCreateTabs } from '@/components/manage/ManageCreateTabs';
import { ManageNavList, ManageSection, type ManageNavItem } from '@/components/manage/ManageNavList';
import type { OrganizerVenueOption } from '@/lib/data/organizer-venues';

export interface ManageUpcomingRow {
  key: string;
  href?: string;
  entityKind: 'event' | 'tournament';
  entityId: string;
  icon: string;
  label: string;
  hint: string;
  accent?: ManageNavItem['accent'];
  comingSoon?: boolean;
}

interface ManageHubBodyProps {
  venues: OrganizerVenueOption[];
  upcomingItems: ManageUpcomingRow[];
  upcomingEmpty: boolean;
  comingSoonLabel: string;
  editLabel: string;
  upcomingTitle: string;
}

function parseEditQuery(raw: string | null): {
  entityKind: 'event' | 'tournament';
  id: string;
} | null {
  if (!raw) return null;
  const [kind, id] = raw.split(':');
  if ((kind !== 'event' && kind !== 'tournament') || !id) return null;
  return { entityKind: kind, id };
}

export function ManageHubBody({
  venues,
  upcomingItems,
  upcomingEmpty,
  comingSoonLabel,
  editLabel,
  upcomingTitle,
}: ManageHubBodyProps) {
  const createRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editTarget, setEditTarget] = useState<{
    entityKind: 'event' | 'tournament';
    id: string;
  } | null>(() => parseEditQuery(searchParams.get('edit')));
  const [editLoadingKey, setEditLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = parseEditQuery(searchParams.get('edit'));
    if (!fromQuery) return;
    setEditTarget(fromQuery);
    createRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams]);

  const clearEditQuery = useCallback(() => {
    if (!searchParams.get('edit')) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete('edit');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const beginEdit = useCallback((item: ManageUpcomingRow) => {
    setEditLoadingKey(item.key);
    setEditTarget({ entityKind: item.entityKind, id: item.entityId });
    createRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const navItems: ManageNavItem[] = upcomingItems.map((item) => ({
    key: item.key,
    href: item.href,
    icon: item.icon,
    label: item.label,
    hint: item.hint,
    accent: item.accent,
    comingSoon: item.comingSoon,
    onEdit: upcomingEmpty || !item.entityId ? undefined : () => beginEdit(item),
    editBusy: editLoadingKey === item.key,
  }));

  return (
    <>
      <div ref={createRef}>
        <ManageCreateTabs
          venues={venues}
          editTarget={editTarget}
          onEditLoaded={() => setEditLoadingKey(null)}
          onEditClear={() => {
            setEditTarget(null);
            setEditLoadingKey(null);
            clearEditQuery();
          }}
        />
      </div>

      <ManageSection title={upcomingTitle}>
        <ManageNavList
          items={navItems}
          comingSoonLabel={comingSoonLabel}
          editLabel={editLabel}
        />
      </ManageSection>
    </>
  );
}

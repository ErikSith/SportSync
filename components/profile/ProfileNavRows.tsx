import Link from 'next/link';

interface ProfileNavRowsProps {
  showManage?: boolean;
}

const rows: { href: string; icon: string; label: string; hint: string }[] = [
  {
    href: '/profile/settings',
    icon: 'settings',
    label: 'Nastavenia',
    hint: 'Účet, odhlásenie',
  },
];

export function ProfileNavRows({ showManage = false }: ProfileNavRowsProps) {
  const items = showManage
    ? [
        ...rows,
        {
          href: '/manage',
          icon: 'stadium',
          label: 'Správa venue',
          hint: 'Organizátor',
        },
      ]
    : rows;

  return (
    <nav className="overflow-hidden rounded-2xl border border-white/8 bg-surface-container">
      {items.map((item, index) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors active:bg-white/5 ${
            index > 0 ? 'border-t border-white/6' : ''
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary-container">
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-body-md text-sm font-semibold text-on-surface">{item.label}</span>
            <span className="block font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
              {item.hint}
            </span>
          </span>
          <span className="material-symbols-outlined text-on-surface-variant/70">chevron_right</span>
        </Link>
      ))}
    </nav>
  );
}

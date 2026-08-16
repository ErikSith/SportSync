interface AvatarPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface CrewAvatarStackProps {
  people: AvatarPerson[];
  /** Total slots to show (filled + empty placeholders). */
  slots?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function CrewAvatarStack({
  people,
  slots,
  size = 'md',
  className = '',
}: CrewAvatarStackProps) {
  const dim =
    size === 'xs'
      ? 'h-5 w-5 text-[7px]'
      : size === 'sm'
        ? 'h-8 w-8 text-[9px]'
        : 'h-9 w-9 text-[10px]';
  const overlap = size === 'xs' ? '-space-x-1.5' : '-space-x-2';
  const border = size === 'xs' ? 'border border-[#1F1F1F]' : 'border-2 border-[#1F1F1F]';
  const total = slots ?? people.length;
  const shown = people.slice(0, total);
  const emptyCount = Math.max(0, total - shown.length);

  return (
    <div className={`flex items-center ${overlap} ${className}`}>
      {shown.map((person) =>
        person.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={person.id}
            src={person.avatarUrl}
            alt={person.name}
            title={person.name}
            className={`${dim} rounded-full ${border} object-cover`}
          />
        ) : (
          <div
            key={person.id}
            title={person.name}
            className={`${dim} flex items-center justify-center rounded-full ${border} bg-[#262626] font-bold text-gray-300`}
          >
            {person.name.slice(0, 2).toUpperCase()}
          </div>
        ),
      )}
      {Array.from({ length: emptyCount }, (_, i) => (
        <div
          key={`empty-${i}`}
          className={`${dim} rounded-full border border-dashed border-white/20 bg-[#121212]`}
          aria-hidden
        />
      ))}
    </div>
  );
}

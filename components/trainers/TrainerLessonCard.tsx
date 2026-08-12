import Link from 'next/link';
import type { CoachLessonData } from '@/lib/data/trainers-shared';
import { BookButton } from '@/components/trainers/BookButton';

function dayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  return date
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase();
}

function formatTimeRange(lesson: CoachLessonData): string {
  const end = new Date(lesson.startsAt.getTime() + lesson.durationMinutes * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(lesson.startsAt)} - ${fmt(end)}`;
}

interface TrainerLessonCardProps {
  lesson: CoachLessonData;
  compact?: boolean;
  highlight?: boolean;
}

export function TrainerLessonCard({ lesson, compact = false, highlight = false }: TrainerLessonCardProps) {
  const isScheduled = lesson.status === 'SCHEDULED';
  const isToday = dayLabel(lesson.startsAt) === 'TODAY';

  return (
    <div
      data-lesson-id={lesson.id}
      className={`bg-surface-container-high rounded-lg p-4 border border-white/5 hover:border-primary-container/50 transition-all group ${
        compact ? 'relative' : ''
      } ${highlight ? 'ring-2 ring-primary-container ring-offset-2 ring-offset-background' : ''}`}
    >
      <div className={compact ? 'space-y-3' : 'space-y-3'}>
        <div className="flex justify-between items-start gap-2">
          <span
            className={`font-label-caps text-label-caps ${isToday ? 'text-primary-container group-hover:text-primary' : 'text-on-surface'} transition-colors`}
          >
            {dayLabel(lesson.startsAt)}
          </span>
          <span className="font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
            {formatTimeRange(lesson)}
          </span>
        </div>

        <h3 className="font-body-md text-body-md font-semibold">{lesson.title}</h3>

        <p className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          {lesson.venueId ? (
            <Link href={`/venues/${lesson.venueId}`} className="hover:text-primary transition-colors">
              {lesson.venueName ?? 'View venue'}
            </Link>
          ) : (
            (lesson.venueName ?? 'Venue TBC')
          )}
        </p>

        {!compact && (
          <p className="font-body-md text-sm text-on-surface-variant">
            {lesson.sport} • {lesson.level.replace('_', ' ')} • €{lesson.pricePerPerson}/person
          </p>
        )}

        <div
          className={`${compact ? 'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity' : ''} flex justify-end pt-1`}
        >
          <BookButton
            lessonId={lesson.id}
            isBooked={lesson.isBooked}
            bookingStatus={lesson.bookingStatus}
            isFull={lesson.isFull}
            isScheduled={isScheduled}
            price={lesson.pricePerPerson}
            venueId={lesson.venueId}
          />
        </div>
      </div>
    </div>
  );
}

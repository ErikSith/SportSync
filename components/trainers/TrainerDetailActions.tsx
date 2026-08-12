'use client';

import type { CoachLessonData } from '@/lib/data/trainers-shared';

interface TrainerDetailActionsProps {
  lessons: CoachLessonData[];
  coachEmail?: string;
}

function highlightFirstAvailableLesson(lessons: CoachLessonData[]) {
  const nextLesson = lessons.find((lesson) => lesson.status === 'SCHEDULED' && !lesson.isFull && !lesson.isBooked);
  if (!nextLesson) return;

  const card = document.querySelector(`[data-lesson-id="${nextLesson.id}"]`);
  if (!card) return;

  card.classList.add('ring-2', 'ring-primary-container', 'ring-offset-2', 'ring-offset-background');
  setTimeout(() => {
    card.classList.remove('ring-2', 'ring-primary-container', 'ring-offset-2', 'ring-offset-background');
  }, 2500);
}

export function TrainerDetailActions({ lessons, coachEmail }: TrainerDetailActionsProps) {
  const nextLesson = lessons.find((lesson) => lesson.status === 'SCHEDULED' && !lesson.isFull && !lesson.isBooked);

  function scrollToLessons() {
    const target =
      document.getElementById('trainer-lessons') ?? document.getElementById('trainer-lessons-desktop');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    highlightFirstAvailableLesson(lessons);
  }

  function handleContact() {
    if (coachEmail) {
      window.location.href = `mailto:${coachEmail}?subject=SportSync%20Training%20Inquiry`;
      return;
    }
    scrollToLessons();
  }

  return (
    <div className="fixed bottom-0 left-0 w-full bg-surface-container/90 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] px-4 py-4 md:px-container-margin-desktop z-50 flex gap-4 justify-center md:justify-end">
      <button
        type="button"
        onClick={handleContact}
        className="flex-1 md:flex-none md:w-48 py-3 px-6 rounded-lg font-label-caps text-label-caps bg-surface-container-lowest border border-on-primary-fixed-variant text-on-primary-fixed-variant hover:bg-secondary-container/10 transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
        CONTACT
      </button>
      <button
        type="button"
        onClick={scrollToLessons}
        disabled={!nextLesson}
        className="flex-1 md:flex-none md:w-64 py-3 px-6 rounded-lg font-label-caps text-label-caps text-white hover:opacity-90 transition-all active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 disabled:opacity-40"
        style={{
          background: 'linear-gradient(135deg, rgb(134, 34, 0) 0%, rgb(176, 47, 0) 100%)',
        }}
      >
        <span className="material-symbols-outlined text-[18px]">bolt</span>
        BOOK SESSION
      </button>
    </div>
  );
}

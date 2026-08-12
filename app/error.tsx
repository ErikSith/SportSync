'use client';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-container-margin-mobile bg-background">
      <div className="glass-panel rounded-2xl p-8 max-w-md w-full text-center space-y-4 border border-error/30">
        <span className="material-symbols-outlined text-error text-4xl">error_outline</span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Something went wrong</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="w-full py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps hover:brightness-110 transition-all"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

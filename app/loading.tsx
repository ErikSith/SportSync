export const runtime = 'edge';

export default function RootLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="font-label-caps text-label-caps text-tertiary-container uppercase tracking-widest">
          Loading SportSync…
        </p>
      </div>
    </main>
  );
}

import { SHOWCASE_CREDENTIALS } from '@/lib/demo/showcase-trainer-content';

export function TrainerCredentials() {
  return (
    <section>
      <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Credentials</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SHOWCASE_CREDENTIALS.map((credential) => (
          <div
            key={credential.title}
            className="glass-panel rounded-lg p-5 flex items-start gap-4 border-l-2 border-secondary"
          >
            <span className="material-symbols-outlined text-secondary mt-1">{credential.icon}</span>
            <div>
              <h3 className="font-body-md text-body-md font-bold mb-1">{credential.title}</h3>
              <p className="font-label-caps text-label-caps text-on-surface-variant">{credential.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

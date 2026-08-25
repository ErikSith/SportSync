import { t } from '@/lib/i18n/server';

export function SetupNotice() {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-container-margin-mobile pt-24 text-center">
      <h2 className="font-headline-md text-headline-md text-on-surface">{t('setup.title')}</h2>
      <p className="font-body-md text-body-md text-tertiary-container">{t('setup.body')}</p>
    </main>
  );
}

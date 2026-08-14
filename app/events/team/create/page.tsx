import { getPageViewer } from '@/lib/auth/viewer';
import { TeamEventCreator } from '@/components/events/TeamEventCreator';

export default async function TeamEventCreatePage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  if (viewer.isGuest) {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">
          Prihlásenie bude čoskoro — vytváranie zatiaľ nie je dostupné.
        </p>
      </main>
    );
  }

  const { profile } = viewer;

  return <TeamEventCreator defaultCity={profile.city} />;
}

import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { TeamEventCreator } from '@/components/events/TeamEventCreator';
import { loginHref } from '@/lib/auth/login-href';

export const runtime = 'edge';

export default async function TeamEventCreatePage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest) {
    redirect(loginHref('/events/team/create', { mode: 'sign-up' }));
  }

  const { profile } = viewer;

  return <TeamEventCreator defaultCity={profile.city} />;
}

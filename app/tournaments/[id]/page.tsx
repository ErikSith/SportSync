import { redirect } from 'next/navigation';

export const runtime = 'edge';

/** Detail tournament pages removed — discovery uses preview modals on /tournaments. */
export default function TournamentDetailRedirect() {
  redirect('/tournaments');
}

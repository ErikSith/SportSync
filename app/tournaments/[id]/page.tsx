import { redirect } from 'next/navigation';

/** Detail tournament pages removed — discovery uses preview modals on /tournaments. */
export default function TournamentDetailRedirect() {
  redirect('/tournaments');
}

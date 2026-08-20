import { redirect } from 'next/navigation';

export const runtime = 'edge';

/** Detail event pages removed — discovery uses preview modals on /events. */
export default function EventDetailRedirect() {
  redirect('/events');
}

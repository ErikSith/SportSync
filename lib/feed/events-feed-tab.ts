export type EventsFeedTab = 'matches' | 'schedules';

export function parseEventsFeedTab(raw: string | null | undefined): EventsFeedTab {
  return raw === 'schedules' ? 'schedules' : 'matches';
}

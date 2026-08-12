/** Typed domain events for AI-native orchestration cascades. */

export const DOMAIN_EVENTS = {
  EVENT_CREATED: 'event.created',
  MATCH_RESULT_RECORDED: 'match.result_recorded',
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export type DomainEntityType = 'event' | 'tournament' | 'match' | 'lobby';

/** Canonical AI task name enqueued by the orchestration bus. */
export const ORCHESTRATION_TASKS = {
  FIND_NEARBY_CANDIDATES: 'find_nearby_candidates',
} as const;

export type OrchestrationTaskName =
  (typeof ORCHESTRATION_TASKS)[keyof typeof ORCHESTRATION_TASKS];

export interface DomainEventPayload {
  entityType: DomainEntityType;
  entityId: string;
  sport?: string;
  latitude?: number | null;
  longitude?: number | null;
  participantIds?: string[];
  /** Actor who caused the write (organizer, recorder, etc.). */
  userId?: string | null;
  [key: string]: unknown;
}

export interface EmitDomainEventInput {
  name: DomainEventName;
  payload: DomainEventPayload;
  /** Extra AI tasks beyond the default nearby-candidates cascade. */
  extraTasks?: string[];
}

export const shouldIncludeTicketIdsForSave = (existingEventId?: string | null) =>
  Boolean(existingEventId && existingEventId.trim().length > 0);


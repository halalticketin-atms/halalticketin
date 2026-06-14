import { describe, expect, it } from 'vitest';

import type { DraftEventInitial } from './useEventDraft';
import { resolveInitialTickets } from './useEventDraft';

describe('AI draft ticket initialization', () => {
  it('preserves an intentionally empty AI ticket list', () => {
    const initial: DraftEventInitial = {
      tickets: [],
      preserveEmptyTickets: true,
    };

    expect(resolveInitialTickets(initial)).toEqual([]);
  });

  it('keeps the default ticket for ordinary scratch creation', () => {
    const tickets = resolveInitialTickets(undefined);

    expect(tickets).toHaveLength(1);
    expect(tickets[0]).toMatchObject({
      name: 'General Admission',
      quantity: 100,
      type: 'paid',
    });
  });
});

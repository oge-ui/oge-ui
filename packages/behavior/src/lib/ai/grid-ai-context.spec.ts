import { describe, expect, it } from 'vitest';
import { buildOgeGridAiRequest, type OgeAiGridColumn } from './grid-ai-context';

const COLUMNS: OgeAiGridColumn[] = [
  {
    field: 'city',
    caption: 'City',
    dataType: 'string',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
    description: 'Office location',
  },
  {
    field: 'status',
    caption: 'Status',
    dataType: 'number',
    sortable: false,
    filterable: true,
    groupable: false,
    visible: false,
    values: [{ value: 1, text: 'Open' }, { value: 2 }],
  },
];

describe('buildOgeGridAiRequest', () => {
  const now = new Date(2026, 9, 18, 9, 30);

  it('describes columns, current state, date and rules in the system prompt', () => {
    const request = buildOgeGridAiRequest('only open ones', {
      columns: COLUMNS,
      state: {
        sort: [{ field: 'city', dir: 'asc' }],
        filter: {
          builder: {
            type: 'binary',
            field: 'hired',
            op: 'ge',
            value: new Date(2026, 0, 2),
          },
          row: [
            ['city', { type: 'binary', field: 'city', op: 'eq', value: 'x' }],
          ],
        },
      },
      locale: 'tr-TR',
      now,
      instructions: '  "Open" means status 1.  ',
    });
    expect(request.feature).toBe('grid-assistant');
    expect(request.temperature).toBe(0);
    expect(request.responseName).toBe('oge_grid_state_change');
    const [system, user] = request.messages;
    expect(system.role).toBe('system');
    expect(user).toEqual({ role: 'user', content: 'only open ones' });
    const text = system.content;
    expect(text).toContain(
      '- city ("City", string, sort/filter/group): Office location',
    );
    expect(text).toContain(
      '- status ("Status", number, filter, hidden) values: 1 = "Open", 2',
    );
    expect(text).toContain('"sort":[{"field":"city","dir":"asc"}]');
    // dates go out as local days, never UTC ISO strings
    expect(text).toContain('"value":"2026-01-02"');
    expect(text).toContain('"otherFilters":1');
    expect(text).toContain('Today is 2026-10-18.');
    expect(text).toContain("The user's locale is tr-TR.");
    expect(text).toContain('Additional instructions:\n"Open" means status 1.');
    expect(text).toContain(
      'You may change: sort, filter, group, search, columns.',
    );
  });

  it('limits what the model may change and replays earlier turns', () => {
    const request = buildOgeGridAiRequest('and by city', {
      columns: COLUMNS,
      state: {},
      now,
      capabilities: {
        sort: true,
        filter: false,
        group: true,
        search: false,
        columns: false,
      },
      history: [{ prompt: 'sort by city', summary: 'Sorted by city' }],
    });
    expect(request.messages[0].content).toContain(
      'You may change: sort, group.',
    );
    expect(request.messages.slice(1)).toEqual([
      { role: 'user', content: 'sort by city' },
      {
        role: 'assistant',
        content: '{"status":"apply","summary":"Sorted by city"}',
      },
      { role: 'user', content: 'and by city' },
    ]);
  });

  it('never includes row data', () => {
    const request = buildOgeGridAiRequest('x', {
      columns: COLUMNS,
      state: {},
      now,
    });
    expect(Object.keys(request)).not.toContain('rows');
    expect(request.messages.map((m) => m.content).join()).not.toContain(
      'Istanbul',
    );
  });
});

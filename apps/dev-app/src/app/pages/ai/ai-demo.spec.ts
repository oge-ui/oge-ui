import { buildOgeGridAiRequest, type OgeAiGridColumn } from '@oge-ui/behavior';
import { describe, expect, it } from 'vitest';
import { AI_DEMO_STATUSES, demoReply } from './ai-demo';

const COLUMNS: OgeAiGridColumn[] = [
  {
    field: 'customer',
    caption: 'Customer',
    dataType: 'string',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
  {
    field: 'city',
    caption: 'City',
    dataType: 'string',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
  {
    field: 'status',
    caption: 'Status',
    dataType: 'number',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
    values: AI_DEMO_STATUSES.map((s) => ({ value: s.id, text: s.label })),
  },
  {
    field: 'amount',
    caption: 'Amount',
    dataType: 'number',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
  {
    field: 'ordered',
    caption: 'Ordered',
    dataType: 'date',
    sortable: true,
    filterable: true,
    groupable: true,
    visible: true,
  },
];

const TODAY = new Date(2026, 9, 18);

/** The demo model answers from the real system prompt, as a model would. */
function ask(prompt: string, state = {}) {
  const request = buildOgeGridAiRequest(prompt, {
    columns: COLUMNS,
    state,
    now: TODAY,
  });
  return demoReply(prompt, request.messages[0].content, TODAY);
}

describe('the docs demo model', () => {
  it('filters by amount and month, in English and Turkish', () => {
    expect(ask('Orders over 500 this month')['filter']).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'amount', op: 'gt', value: 500 },
        {
          type: 'binary',
          field: 'ordered',
          op: 'between',
          value: ['2026-10-01', '2026-10-18'],
        },
      ],
    });
    expect(ask('geçen ayki 1.000 üzeri siparişler')['filter']).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'amount', op: 'gt', value: 1000 },
        {
          type: 'binary',
          field: 'ordered',
          op: 'between',
          value: ['2026-09-01', '2026-09-30'],
        },
      ],
    });
  });

  it('sorts, groups, maps lookup texts and known values', () => {
    expect(ask('Newest first')['sort']).toEqual([
      { field: 'ordered', dir: 'desc' },
    ]);
    expect(ask('Sort by amount, highest first')['sort']).toEqual([
      { field: 'amount', dir: 'desc' },
    ]);
    expect(ask('Group by status')['group']).toEqual([{ field: 'status' }]);
    expect(ask('open orders from İzmir')['filter']).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'city', op: 'eq', value: 'İzmir' },
        { type: 'binary', field: 'status', op: 'eq', value: 1 },
      ],
    });
  });

  it('adds to the current filter on "and …", hides columns and clears', () => {
    const current = {
      filter: {
        builder: { type: 'binary', field: 'amount', op: 'gt', value: 500 },
      },
    };
    expect(ask('and only Berlin', current)['filter']).toEqual({
      type: 'and',
      operands: [
        { type: 'binary', field: 'amount', op: 'gt', value: 500 },
        { type: 'binary', field: 'city', op: 'eq', value: 'Berlin' },
      ],
    });
    expect(ask('Hide the city column')['hiddenColumns']).toEqual(['city']);
    expect(ask('reset')).toMatchObject({
      sort: [],
      group: [],
      filter: null,
      search: '',
    });
  });

  it('asks back when it does not understand', () => {
    expect(ask('what is the meaning of life')['status']).toBe('clarify');
  });
});

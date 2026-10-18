import {
  buildOgeGridAiRequest,
  buildOgeSmartPasteRequest,
  type OgeAiGridColumn,
} from '@oge-ui/behavior';
import { describe, expect, it } from 'vitest';
import { AI_DEMO_STATUSES, demoReply } from './ai-demo';
import { demoSmartPasteReply } from './ai-demo-smart-paste';

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

describe('the docs demo model — smart paste', () => {
  const fields = [
    { field: 'name', label: 'Full name', dataType: 'string', required: true },
    { field: 'email', label: 'Email', dataType: 'string' },
    { field: 'phone', label: 'Phone', dataType: 'string' },
    { field: 'company', label: 'Company', dataType: 'string' },
    { field: 'seats', label: 'Seats', dataType: 'number' },
    { field: 'start', label: 'Start date', dataType: 'date' },
    {
      field: 'plan',
      label: 'Plan',
      dataType: 'string',
      values: [
        { value: 'free', text: 'Free' },
        { value: 'pro', text: 'Pro' },
      ],
    },
  ];
  const ask = (text: string) => {
    const request = buildOgeSmartPasteRequest(text, { fields, now: TODAY });
    return demoSmartPasteReply(text, request.messages[0].content);
  };

  it('maps a signature block onto the form', () => {
    expect(
      ask(
        'Hi, we would like 12 seats on the Pro plan from 01.11.2026.\n\nAda Lovelace\nAnalytical Engines Ltd\nada@engines.example\n+44 20 7946 0958',
      ),
    ).toEqual({
      status: 'apply',
      summary: 'Read 7 fields from the text.',
      values: {
        name: 'Ada Lovelace',
        email: 'ada@engines.example',
        phone: '+44 20 7946 0958',
        company: 'Analytical Engines Ltd',
        seats: 12,
        start: '2026-11-01',
        plan: 'pro',
      },
    });
  });

  it('prefers labelled lines and says when nothing fits', () => {
    expect(
      ask('Company: Kaya Mimarlık\nEmail: info@kaya.example')['values'],
    ).toEqual({
      company: 'Kaya Mimarlık',
      email: 'info@kaya.example',
    });
    expect(ask('roses are red')['status']).toBe('unsupported');
  });
});

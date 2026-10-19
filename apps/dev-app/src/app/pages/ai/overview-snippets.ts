import { demoSource } from '../../shared/demo-source';

const ORDER_COLUMNS = `  <oge-column field="id" caption="Order" dataType="number" [width]="90" />
  <oge-column field="customer" caption="Customer" />
  <oge-column field="city" caption="City" />
  <oge-column
    field="status"
    caption="Status"
    dataType="number"
    [lookup]="{ dataSource: statuses, valueExpr: 'id', displayExpr: 'label' }"
  />
  <oge-column field="amount" caption="Amount" dataType="number" [format]="{ type: 'currency', currency: 'EUR' }" />
  <oge-column field="ordered" caption="Ordered" dataType="date" [format]="{ type: 'date' }" />`;

const ORDERS_BEFORE = `interface Order {
  id: number;
  customer: string;
  city: string;
  status: number;
  amount: number;
  ordered: Date;
}`;

const ORDERS_BODY = `protected readonly statuses = [
  { id: 1, label: 'Open' },
  { id: 2, label: 'Shipped' },
  { id: 3, label: 'Delivered' },
  { id: 4, label: 'Cancelled' },
];
protected readonly orders: Order[] = [
  { id: 1001, customer: 'Acme Corp', city: 'İzmir', status: 2, amount: 1240.5, ordered: new Date(2026, 9, 3) },
  { id: 1002, customer: 'Ege Textiles', city: 'İstanbul', status: 1, amount: 310, ordered: new Date(2026, 9, 11) },
  { id: 1003, customer: 'Fjord Media', city: 'Berlin', status: 4, amount: 980, ordered: new Date(2026, 8, 21) },
];`;

export const GETTING_STARTED_SNIPPET = demoSource({
  use: {
    '@oge-ui/ai': ['OgeGridAssistant'],
    '@oge-ui/grid': ['OgeColumn', 'OgeGrid'],
  },
  before: ORDERS_BEFORE,
  template: `<!-- The assistant drives the grid through its public state API. The model
     sees the column names, types and lookup values — never a row. -->
<oge-grid-assistant
  [target]="grid"
  [suggestions]="['Orders over 500 this month', 'Group by status', 'Newest first']"
/>

<oge-grid #grid [data]="orders" keyField="id" [groupPanel]="true" [paging]="{ pageSize: 10 }">
${ORDER_COLUMNS}
</oge-grid>`,
  body: ORDERS_BODY,
  after: `// app.config.ts — requests go to YOUR endpoint; the API key stays on the server.
// Any object with complete(request, { signal }) is a transport too.
//
// import { createOgeAiHttpTransport, provideOgeAiConfig } from '@oge-ui/ai';
// providers: [
//   provideOgeAiConfig({ transport: createOgeAiHttpTransport({ url: '/api/ai' }) }),
// ]`,
});

export const APPLY_SNIPPET = demoSource({
  use: {
    '@oge-ui/ai': ['OgeGridAssistant'],
    '@oge-ui/grid': ['OgeColumn', 'OgeGrid'],
  },
  before: ORDERS_BEFORE,
  template: `<!-- mode="apply" skips the proposal: the change lands at once and Undo
     steps back through every applied change. Follow-ups build on the
     current state ("and only İzmir", "now group it by city"). -->
<oge-grid-assistant #assistant [target]="grid" mode="apply" />
<button type="button" (click)="assistant.submit('Newest first')">Ask from code</button>

<oge-grid #grid [data]="orders" keyField="id" [groupPanel]="true">
${ORDER_COLUMNS}
</oge-grid>`,
  body: ORDERS_BODY,
});

export const PRIVACY_SNIPPET = demoSource({
  use: {
    '@oge-ui/ai': ['OgeGridAssistant'],
    '@oge-ui/grid': ['OgeColumn', 'OgeGrid'],
  },
  types: { '@oge-ui/ai': ['OgeAiGridColumn', 'OgeGridAiCapabilities'] },
  before: ORDERS_BEFORE,
  template: `<!-- [columns] replaces what the model is told: add descriptions, or leave a
     column out entirely ("customer" never reaches the model below).
     [capabilities] switches whole parts of the state off. -->
<oge-grid-assistant
  [target]="grid"
  [columns]="described"
  [capabilities]="{ columns: false }"
  instructions="Amounts are net, in EUR. 'Open' orders are not shipped yet."
/>

<oge-grid #grid [data]="orders" keyField="id">
${ORDER_COLUMNS}
</oge-grid>`,
  body: `${ORDERS_BODY}

protected readonly described: readonly OgeAiGridColumn[] = [
  { field: 'city', caption: 'City', dataType: 'string', sortable: true, filterable: true, groupable: true, visible: true },
  {
    field: 'status', caption: 'Status', dataType: 'number', sortable: true, filterable: true, groupable: true, visible: true,
    values: this.statuses.map((s) => ({ value: s.id, text: s.label })),
  },
  {
    field: 'amount', caption: 'Amount', dataType: 'number', sortable: true, filterable: true, groupable: true, visible: true,
    description: 'Net order value in EUR',
  },
  { field: 'ordered', caption: 'Ordered', dataType: 'date', sortable: true, filterable: true, groupable: true, visible: true },
];`,
});

export const EVENTS_SNIPPET = demoSource({
  use: {
    '@oge-ui/ai': ['OgeGridAssistant'],
    '@oge-ui/grid': ['OgeColumn', 'OgeGrid'],
  },
  types: {
    '@oge-ui/ai': [
      'OgeGridAssistantAppliedEvent',
      'OgeGridAssistantApplyingEvent',
    ],
  },
  before: ORDERS_BEFORE,
  template: `<!-- (applying) is cancelable — here, a change that would hide columns needs
     a confirmation. (applied) carries the full snapshot: save it as a view. -->
<oge-grid-assistant
  [target]="grid"
  mode="apply"
  (applying)="guard($event)"
  (applied)="log.update((l) => [event($event), ...l])"
/>

<oge-grid #grid [data]="orders" keyField="id">
${ORDER_COLUMNS}
</oge-grid>

<ol>
  @for (line of log(); track $index) {
    <li>{{ line }}</li>
  }
</ol>`,
  body: `${ORDERS_BODY}

protected readonly log = signal<string[]>([]);

protected guard(event: OgeGridAssistantApplyingEvent): void {
  if (event.slices.includes('columns')) {
    event.cancel = !confirm(\`Apply "\${event.summary}"?\`);
  }
}

protected event(event: OgeGridAssistantAppliedEvent): string {
  return \`\${event.prompt} → \${event.slices.join(', ')}\`;
}`,
});

export const SMART_PASTE_SNIPPET = demoSource({
  use: {
    '@oge-ui/ai': ['OgeSmartPaste'],
    '@oge-ui/forms': ['OgeForm'],
  },
  types: { '@oge-ui/forms': ['OgeFormItemData'] },
  template: `<!-- Copy a signature block or an email, press Smart paste. The model maps
     the text onto the form's fields; every value is checked against the
     field's type and choices, and the table shows Now → New before anything
     is written. The request carries the field catalog and the pasted text —
     never the form's current values. -->
<oge-smart-paste #paste [target]="form" />
<button type="button" (click)="paste.paste(sample)">Try the sample text</button>

<oge-form #form [(formData)]="customer" [items]="fields" [colCount]="2" />`,
  body: `protected readonly sample = 'Ada Lovelace\\nAnalytical Engines Ltd\\nada@engines.example';

protected readonly customer = signal({
  name: '',
  email: '',
  phone: '',
  company: '',
  seats: null as number | null,
  start: null as Date | null,
  plan: 'free',
});

protected readonly fields: OgeFormItemData[] = [
  { field: 'name', label: 'Full name', isRequired: true },
  { field: 'email', label: 'Email' },
  { field: 'phone', label: 'Phone' },
  { field: 'company', label: 'Company' },
  { field: 'seats', label: 'Seats', dataType: 'number' },
  { field: 'start', label: 'Start date', dataType: 'date' },
  {
    field: 'plan',
    label: 'Plan',
    editorType: 'selectBox',
    editorOptions: {
      items: [
        { id: 'free', label: 'Free' },
        { id: 'pro', label: 'Pro' },
        { id: 'enterprise', label: 'Enterprise' },
      ],
      valueExpr: 'id',
      displayExpr: 'label',
    },
  },
];`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/ai': ['OgeGridAssistant'] },
  helpers: {
    '@oge-ui/ai': [
      'createOgeAiHttpTransport',
      'createOgeAnthropicTransport',
      'createOgeOpenAiTransport',
      'provideOgeAiConfig',
    ],
  },
  types: { '@oge-ui/ai': ['OgeAiTransport'] },
  template: `<!-- Pick the transport per environment; nothing else changes. -->
<oge-grid-assistant [transport]="local" />`,
  body: `/** A local model through Ollama's OpenAI-compatible API — nothing leaves the machine. */
protected readonly local: OgeAiTransport = createOgeOpenAiTransport({
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3.1',
});`,
  after: `// app.config.ts
export const productionAi = provideOgeAiConfig({
  // your backend calls the model; the browser never holds a key
  transport: createOgeAiHttpTransport({ url: '/api/ai' }),
  gridAssistant: { mode: 'preview', undoLimit: 50 },
  messages: { gridAssistant: { placeholder: 'Ask about your orders…' } },
});

// Claude through your own proxy route
export const claude = createOgeAnthropicTransport({
  baseUrl: '/api/anthropic',
  model: 'claude-haiku-5-5',
});

// Your endpoint, e.g. in Node: forward the request, return { text }.
//
// app.post('/api/ai', async (req, res) => {
//   const { messages, responseSchema, temperature } = req.body; // OgeAiRequest
//   const answer = await openai.chat.completions.create({
//     model: 'gpt-4.1-mini',
//     messages,
//     temperature,
//     response_format: { type: 'json_schema', json_schema: { name: 'oge', schema: responseSchema } },
//   });
//   res.json({ text: answer.choices[0].message.content });
// });`,
});

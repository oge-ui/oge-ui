import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React AI overview. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../ai/overview.ts` (`docs/REACT-PARITY.md`):
 * the same five sections, the same orders, the same prompts, React idiom.
 */
const ORDERS = `interface Order {
  id: number;
  customer: string;
  city: string;
  status: number;
  amount: number;
  ordered: Date;
}

const statuses = [
  { id: 1, label: 'Open' },
  { id: 2, label: 'Shipped' },
  { id: 3, label: 'Delivered' },
  { id: 4, label: 'Cancelled' },
];

const orders: Order[] = [
  { id: 1001, customer: 'Acme Corp', city: 'İzmir', status: 2, amount: 1240.5, ordered: new Date(2026, 9, 3) },
  { id: 1002, customer: 'Ege Textiles', city: 'İstanbul', status: 1, amount: 310, ordered: new Date(2026, 9, 11) },
  { id: 1003, customer: 'Fjord Media', city: 'Berlin', status: 4, amount: 980, ordered: new Date(2026, 8, 21) },
];

const columns: OgeGridColumnProps<Order>[] = [
  { field: 'id', caption: 'Order', dataType: 'number', width: 90 },
  { field: 'customer', caption: 'Customer' },
  { field: 'city', caption: 'City' },
  {
    field: 'status',
    caption: 'Status',
    dataType: 'number',
    lookup: { dataSource: statuses, valueExpr: 'id', displayExpr: 'label' },
  },
  { field: 'amount', caption: 'Amount', dataType: 'number', format: { type: 'currency', currency: 'EUR' } },
  { field: 'ordered', caption: 'Ordered', dataType: 'date', format: { type: 'date' } },
];`;

const GRID_TYPES = {
  '@oge-ui/react-grid': ['OgeGridColumnProps', 'OgeGridHandle'],
};

export const AI_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      react: ['useRef'],
      use: {
        '@oge-ui/react-ai': [
          'OgeAiConfigProvider',
          'OgeGridAssistant',
          'createOgeAiHttpTransport',
        ],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: GRID_TYPES,
      name: 'OrdersWithAssistant',
      before: `${ORDERS}

// Requests go to YOUR endpoint; the API key stays on the server. The model
// sees the column names, types and lookup values — never a row.
const transport = createOgeAiHttpTransport({ url: '/api/ai' });`,
      body: `const grid = useRef<OgeGridHandle<Order>>(null);`,
      jsx: `<OgeAiConfigProvider config={{ transport }}>
  <OgeGridAssistant
    target={grid}
    suggestions={['Orders over 500 this month', 'Group by status', 'Newest first']}
  />
  <OgeGrid ref={grid} data={orders} keyField="id" columns={columns} groupPanel paging={{ pageSize: 10 }} />
</OgeAiConfigProvider>`,
    }),
  },
  {
    title: 'Apply at once and undo',
    source: reactDemoSource({
      react: ['useRef'],
      use: {
        '@oge-ui/react-ai': ['OgeGridAssistant'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: { ...GRID_TYPES, '@oge-ui/react-ai': ['OgeGridAssistantHandle'] },
      name: 'ApplyAtOnce',
      before: ORDERS,
      body: `// mode="apply" skips the proposal: the change lands at once and Undo steps
// back through every applied change. Follow-ups build on the current state.
const grid = useRef<OgeGridHandle<Order>>(null);
const assistant = useRef<OgeGridAssistantHandle>(null);`,
      jsx: `<>
  <OgeGridAssistant ref={assistant} target={grid} mode="apply" />
  <button type="button" onClick={() => assistant.current?.submit('Newest first')}>
    Ask from code
  </button>
  <OgeGrid ref={grid} data={orders} keyField="id" columns={columns} groupPanel />
</>`,
    }),
  },
  {
    title: 'What the model sees',
    source: reactDemoSource({
      react: ['useRef'],
      use: {
        '@oge-ui/react-ai': ['OgeGridAssistant'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: { ...GRID_TYPES, '@oge-ui/react-ai': ['OgeAiGridColumn'] },
      name: 'PrivateAssistant',
      before: `${ORDERS}

// \`columns\` replaces what the model is told: add descriptions, or leave a
// column out entirely ("customer" never reaches the model below).
const described: OgeAiGridColumn[] = [
  { field: 'city', caption: 'City', dataType: 'string', sortable: true, filterable: true, groupable: true, visible: true },
  {
    field: 'status', caption: 'Status', dataType: 'number', sortable: true, filterable: true, groupable: true, visible: true,
    values: statuses.map((s) => ({ value: s.id, text: s.label })),
  },
  {
    field: 'amount', caption: 'Amount', dataType: 'number', sortable: true, filterable: true, groupable: true, visible: true,
    description: 'Net order value in EUR',
  },
  { field: 'ordered', caption: 'Ordered', dataType: 'date', sortable: true, filterable: true, groupable: true, visible: true },
];`,
      body: `const grid = useRef<OgeGridHandle<Order>>(null);`,
      jsx: `<>
  {/* capabilities switches whole parts of the state off */}
  <OgeGridAssistant
    target={grid}
    columns={described}
    capabilities={{ columns: false }}
    instructions="Amounts are net, in EUR. 'Open' orders are not shipped yet."
  />
  <OgeGrid ref={grid} data={orders} keyField="id" columns={columns} />
</>`,
    }),
  },
  {
    title: 'Events',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-ai': ['OgeGridAssistant'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: {
        ...GRID_TYPES,
        '@oge-ui/react-ai': ['OgeGridAssistantApplyingEvent'],
      },
      name: 'AssistantEvents',
      before: `${ORDERS}

// onApplying is cancelable — here, a change that would hide columns needs
// a confirmation. onApplied carries the full snapshot: save it as a view.
function guard(event: OgeGridAssistantApplyingEvent): void {
  if (event.slices.includes('columns')) {
    event.cancel = !confirm(\`Apply "\${event.summary}"?\`);
  }
}`,
      body: `const grid = useRef<OgeGridHandle<Order>>(null);
const [log, setLog] = useState<string[]>([]);`,
      jsx: `<>
  <OgeGridAssistant
    target={grid}
    mode="apply"
    onApplying={guard}
    onApplied={(e) => setLog((l) => [\`\${e.prompt} → \${e.slices.join(', ')}\`, ...l])}
  />
  <OgeGrid ref={grid} data={orders} keyField="id" columns={columns} />
  <ol>
    {log.map((line, i) => (
      <li key={i}>{line}</li>
    ))}
  </ol>
</>`,
    }),
  },
  {
    title: 'Smart paste',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-ai': ['OgeSmartPaste'],
        '@oge-ui/react-forms': ['OgeForm'],
      },
      types: {
        '@oge-ui/react-ai': ['OgeSmartPasteHandle'],
        '@oge-ui/react-forms': ['OgeFormHandle', 'OgeFormItemDefinition'],
      },
      name: 'SmartPasteForm',
      before: `interface Customer {
  name: string;
  email: string;
  phone: string;
  company: string;
  seats: number | null;
  start: Date | null;
  plan: string;
}

const sample = 'Ada Lovelace\\nAnalytical Engines Ltd\\nada@engines.example';

const fields: OgeFormItemDefinition[] = [
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
      body: `// The model maps the copied text onto the form's fields; every value is
// checked against the field's type and choices, and the table shows
// Now → New before anything is written. The request carries the field
// catalog and the pasted text — never the form's current values.
const form = useRef<OgeFormHandle<Customer>>(null);
const paste = useRef<OgeSmartPasteHandle>(null);
const [customer, setCustomer] = useState<Customer>({
  name: '', email: '', phone: '', company: '', seats: null, start: null, plan: 'free',
});`,
      jsx: `<>
  <OgeSmartPaste ref={paste} target={form} />
  <button type="button" onClick={() => paste.current?.paste(sample)}>
    Try the sample text
  </button>
  <OgeForm<Customer>
    ref={form}
    formData={customer}
    onFormDataChange={setCustomer}
    colCount={2}
    items={fields}
  />
</>`,
    }),
  },
  {
    title: 'AI column',
    source: reactDemoSource({
      react: ['useMemo'],
      use: {
        '@oge-ui/react-ai': ['OgeAiCell', 'createOgeAiColumn'],
        '@oge-ui/react-grid': ['OgeGrid'],
      },
      types: { '@oge-ui/react-grid': ['OgeGridColumnProps'] },
      name: 'ReviewsWithSentiment',
      before: `interface Review {
  id: number;
  product: string;
  review: string;
  stars: number;
}

const reviews: Review[] = [
  { id: 1, product: 'Desk lamp', review: 'Loved it — bright, sturdy and arrived fast.', stars: 5 },
  { id: 2, product: 'Office chair', review: 'Arrived damaged and support was rude.', stars: 1 },
  { id: 3, product: 'Keyboard', review: 'Does the job. Keys are a bit loud.', stars: 3 },
];`,
      body: `// One machine per column, shared by every cell. It sends exactly the fields
// named in \`inputs\` — here the review text of the visible rows, batched.
const sentiment = useMemo(
  () =>
    createOgeAiColumn<Review>({
      prompt: "Classify the review's sentiment",
      inputs: ['review'],
      keyField: 'id',
      values: [
        { value: 'positive', text: 'Positive' },
        { value: 'neutral', text: 'Neutral' },
        { value: 'negative', text: 'Negative' },
      ],
    }),
  [],
);
const columns: OgeGridColumnProps<Review>[] = [
  { field: 'product', caption: 'Product' },
  { field: 'review', caption: 'Review' },
  { field: 'stars', caption: 'Stars', dataType: 'number', width: 80 },
  {
    caption: 'Sentiment',
    width: 140,
    renderCell: ({ row }) => <OgeAiCell column={sentiment} row={row} />,
  },
];`,
      jsx: `<>
  <OgeGrid data={reviews} keyField="id" columns={columns} />
  <button type="button" onClick={() => sentiment.refresh()}>
    Recompute
  </button>
</>`,
    }),
  },
  {
    title: 'Chat',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-ai': ['OgeChat'] },
      types: { '@oge-ui/react-ai': ['OgeChatMessage'] },
      name: 'SupportChat',
      body: `// The log is a polite live region; messages are text, never HTML.
const [history, setHistory] = useState<readonly OgeChatMessage[]>([]);`,
      jsx: `<OgeChat
  instructions="You are the support assistant of Acme. Answer briefly."
  suggestions={['How much does Pro cost?', 'Which models work?']}
  conversation={history}
  onConversationChange={setHistory}
/>`,
    }),
  },
  {
    title: 'Transports and configuration',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-ai': [
          'OgeAiConfigProvider',
          'OgeGridAssistant',
          'createOgeAiHttpTransport',
          'createOgeAnthropicTransport',
          'createOgeOpenAiTransport',
        ],
      },
      name: 'AiTransports',
      before: `// A local model through Ollama's OpenAI-compatible API — nothing leaves the machine.
const local = createOgeOpenAiTransport({ baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' });

// Claude through your own proxy route.
export const claude = createOgeAnthropicTransport({ baseUrl: '/api/anthropic', model: 'claude-haiku-5-5' });

// Production: your backend calls the model; the browser never holds a key.
const production = createOgeAiHttpTransport({ url: '/api/ai' });

// Your endpoint, e.g. in Node: forward the OgeAiRequest, return { text }.
//
// app.post('/api/ai', async (req, res) => {
//   const { messages, responseSchema, temperature } = req.body;
//   const answer = await openai.chat.completions.create({
//     model: 'gpt-4.1-mini',
//     messages,
//     temperature,
//     response_format: { type: 'json_schema', json_schema: { name: 'oge', schema: responseSchema } },
//   });
//   res.json({ text: answer.choices[0].message.content });
// });`,
      jsx: `<OgeAiConfigProvider
  config={{
    transport: production,
    gridAssistant: { mode: 'preview', undoLimit: 50 },
    messages: { gridAssistant: { placeholder: 'Ask about your orders…' } },
  }}
>
  {/* pick the transport per environment; nothing else changes */}
  <OgeGridAssistant transport={local} />
</OgeAiConfigProvider>`,
    }),
  },
];

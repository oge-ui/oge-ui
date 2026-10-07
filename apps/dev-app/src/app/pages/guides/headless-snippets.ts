/** Code samples rendered on the headless engines guide. */
import { demoSource } from '../../shared/demo-source';

export const CORE_QUERY = demoSource({
  helpers: { '@oge-ui/core': ['runLoadOptions'] },
  before: `interface Order {
  id: number;
  customer: string;
  total: number;
}

const ORDERS: Order[] = [
  { id: 1, customer: 'Ada', total: 120 },
  { id: 2, customer: 'Grace', total: 80 },
  { id: 3, customer: 'Linus', total: 310 },
];`,
  template: `<!-- your own markup over the grid's query engine -->
<ul>
  @for (order of rows(); track order.id) {
    <li>{{ order.customer }} — {{ order.total }}</li>
  }
</ul>
<p>{{ page().totalCount }} orders of 100 or more</p>`,
  body: `// the same filter → search → sort → page pipeline the data grid runs in memory
protected readonly page = computed(() =>
  runLoadOptions(ORDERS, {
    filter: { type: 'binary', field: 'total', op: 'ge', value: 100 },
    sort: [{ field: 'total', dir: 'desc' }],
    skip: 0,
    take: 20,
    requireTotalCount: true,
  }),
);

// no \`group\` in the query, so the result is rows, not group items
protected readonly rows = computed(() => this.page().data as readonly Order[]);`,
});

export const CORE_CSV = `import { buildCsv, parseStateJson, sanitizeGridStateSnapshot } from '@oge-ui/core';

// CSV with the formula guard on (=cmd|… is written as text, not evaluated)
const csv = buildCsv(orders, [
  { caption: 'Customer', accessor: (row) => row.customer },
  { caption: 'Total', accessor: (row) => row.total },
]);

// restore a stored grid state without trusting it
const state = sanitizeGridStateSnapshot(parseStateJson(localStorage.getItem('orders') ?? ''));`;

export const SCHEDULER_ENGINE = `import { expandRecurrence, parseRecurrenceRule } from '@oge-ui/scheduler-engine';

// RFC 5545 subset: FREQ, INTERVAL, COUNT / UNTIL, BYDAY, BYMONTHDAY, BYMONTH, BYSETPOS, …
const rule = parseRecurrenceRule('FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6');
const dates = rule
  ? expandRecurrence(rule, new Date(2026, 9, 5, 9), new Date(2026, 9, 1), new Date(2026, 10, 1))
  : [];`;

export const BPMN_ENGINE = `import { readBpmnXml, renderDiagramSvg, writeBpmnXml } from '@oge-ui/bpmn-engine';

// on a server too: import, validate, render a static SVG, write normalized XML
const { model, warnings } = readBpmnXml(xml);
if (model) {
  const svg = renderDiagramSvg(model);
  const normalized = writeBpmnXml(model); // byte-stable: import → export → import is equal
}`;

export const CHARTS_ENGINE = `import { createLinearScale, niceTicks } from '@oge-ui/charts-engine';

niceTicks(0, 87, 5); // round tick values for an axis
const y = createLinearScale({ min: 0, max: 100, rangePx: 320, inverted: true });
y.toPx(25); // domain value → pixel offset; y.ticks holds the tick values`;

export const ADAPTER = `// @oge-ui/behavior — how a framework-free machine holds reactive state
export interface OgeReactiveCell<T> {
  (): T;
  set(value: T): void;
}

export interface OgeReactivityAdapter {
  cell<T>(initial: T): OgeReactiveCell<T>;
  derived<T>(compute: () => T): () => T;
}

// Angular backs it with signal() / computed(); React with a store plus
// change notification; a test can use plain closures.`;

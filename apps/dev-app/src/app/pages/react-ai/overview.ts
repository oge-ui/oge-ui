import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  createOgeOpenAiTransport,
  OgeGridAssistant,
  type OgeAiGridColumn,
  type OgeAiRequest,
  type OgeAiTransport,
  type OgeGridAssistantHandle,
} from '@oge-ui/react-ai';
import {
  OgeGrid,
  type OgeGridColumnProps,
  type OgeGridHandle,
} from '@oge-ui/react-grid';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  AI_DEMO_STATUSES,
  createDemoAiTransport,
  makeAiOrders,
  type AiOrder,
} from '../ai/ai-demo';
import { AI_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_AI_OVERVIEW_SECTIONS = [
  'Getting started',
  'Apply at once and undo',
  'What the model sees',
  'Events',
  'Transports and configuration',
] as const;

const PRE =
  'mt-3 max-h-72 overflow-auto rounded-md bg-gray-50 p-3 text-xs whitespace-pre-wrap dark:bg-gray-900';
const ORDERS = makeAiOrders();
const COLUMNS: OgeGridColumnProps<AiOrder>[] = [
  { field: 'id', caption: 'Order', dataType: 'number', width: 90 },
  { field: 'customer', caption: 'Customer' },
  { field: 'city', caption: 'City' },
  {
    field: 'status',
    caption: 'Status',
    dataType: 'number',
    lookup: {
      dataSource: AI_DEMO_STATUSES,
      valueExpr: 'id',
      displayExpr: 'label',
    },
  },
  {
    field: 'amount',
    caption: 'Amount',
    dataType: 'number',
    format: { type: 'currency', currency: 'EUR' },
  },
  {
    field: 'ordered',
    caption: 'Ordered',
    dataType: 'date',
    format: { type: 'date' },
  },
];
const DESCRIBED: OgeAiGridColumn[] = [
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
    description: 'Net order value in EUR',
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

/**
 * The transport every React demo on the page uses: the offline demo model
 * until the reader connects a real one in the last section.
 */
const DEMO = createDemoAiTransport();
let current: OgeAiTransport = DEMO;
const listeners = new Set<(label: string) => void>();
const SHARED: OgeAiTransport = {
  complete: (request, options) => current.complete(request, options),
};
function useTransportLabel(): string {
  const [label, setLabel] = useState('the offline demo model');
  useEffect(() => {
    listeners.add(setLabel);
    return () => {
      listeners.delete(setLabel);
    };
  }, []);
  return label;
}

function OrdersGrid({
  grid,
  pageSize,
}: {
  grid: RefObject<OgeGridHandle<AiOrder> | null>;
  pageSize: number;
}): ReactNode {
  return createElement(OgeGrid<AiOrder>, {
    ref: grid,
    data: ORDERS,
    keyField: 'id',
    columns: COLUMNS,
    groupPanel: true,
    paging: { pageSize },
  });
}

function GettingStartedDemo(): ReactNode {
  const grid = useRef<OgeGridHandle<AiOrder>>(null);
  return createElement(
    'div',
    null,
    createElement(OgeGridAssistant, {
      target: grid,
      transport: SHARED,
      suggestions: [
        'Orders over 500 this month',
        'Group by status',
        'Newest first',
      ],
    }),
    createElement(
      'div',
      { className: 'mt-3' },
      createElement(OrdersGrid, { grid, pageSize: 8 }),
    ),
  );
}

function ApplyDemo(): ReactNode {
  const grid = useRef<OgeGridHandle<AiOrder>>(null);
  const assistant = useRef<OgeGridAssistantHandle>(null);
  return createElement(
    'div',
    null,
    createElement(OgeGridAssistant, {
      ref: assistant,
      target: grid,
      transport: SHARED,
      mode: 'apply',
    }),
    createElement(
      'div',
      { className: 'mt-3 flex flex-wrap gap-2' },
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => void assistant.current?.submit('Newest first'),
        },
        'Ask “Newest first” from code',
      ),
    ),
    createElement(
      'div',
      { className: 'mt-3' },
      createElement(OrdersGrid, { grid, pageSize: 8 }),
    ),
  );
}

function PrivacyDemo(): ReactNode {
  const grid = useRef<OgeGridHandle<AiOrder>>(null);
  const [request, setRequest] = useState<OgeAiRequest | null>(null);
  const inspected = useMemo<OgeAiTransport>(
    () => ({
      complete: (r, options) => {
        setRequest(r);
        return SHARED.complete(r, options);
      },
    }),
    [],
  );
  return createElement(
    'div',
    null,
    createElement(OgeGridAssistant, {
      target: grid,
      transport: inspected,
      columns: DESCRIBED,
      capabilities: { columns: false },
      instructions:
        "Amounts are net, in EUR. 'Open' orders are not shipped yet.",
      suggestions: ['Open orders over 1000', 'Hide the city column'],
    }),
    createElement(
      'div',
      { className: 'mt-3' },
      createElement(OrdersGrid, { grid, pageSize: 5 }),
    ),
    createElement(
      'pre',
      { className: PRE, 'data-testid': 'ai-request' },
      request
        ? request.messages.map((m) => `[${m.role}]\n${m.content}`).join('\n\n')
        : 'Send a prompt to see the request the model receives.',
    ),
  );
}

function EventsDemo(): ReactNode {
  const grid = useRef<OgeGridHandle<AiOrder>>(null);
  const [veto, setVeto] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((l) => [line, ...l]);
  return createElement(
    'div',
    null,
    createElement(
      'label',
      { className: 'mb-3 flex items-center gap-2' },
      createElement('input', {
        type: 'checkbox',
        checked: veto,
        onChange: () => setVeto(!veto),
      }),
      'Veto changes to column visibility',
    ),
    createElement(OgeGridAssistant, {
      target: grid,
      transport: SHARED,
      mode: 'apply',
      suggestions: ['Hide the city column', 'Sort by amount, highest first'],
      onApplying: (event) => {
        if (veto && event.slices.includes('columns')) {
          event.cancel = true;
          note(`vetoed: ${event.summary}`);
        }
      },
      onApplied: (event) =>
        note(`applied: ${event.prompt} → ${event.slices.join(', ')}`),
      onUndone: (event) => note(`undone: ${event.summary}`),
      onErrorOccurred: (event) => note(`error: ${event.code}`),
    }),
    createElement(
      'div',
      { className: 'mt-3' },
      createElement(OrdersGrid, { grid, pageSize: 5 }),
    ),
    createElement(
      'ol',
      {
        className: 'mt-3 list-decimal ps-6 text-sm',
        'data-testid': 'ai-event-log',
      },
      log.map((line, i) => createElement('li', { key: i }, line)),
    ),
  );
}

function ConfigDemo(): ReactNode {
  const label = useTransportLabel();
  const baseUrl = useRef<HTMLInputElement>(null);
  const model = useRef<HTMLInputElement>(null);
  const apiKey = useRef<HTMLInputElement>(null);
  const announce = (text: string) => listeners.forEach((l) => l(text));
  const field = (
    caption: string,
    ref: RefObject<HTMLInputElement | null>,
    props: Record<string, unknown>,
  ) =>
    createElement(
      'label',
      { className: 'grid gap-1' },
      caption,
      createElement('input', {
        ref,
        className: 'rounded border px-2 py-1',
        ...props,
      }),
    );
  return createElement(
    'form',
    {
      className: 'grid max-w-xl gap-2 text-sm',
      onSubmit: (event: FormEvent) => {
        event.preventDefault();
        const url = baseUrl.current?.value.trim() ?? '';
        const name = model.current?.value.trim() ?? '';
        if (!url || !name) return;
        current = createOgeOpenAiTransport({
          baseUrl: url,
          model: name,
          apiKey: apiKey.current?.value.trim() || undefined,
          // the reader's own key, held in memory for this tab only
          dangerouslyAllowBrowser: true,
        });
        announce(`${name} at ${url}`);
      },
    },
    field('Base URL', baseUrl, {
      name: 'baseUrl',
      defaultValue: 'http://localhost:11434/v1',
    }),
    field('Model', model, { name: 'model', defaultValue: 'llama3.1' }),
    field('API key (optional)', apiKey, {
      name: 'apiKey',
      type: 'password',
      autoComplete: 'off',
    }),
    createElement(
      'div',
      { className: 'flex flex-wrap gap-2' },
      createElement('button', { type: 'submit' }, 'Use this model'),
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => {
            current = DEMO;
            announce('the offline demo model');
          },
        },
        'Back to the demo model',
      ),
    ),
    createElement(
      'p',
      { 'data-testid': 'ai-transport-label' },
      `Now answering: ${label}`,
    ),
  );
}

/**
 * The React demos of the AI overview, rendered inside `/components/ai` when
 * the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-ai-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React packages carry class names but no styles of their own — the
  // docs pull the same SCSS the package builds compile.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/ai/src/styles.scss',
    '../../../../../../packages/react/grid/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['target', 'suggestions', 'preview']"
      heading="Getting started"
      description="Pick a suggestion or type your own request, then Apply or Discard the proposal. The status line under the bar is a polite live region; Escape stops a request or discards a proposal."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['mode=&quot;apply&quot;', 'undo()', 'submit(text)']"
      heading="Apply at once and undo"
      description="In &lt;code&gt;apply&lt;/code&gt; mode the change lands immediately; Undo steps back through every applied change. Follow-ups build on the current state — try “newest first”, then “and only İzmir”."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="apply" />
    </app-demo-card>

    <app-demo-card
      [chips]="['columns', 'capabilities', 'instructions']"
      heading="What the model sees"
      description="The panel shows the exact request the last prompt sent. Customer is left out of &lt;code&gt;columns&lt;/code&gt;, so the model never hears of it; column changes are switched off with &lt;code&gt;capabilities&lt;/code&gt;. No row is ever part of a request."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="privacy" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onApplying', 'onApplied', 'onUndone', 'onErrorOccurred']"
      heading="Events"
      description="&lt;code&gt;onApplying&lt;/code&gt; is cancelable — tick the box to veto changes that touch column visibility. &lt;code&gt;onApplied&lt;/code&gt; carries the complete snapshot, ready to be saved as a view."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="events" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'OgeAiConfigProvider',
        'createOgeOpenAiTransport',
        'createOgeAiHttpTransport',
      ]"
      heading="Transports and configuration"
      description="Point every demo on this page at a real OpenAI-compatible endpoint — a local Ollama needs no key. The key is held in this tab’s memory only and sent straight to the URL you enter; in production use your own backend so the key never reaches the browser."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactAiOverviewDemos {
  protected readonly demos = AI_OVERVIEW_DEMOS;
  protected readonly gettingStarted = () => createElement(GettingStartedDemo);
  protected readonly apply = () => createElement(ApplyDemo);
  protected readonly privacy = () => createElement(PrivacyDemo);
  protected readonly events = () => createElement(EventsDemo);
  protected readonly config = () => createElement(ConfigDemo);
}

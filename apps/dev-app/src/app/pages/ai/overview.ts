import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  createOgeOpenAiTransport,
  OgeGridAssistant,
  OgeSmartPaste,
  type OgeAiGridColumn,
  type OgeAiRequest,
  type OgeAiTransport,
  type OgeGridAssistantAppliedEvent,
  type OgeGridAssistantApplyingEvent,
} from '@oge-ui/ai';
import { OgeForm, type OgeFormItemData } from '@oge-ui/forms';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_AI_OVERVIEW_SECTIONS,
  ReactAiOverviewDemos,
} from '../react-ai/overview';
import {
  AI_DEMO_STATUSES,
  createDemoAiTransport,
  makeAiOrders,
  type AiOrder,
} from './ai-demo';
import { SMART_PASTE_SAMPLE } from './ai-demo-smart-paste';
import {
  APPLY_SNIPPET,
  CONFIG_SNIPPET,
  EVENTS_SNIPPET,
  GETTING_STARTED_SNIPPET,
  PRIVACY_SNIPPET,
  SMART_PASTE_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Getting started',
  'Apply at once and undo',
  'What the model sees',
  'Events',
  'Smart paste',
  'Transports and configuration',
] as const;

/** Wraps a transport and remembers the last request it sent. */
export function inspectingTransport(
  inner: OgeAiTransport,
  seen: (request: OgeAiRequest) => void,
): OgeAiTransport {
  return {
    complete(request, options) {
      seen(request);
      return inner.complete(request, options);
    },
  };
}

@Component({
  selector: 'app-ai-overview',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    RouterLink,
    OgeColumn,
    OgeGrid,
    OgeGridAssistant,
    OgeSmartPaste,
    OgeForm,
    ReactAiOverviewDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="AI"
      category="AI"
      categoryLink="/components/ai"
      [chips]="['any model', 'no row data sent', 'preview + undo', 'MIT']"
    >
      <p>
        AI that works with <strong>your</strong> model. The grid assistant turns
        a sentence — “orders over 500 from İzmir this month, newest first” —
        into a sort, filter, grouping, search or column change, checks every
        field, operator and value the model returns against the grid's columns,
        and applies it after you press Apply. Undo steps back.
      </p>
      <p>
        There is no hosted service and no AI surcharge: requests go to the
        transport you configure — your own backend, any OpenAI-compatible server
        (OpenAI, Azure, Ollama, vLLM) or Anthropic. The model is told the column
        names, types and lookup values; rows never leave the page. The demos
        below run on an offline demo model, so they work without a key — connect
        a real one in the last section.
        @if (fw.isReact()) {
          The React assistant runs the same machine from
          <code>&#64;oge-ui/behavior</code> and loads the same stylesheet.
        }
        <a routerLink="/components/ai/api">Full API reference →</a>
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-ai-overview-demos />
    } @else {
      <app-demo-card
        [chips]="['[target]', 'suggestions', 'preview']"
        heading="Getting started"
        description="Pick a suggestion or type your own request, then Apply or Discard the proposal. The status line under the bar is a polite live region; Escape stops a request or discards a proposal."
        [code]="gettingStartedSnippet"
        language="ts"
      >
        <oge-grid-assistant
          [target]="grid1"
          [transport]="transport()"
          [suggestions]="suggestions"
        />
        <div class="mt-3">
          <oge-grid
            #grid1
            [data]="orders"
            keyField="id"
            [groupPanel]="true"
            [searchPanel]="true"
            [paging]="{ pageSize: 8 }"
          >
            <oge-column
              field="id"
              caption="Order"
              dataType="number"
              [width]="90"
            />
            <oge-column field="customer" caption="Customer" />
            <oge-column field="city" caption="City" />
            <oge-column
              field="status"
              caption="Status"
              dataType="number"
              [lookup]="statusLookup"
            />
            <oge-column
              field="amount"
              caption="Amount"
              dataType="number"
              [format]="money"
            />
            <oge-column
              field="ordered"
              caption="Ordered"
              dataType="date"
              [format]="day"
            />
          </oge-grid>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['mode=&quot;apply&quot;', 'undo()', 'submit(text)']"
        heading="Apply at once and undo"
        description="In &lt;code&gt;apply&lt;/code&gt; mode the change lands immediately; Undo steps back through every applied change. Follow-ups build on the current state — try “newest first”, then “and only İzmir”."
        [code]="applySnippet"
        language="ts"
      >
        <oge-grid-assistant
          #assistant2
          [target]="grid2"
          [transport]="transport()"
          mode="apply"
        />
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" (click)="assistant2.submit('Newest first')">
            Ask “Newest first” from code
          </button>
        </div>
        <div class="mt-3">
          <oge-grid
            #grid2
            [data]="orders"
            keyField="id"
            [groupPanel]="true"
            [paging]="{ pageSize: 8 }"
          >
            <oge-column
              field="id"
              caption="Order"
              dataType="number"
              [width]="90"
            />
            <oge-column field="customer" caption="Customer" />
            <oge-column field="city" caption="City" />
            <oge-column
              field="status"
              caption="Status"
              dataType="number"
              [lookup]="statusLookup"
            />
            <oge-column
              field="amount"
              caption="Amount"
              dataType="number"
              [format]="money"
            />
            <oge-column
              field="ordered"
              caption="Ordered"
              dataType="date"
              [format]="day"
            />
          </oge-grid>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['[columns]', '[capabilities]', 'instructions']"
        heading="What the model sees"
        description="The panel shows the exact request the last prompt sent. Customer is left out of &lt;code&gt;[columns]&lt;/code&gt;, so the model never hears of it; column changes are switched off with &lt;code&gt;[capabilities]&lt;/code&gt;. No row is ever part of a request."
        [code]="privacySnippet"
        language="ts"
      >
        <oge-grid-assistant
          [target]="grid3"
          [transport]="inspected"
          [columns]="described"
          [capabilities]="{ columns: false }"
          instructions="Amounts are net, in EUR. 'Open' orders are not shipped yet."
          [suggestions]="['Open orders over 1000', 'Hide the city column']"
        />
        <div class="mt-3">
          <oge-grid
            #grid3
            [data]="orders"
            keyField="id"
            [paging]="{ pageSize: 5 }"
          >
            <oge-column
              field="id"
              caption="Order"
              dataType="number"
              [width]="90"
            />
            <oge-column field="customer" caption="Customer" />
            <oge-column field="city" caption="City" />
            <oge-column
              field="status"
              caption="Status"
              dataType="number"
              [lookup]="statusLookup"
            />
            <oge-column
              field="amount"
              caption="Amount"
              dataType="number"
              [format]="money"
            />
            <oge-column
              field="ordered"
              caption="Ordered"
              dataType="date"
              [format]="day"
            />
          </oge-grid>
        </div>
        <pre
          class="mt-3 max-h-72 overflow-auto rounded-md bg-gray-50 p-3 text-xs whitespace-pre-wrap dark:bg-gray-900"
          data-testid="ai-request"
          >{{ requestText() }}</pre>
      </app-demo-card>

      <app-demo-card
        [chips]="['(applying)', '(applied)', '(undone)', '(errorOccurred)']"
        heading="Events"
        description="&lt;code&gt;(applying)&lt;/code&gt; is cancelable — tick the box to veto changes that touch column visibility. &lt;code&gt;(applied)&lt;/code&gt; carries the complete snapshot, ready to be saved as a view."
        [code]="eventsSnippet"
        language="ts"
      >
        <label class="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            [checked]="veto()"
            (change)="veto.set(!veto())"
          />
          Veto changes to column visibility
        </label>
        <oge-grid-assistant
          [target]="grid4"
          [transport]="transport()"
          mode="apply"
          [suggestions]="[
            'Hide the city column',
            'Sort by amount, highest first',
          ]"
          (applying)="onApplying($event)"
          (applied)="onApplied($event)"
          (undone)="note('undone: ' + $event.summary)"
          (errorOccurred)="note('error: ' + $event.code)"
        />
        <div class="mt-3">
          <oge-grid
            #grid4
            [data]="orders"
            keyField="id"
            [paging]="{ pageSize: 5 }"
          >
            <oge-column
              field="id"
              caption="Order"
              dataType="number"
              [width]="90"
            />
            <oge-column field="customer" caption="Customer" />
            <oge-column field="city" caption="City" />
            <oge-column
              field="status"
              caption="Status"
              dataType="number"
              [lookup]="statusLookup"
            />
            <oge-column
              field="amount"
              caption="Amount"
              dataType="number"
              [format]="money"
            />
            <oge-column
              field="ordered"
              caption="Ordered"
              dataType="date"
              [format]="day"
            />
          </oge-grid>
        </div>
        <ol class="mt-3 list-decimal ps-6 text-sm" data-testid="ai-event-log">
          @for (line of log(); track $index) {
            <li>{{ line }}</li>
          }
        </ol>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'oge-smart-paste',
          '[target]',
          'describeFields()',
          'clipboard',
        ]"
        heading="Smart paste"
        description="Copy a signature block or an email and press Smart paste — or use the sample. The table shows each field’s value now and the value from the text; Apply writes them, Undo puts the old ones back. When the clipboard cannot be read, a text box takes the paste."
        [code]="smartPasteSnippet"
        language="ts"
      >
        <pre
          class="mb-3 overflow-x-auto rounded-md bg-gray-50 p-3 text-xs whitespace-pre-wrap dark:bg-gray-900"
          data-testid="smart-paste-sample"
          >{{ sample }}</pre>
        <oge-smart-paste
          #smartPaste
          [target]="customerForm"
          [transport]="transport()"
        />
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" (click)="smartPaste.paste(sample)">
            Try the sample text
          </button>
        </div>
        <div class="mt-3">
          <oge-form
            #customerForm
            [(formData)]="customer"
            [items]="customerFields"
            [colCount]="2"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'provideOgeAiConfig',
          'createOgeOpenAiTransport',
          'createOgeAiHttpTransport',
        ]"
        heading="Transports and configuration"
        description="Point every demo on this page at a real OpenAI-compatible endpoint — a local Ollama needs no key. The key is held in this tab’s memory only and sent straight to the URL you enter; in production use your own backend so the key never reaches the browser."
        [code]="configSnippet"
        language="ts"
      >
        <form class="grid max-w-xl gap-2 text-sm" (submit)="connect($event)">
          <label class="grid gap-1">
            Base URL
            <input
              #baseUrl
              class="rounded border px-2 py-1"
              name="baseUrl"
              value="http://localhost:11434/v1"
            />
          </label>
          <label class="grid gap-1">
            Model
            <input
              #model
              class="rounded border px-2 py-1"
              name="model"
              value="llama3.1"
            />
          </label>
          <label class="grid gap-1">
            API key (optional)
            <input
              #apiKey
              class="rounded border px-2 py-1"
              name="apiKey"
              type="password"
              autocomplete="off"
            />
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              type="submit"
              (click)="connectTo(baseUrl.value, model.value, apiKey.value)"
            >
              Use this model
            </button>
            <button type="button" (click)="useDemo()">
              Back to the demo model
            </button>
          </div>
          <p data-testid="ai-transport-label">
            Now answering: {{ transportLabel() }}
          </p>
        </form>
      </app-demo-card>
    }
  `,
})
export class AiOverviewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_AI_OVERVIEW_SECTIONS;

  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly applySnippet = APPLY_SNIPPET;
  protected readonly privacySnippet = PRIVACY_SNIPPET;
  protected readonly eventsSnippet = EVENTS_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;
  protected readonly smartPasteSnippet = SMART_PASTE_SNIPPET;

  protected readonly sample = SMART_PASTE_SAMPLE;
  protected readonly customer = signal({
    name: '',
    email: '',
    phone: '',
    company: '',
    seats: null as number | null,
    start: null as Date | null,
    plan: 'free',
  });
  protected readonly customerFields: OgeFormItemData[] = [
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
  ];

  protected readonly orders: AiOrder[] = makeAiOrders();
  protected readonly statusLookup = {
    dataSource: AI_DEMO_STATUSES,
    valueExpr: 'id',
    displayExpr: 'label',
  };
  protected readonly money = {
    type: 'currency',
    currency: 'EUR',
  } as const;
  protected readonly day = { type: 'date' } as const;
  protected readonly suggestions = [
    'Orders over 500 this month',
    'Group by status',
    'Newest first',
  ];

  private readonly demo = createDemoAiTransport();
  protected readonly transport = signal<OgeAiTransport>(this.demo);
  protected readonly transportLabel = signal('the offline demo model');

  private readonly lastRequest = signal<OgeAiRequest | null>(null);
  protected readonly inspected: OgeAiTransport = inspectingTransport(
    {
      complete: (request, options) =>
        this.transport().complete(request, options),
    },
    (request) => this.lastRequest.set(request),
  );
  protected readonly requestText = computed(() => {
    const request = this.lastRequest();
    return request
      ? request.messages.map((m) => `[${m.role}]\n${m.content}`).join('\n\n')
      : 'Send a prompt to see the request the model receives.';
  });
  protected readonly described: readonly OgeAiGridColumn[] = [
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

  protected readonly veto = signal(false);
  protected readonly log = signal<string[]>([]);

  protected onApplying(event: OgeGridAssistantApplyingEvent): void {
    if (this.veto() && event.slices.includes('columns')) {
      event.cancel = true;
      this.log.update((l) => [`vetoed: ${event.summary}`, ...l]);
    }
  }

  protected onApplied(event: OgeGridAssistantAppliedEvent): void {
    this.log.update((l) => [
      `applied: ${event.prompt} → ${event.slices.join(', ')}`,
      ...l,
    ]);
  }

  protected note(line: string): void {
    this.log.update((l) => [line, ...l]);
  }

  protected connect(event: Event): void {
    event.preventDefault();
  }

  protected connectTo(baseUrl: string, model: string, apiKey: string): void {
    if (!baseUrl.trim() || !model.trim()) return;
    this.transport.set(
      createOgeOpenAiTransport({
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: apiKey.trim() || undefined,
        // the reader's own key, held in memory for this tab only
        dangerouslyAllowBrowser: true,
      }),
    );
    this.transportLabel.set(`${model.trim()} at ${baseUrl.trim()}`);
  }

  protected useDemo(): void {
    this.transport.set(this.demo);
    this.transportLabel.set('the offline demo model');
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeAccordion,
  OgeAccordionActionRow,
  OgeAccordionContentTemplate,
  OgeAccordionHeaderActionsTemplate,
  OgeAccordionItem,
  type OgeAccordionExpandedEvent,
  type OgeAccordionItemData,
  type OgeAccordionTogglePosition,
} from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_OVERVIEW_SECTIONS,
  ReactLayoutOverviewDemos,
} from '../react-layout/overview';
import {
  ACTIONS_SNIPPET,
  BASIC_SNIPPET,
  GUARD_SNIPPET,
  INVALID_SNIPPET,
  ITEMS_SNIPPET,
  LAZY_SNIPPET,
  LOADER_SNIPPET,
  MODE_SNIPPET,
  PANEL_SNIPPET,
  STYLING_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Declarative panels',
  'Data-driven items',
  'Single, multiple & collapsible',
  'Lazy rendering & keep-alive',
  'Async expand guard',
  'Invalid sections',
  'Async content loader',
  'Header actions',
  'Panel-level control',
  'Toggle position & styling',
] as const;

@Component({
  selector: 'app-created-at',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="text-sm">Created at {{ createdAt }}</p>`,
})
class CreatedAt {
  protected readonly createdAt = new Date().toLocaleTimeString();
}

@Component({
  selector: 'app-layout-overview',
  imports: [
    OgeAccordion,
    OgeAccordionItem,
    OgeAccordionActionRow,
    OgeAccordionContentTemplate,
    OgeAccordionHeaderActionsTemplate,
    CreatedAt,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutOverviewDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Accordion"
      category="Layout"
      [chips]="['APG pattern', 'signals', 'lazy render', 'async guards']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeAccordion&gt;</code> stacks disclosure panels that come
          from its <code>items</code> array — each entry carrying its own
          <code>content</code>, the React counterpart of a projected
          <code>&lt;oge-accordion-item&gt;</code>. It follows the WAI-ARIA APG
          accordion pattern — each title is a <code>&lt;button&gt;</code> inside
          a heading and every header stays in the page Tab sequence — and layers
          arrow / Home / End / type-ahead navigation on top. Height animation,
          RTL and <code>prefers-reduced-motion</code> work out of the box, and
          the expansion arithmetic is the shared
          <code>&#64;oge-ui/behavior</code>
          engine, so both layers answer identically.
        </p>
      } @else {
        <p>
          <code>&lt;oge-accordion&gt;</code> stacks disclosure panels that come
          from projected <code>&lt;oge-accordion-item&gt;</code> children, from
          a data-driven <code>items</code> array, or both. It follows the
          WAI-ARIA APG accordion pattern — each title is a
          <code>&lt;button&gt;</code> inside a heading and every header stays in
          the page Tab sequence — and layers arrow / Home / End / type-ahead
          navigation on top. Height animation, RTL and
          <code>prefers-reduced-motion</code> work out of the box.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-overview-demos />
    } @else {
      <app-demo-card
        [chips]="['[(selectedIndex)]', 'collapsible', 'badge', 'disabled']"
        heading="Declarative panels"
        description="Projected children carry their own content. <code>selectedIndex</code> is a two-way model for the single-expand case; a user gesture first fires the cancelable <code>itemExpanding</code>, then <code>itemExpanded</code>. <code>collapsible</code> lets a second click close the open panel — without it the last open panel deliberately stays open (see the third demo). Disabled panels are skipped by clicks and arrow keys."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-accordion
          [(selectedIndex)]="basicIndex"
          [collapsible]="true"
          (itemExpanded)="lastExpanded.set($event)"
        >
          <oge-accordion-item title="Account" description="Name and e-mail">
            <p>Account settings — selected index: {{ basicIndex() }}</p>
          </oge-accordion-item>
          <oge-accordion-item title="Notifications" [badge]="3">
            <p>Notification settings…</p>
          </oge-accordion-item>
          <oge-accordion-item title="Archived" [disabled]="true">
            <p>Never reachable…</p>
          </oge-accordion-item>
        </oge-accordion>
        @if (lastExpanded(); as event) {
          <p class="mt-2 text-sm opacity-70">
            itemExpanded → index {{ event.index }}
          </p>
        }
      </app-demo-card>

      <app-demo-card
        [chips]="['items', '[(expandedKeys)]', 'icon', 'description']"
        heading="Data-driven items"
        description="The <code>items</code> array drives the panels; <code>expandedKeys</code> is the multi-expand two-way model, so state survives reordering and insertions. <code>icon</code> takes raw SVG path data — there is no icon font or icon package. A component-level <code>ogeAccordionContentTemplate</code> renders every item's body."
        [code]="itemsSnippet"
        language="ts"
      >
        <oge-accordion
          [items]="settingsSections"
          [multiple]="true"
          [collapsible]="true"
          [(expandedKeys)]="openKeys"
        >
          <ng-template ogeAccordionContentTemplate let-item>
            <p>
              Body of <b>{{ item?.title }}</b> — expandedKeys:
              <code>{{ openKeys().join(', ') || '(none)' }}</code>
            </p>
          </ng-template>
        </oge-accordion>
      </app-demo-card>

      <app-demo-card
        [chips]="['multiple', 'collapsible', 'aria-disabled']"
        heading="Single, multiple & collapsible"
        description='Single-expand collapses the sibling automatically. Without <code>collapsible</code> the last open panel cannot be closed, and the APG says such a header gets <code>aria-disabled="true"</code> — not <code>disabled</code>, so it stays focusable. Toggle the switches and watch the open header.'
        [code]="modeSnippet"
        language="ts"
      >
        <div class="mb-2 flex gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="multiple()"
              (change)="multiple.set(!multiple())"
            />
            multiple
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="collapsible()"
              (change)="collapsible.set(!collapsible())"
            />
            collapsible
          </label>
        </div>
        <oge-accordion
          [items]="settingsSections"
          [multiple]="multiple()"
          [collapsible]="collapsible()"
        >
          <ng-template ogeAccordionContentTemplate let-item>
            <p>{{ item?.title }} body…</p>
          </ng-template>
        </oge-accordion>
      </app-demo-card>

      <app-demo-card
        [chips]="['deferRendering', 'keepAlive']"
        heading="Lazy rendering & keep-alive"
        description="With <code>deferRendering</code> (default) a lazy <code>ogeAccordionContentTemplate</code> is instantiated on first expand; <code>keepAlive</code> (default) then keeps it mounted while collapsed — the creation time does not change when you reopen. Turn keep-alive off and the content is recreated every time."
        [code]="lazySnippet"
        language="ts"
      >
        <label class="mb-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            [checked]="keepAlive()"
            (change)="keepAlive.set(!keepAlive())"
          />
          keepAlive
        </label>
        <oge-accordion
          [keepAlive]="keepAlive()"
          [multiple]="true"
          [collapsible]="true"
        >
          <oge-accordion-item title="First">
            <ng-template ogeAccordionContentTemplate
              ><app-created-at
            /></ng-template>
          </oge-accordion-item>
          <oge-accordion-item title="Second">
            <ng-template ogeAccordionContentTemplate
              ><app-created-at
            /></ng-template>
          </oge-accordion-item>
        </oge-accordion>
      </app-demo-card>

      <app-demo-card
        [chips]="['expandGuard', 'single-flight', 'rejection = veto']"
        heading="Async expand guard"
        description="Expanding runs a pipeline: cancelable <code>itemExpanding</code> → the panel's async <code>expandGuard</code> (the header shows a spinner, extra clicks are ignored) → <code>itemExpanded</code>. The guard also runs on collapse. Resolving <code>false</code>, throwing and rejecting all veto. The guarded panel here takes a second to confirm."
        [code]="guardSnippet"
        language="ts"
      >
        <oge-accordion
          [items]="guardedSections"
          [multiple]="true"
          [collapsible]="true"
        >
          <ng-template ogeAccordionContentTemplate let-item>
            <p>{{ item?.title }} body…</p>
          </ng-template>
        </oge-accordion>
      </app-demo-card>

      <app-demo-card
        [chips]="['invalid', 'expandInvalid()']"
        heading="Invalid sections"
        description="Flag a panel <code>invalid</code> and it grows a danger rail, a dot beside the title and a visually hidden label so screen readers announce it. <code>expandInvalid()</code> opens every failing section at once — the natural move after a rejected form submit."
        [code]="invalidSnippet"
        language="ts"
      >
        <oge-accordion
          #invalidAcc
          [items]="formSections()"
          [multiple]="true"
          [collapsible]="true"
        >
          <ng-template ogeAccordionContentTemplate let-item>
            <p>{{ item?.title }} fields…</p>
          </ng-template>
        </oge-accordion>
        <div class="mt-2 flex gap-3">
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="invalidAcc.expandInvalid()"
          >
            Show all errors
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="fixSections()"
          >
            Fix everything
          </button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['contentLoader', 'skeleton', 'retry']"
        heading="Async content loader"
        description="A per-panel <code>contentLoader</code> runs on first expand: a shimmering skeleton shows while it is pending, the resolved value reaches the content template as <code>data</code>, and a rejection renders the failure message with a real retry button. The second panel fails once, then succeeds."
        [code]="loaderSnippet"
        language="ts"
      >
        <oge-accordion [multiple]="true" [collapsible]="true">
          <oge-accordion-item title="Invoices" [contentLoader]="loadInvoices">
            <ng-template ogeAccordionContentTemplate let-data="data">
              <p>{{ data }}</p>
            </ng-template>
          </oge-accordion-item>
          <oge-accordion-item title="Flaky report" [contentLoader]="loadFlaky">
            <ng-template ogeAccordionContentTemplate let-data="data">
              <p>{{ data }}</p>
            </ng-template>
          </oge-accordion-item>
        </oge-accordion>
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeAccordionHeaderActionsTemplate', 'no nested-interactive']"
        heading="Header actions"
        description="The APG puts the panel title in a <code>&amp;lt;button&amp;gt;</code>, so a second focusable control cannot live inside it — axe flags that as <code>nested-interactive</code>. Header actions are therefore rendered as siblings of the toggle: real buttons, reachable with Tab, skipped by the accordion's arrow navigation."
        [code]="actionsSnippet"
        language="ts"
      >
        <oge-accordion [multiple]="true" [collapsible]="true">
          @for (team of teams(); track team) {
            <oge-accordion-item [title]="team">
              <ng-template ogeAccordionHeaderActionsTemplate>
                <button
                  type="button"
                  class="rounded border px-2 py-1 text-xs"
                  (click)="removeTeam(team)"
                >
                  Remove
                </button>
              </ng-template>
              <p>{{ team }} members…</p>
            </oge-accordion-item>
          }
        </oge-accordion>
        <button
          type="button"
          class="mt-2 rounded border px-2 py-1 text-sm"
          (click)="resetTeams()"
        >
          Reset
        </button>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          '[(expanded)]',
          'open() / close()',
          'ogeAccordionActionRow',
          'afterExpand',
        ]"
        heading="Panel-level control"
        description="Each panel owns a two-way <code>[(expanded)]</code> and imperative <code>open()</code>/<code>close()</code>/<code>toggle()</code> — writes go through the same pipeline, so a guard veto reverts the binding. <code>[ogeAccordionActionRow]</code> is the footer action bar (the references' action-row slot), and <code>afterExpand</code>/<code>afterCollapse</code> fire once the height animation settles. Collapsing a panel that holds focus hands focus back to its header."
        [code]="panelSnippet"
        language="ts"
      >
        <oge-accordion
          [multiple]="true"
          [collapsible]="true"
          (afterExpand)="settled.set('afterExpand → ' + $event.index)"
          (afterCollapse)="settled.set('afterCollapse → ' + $event.index)"
        >
          <oge-accordion-item
            #profile
            title="Profile"
            [(expanded)]="profileOpen"
          >
            <p>Name, e-mail and avatar…</p>
            <div ogeAccordionActionRow>
              <button
                type="button"
                class="rounded border px-2 py-1 text-sm"
                (click)="profile.close()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded border px-2 py-1 text-sm"
                (click)="profile.close()"
              >
                Save
              </button>
            </div>
          </oge-accordion-item>
          <oge-accordion-item title="Preferences" [hideToggle]="true">
            <p>This panel overrides <code>hideToggle</code> on its own.</p>
          </oge-accordion-item>
        </oge-accordion>
        <div class="mt-2 flex items-center gap-3 text-sm">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="profileOpen()"
              (change)="profileOpen.set(!profileOpen())"
            />
            [(expanded)] on Profile
          </label>
          @if (settled(); as note) {
            <span class="opacity-70">{{ note }}</span>
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['togglePosition', 'displayMode', 'stylingMode', 'size']"
        heading="Toggle position & styling"
        description="<code>togglePosition</code> is logical, so RTL mirrors it for free. <code>displayMode: 'flat'</code> drops the gutters and joins the panels into one stack, <code>stylingMode</code> switches between outlined, filled and borderless, and <code>size</code> sets the header density."
        [code]="stylingSnippet"
        language="ts"
      >
        <div class="mb-2 flex gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="togglePosition() === 'start'"
              (change)="toggleIconSide()"
            />
            togglePosition = start
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              [checked]="flat()"
              (change)="flat.set(!flat())"
            />
            displayMode = flat
          </label>
        </div>
        <oge-accordion
          [items]="settingsSections"
          [multiple]="true"
          [collapsible]="true"
          [togglePosition]="togglePosition()"
          [displayMode]="flat() ? 'flat' : 'default'"
          stylingMode="filled"
          size="sm"
        >
          <ng-template ogeAccordionContentTemplate let-item>
            <p>{{ item?.title }} body…</p>
          </ng-template>
        </oge-accordion>
      </app-demo-card>
    }
  `,
})
export class LayoutOverviewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_OVERVIEW_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly itemsSnippet = ITEMS_SNIPPET;
  protected readonly modeSnippet = MODE_SNIPPET;
  protected readonly lazySnippet = LAZY_SNIPPET;
  protected readonly guardSnippet = GUARD_SNIPPET;
  protected readonly invalidSnippet = INVALID_SNIPPET;
  protected readonly loaderSnippet = LOADER_SNIPPET;
  protected readonly actionsSnippet = ACTIONS_SNIPPET;
  protected readonly panelSnippet = PANEL_SNIPPET;
  protected readonly stylingSnippet = STYLING_SNIPPET;

  protected readonly basicIndex = signal(-1);
  protected readonly lastExpanded = signal<OgeAccordionExpandedEvent | null>(
    null,
  );
  protected readonly openKeys = signal<readonly string[]>(['general']);
  protected readonly multiple = signal(false);
  protected readonly collapsible = signal(false);
  protected readonly keepAlive = signal(true);
  protected readonly togglePosition = signal<OgeAccordionTogglePosition>('end');
  protected readonly flat = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly settled = signal<string | null>(null);

  protected readonly settingsSections: OgeAccordionItemData[] = [
    {
      key: 'general',
      title: 'General',
      description: 'Language, time zone and formats',
      icon: 'M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5l-1.4 1.4M7.9 16.1l-1.4 1.4m11.2 0l-1.4-1.4M7.9 7.9L6.5 6.5',
    },
    {
      key: 'security',
      title: 'Security',
      description: 'Password and two-factor auth',
      badge: 2,
      icon: 'M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z',
    },
    {
      key: 'danger',
      title: 'Danger zone',
      description: 'Irreversible actions',
    },
  ];

  protected readonly guardedSections: OgeAccordionItemData[] = [
    { key: 'plain', title: 'Opens right away' },
    {
      key: 'slow',
      title: 'Confirms first (1s)',
      expandGuard: () =>
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(true), 1000),
        ),
    },
    {
      key: 'locked',
      title: 'Always vetoes',
      expandGuard: () => false,
    },
  ];

  protected readonly formSections = signal<OgeAccordionItemData[]>([
    { key: 'contact', title: 'Contact' },
    { key: 'billing', title: 'Billing', invalid: true },
    { key: 'shipping', title: 'Shipping', invalid: true },
  ]);

  protected readonly teams = signal<readonly string[]>([
    'Platform',
    'Design',
    'Support',
  ]);

  private flakyAttempts = 0;

  protected readonly loadInvoices = () =>
    new Promise<string>((resolve) =>
      setTimeout(() => resolve('42 invoices loaded.'), 900),
    );

  protected readonly loadFlaky = () =>
    new Promise<string>((resolve, reject) =>
      setTimeout(() => {
        this.flakyAttempts++;
        if (this.flakyAttempts === 1) reject(new Error('network'));
        else resolve('Report ready on attempt ' + this.flakyAttempts + '.');
      }, 700),
    );

  protected fixSections(): void {
    this.formSections.update((sections) =>
      sections.map((section) => ({ ...section, invalid: false })),
    );
  }

  protected removeTeam(team: string): void {
    this.teams.update((teams) => teams.filter((t) => t !== team));
  }

  protected resetTeams(): void {
    this.teams.set(['Platform', 'Design', 'Support']);
  }

  protected toggleIconSide(): void {
    this.togglePosition.update((position) =>
      position === 'end' ? 'start' : 'end',
    );
  }
}

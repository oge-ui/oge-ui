import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeToolbar,
  OgeToolbarItem,
  OgeToolbarItemTemplate,
  type OgeToolbarItemActiveChangedEvent,
  type OgeToolbarItemClickEvent,
  type OgeToolbarItemData,
  type OgeToolbarOverflow,
  type OgeToolbarOverflowChangedEvent,
} from '@oge-ui/layout';
import { OgeSelectBox } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_TOOLBAR_SECTIONS,
  ReactLayoutToolbarDemos,
} from '../react-layout/toolbar';
import {
  BASIC_SNIPPET,
  CONFIG_SNIPPET,
  ICON_SNIPPET,
  ITEMS_SNIPPET,
  KEYBOARD_SNIPPET,
  LOCATION_SNIPPET,
  MODES_SNIPPET,
  OVERFLOW_SNIPPET,
  PRIORITY_SNIPPET,
  RUNTIME_SNIPPET,
  SLOTS_SNIPPET,
  TOGGLE_SNIPPET,
} from './toolbar-snippets';

const SECTIONS = [
  'Commands',
  'Data-driven items',
  'Location groups',
  'Overflow menu',
  'Overflow priority',
  'Overflow modes',
  'Toggle commands',
  'Runtime changes',
  'Icon-only commands',
  'Custom content',
  'Keyboard & accessibility',
  'Configuration',
] as const;

const BOLD_PATH = 'M5 3h4a3 3 0 0 1 0 6H5zM5 9h5a3 3 0 0 1 0 6H5z';
const ITALIC_PATH = 'M10 3H6m4 0-3 10m0 0H3m4 0h3';
const UNDERLINE_PATH = 'M4 3v5a4 4 0 0 0 8 0V3M3 14h10';

@Component({
  selector: 'app-layout-toolbar',
  imports: [
    OgeToolbar,
    OgeToolbarItem,
    OgeToolbarItemTemplate,
    OgeSelectBox,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutToolbarDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Toolbar"
      category="Layout"
      categoryLink="/components/toolbar"
      [chips]="['APG toolbar', 'overflow menu', 'signals', 'RTL', 'zoneless']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeToolbar&gt;</code> groups commands into a
          <code>role="toolbar"</code> bar with a roving tabindex, three location
          groups, and an <strong>overflow menu</strong> for the commands that
          stop fitting. Entries come from the data-driven
          <code>items</code> prop; the
          <code>before</code>/<code>center</code>/<code>after</code> node slots
          and the <code>renderItem</code> render prop take over where a command
          is not just a button.
        </p>
        <p>
          Most reference toolbars are purely presentational — no keyboard model
          and no overflow handling at all. The fitting math lives in
          <code>&#64;oge-ui/behavior</code> as a pure function shared with the
          Angular toolbar, so it is unit-tested with numbers rather than pixels.
        </p>
      } @else {
        <p>
          <code>&lt;oge-toolbar&gt;</code> groups commands into a
          <code>role="toolbar"</code> bar with a roving tabindex, three location
          groups, and an <strong>overflow menu</strong> for the commands that
          stop fitting. Entries come from declarative
          <code>&lt;oge-toolbar-item&gt;</code> children, from a data-driven
          <code>items</code> array, or both.
        </p>
        <p>
          Most reference toolbars are purely presentational — no keyboard model
          and no overflow handling at all. The fitting math lives in
          <code>&#64;oge-ui/core</code> as a pure function, so it is unit-tested
          with numbers rather than pixels.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-toolbar-demos />
    } @else {
      <app-demo-card
        [chips]="['oge-toolbar-item', 'severity', 'separator']"
        heading="Commands"
        description='Each <code>&amp;lt;oge-toolbar-item&amp;gt;</code> renders a button by default. <code>severity</code> picks the emphasis, <code>type="separator"</code> draws a rule, and every item has its own <code>itemClick</code>.'
        [code]="basicSnippet"
        language="ts"
      >
        <oge-toolbar ariaLabel="Document actions">
          <oge-toolbar-item text="New" (itemClick)="note('New')" />
          <oge-toolbar-item text="Open" (itemClick)="note('Open')" />
          <oge-toolbar-item type="separator" />
          <oge-toolbar-item
            text="Save"
            severity="accent"
            (itemClick)="note('Save')"
          />
          <oge-toolbar-item
            text="Delete"
            severity="danger"
            location="after"
            (itemClick)="note('Delete')"
          />
        </oge-toolbar>
        <p class="mt-2 text-sm opacity-70">last command → {{ last() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['[items]', 'itemClick', 'label', 'active']"
        heading="Data-driven items"
        description="The same entries as an array. Children render first when both sources are used — the merge rule shared with the tabs and accordion families. <code>active</code> renders a toggle button with <code>aria-pressed</code>."
        [code]="itemsSnippet"
        language="ts"
      >
        <oge-toolbar [items]="tools" (itemClick)="onTool($event)" />
        <p class="mt-2 text-sm opacity-70">last command → {{ last() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['location', 'before', 'center', 'after']"
        heading="Location groups"
        description="<code>before</code> and <code>after</code> take their natural width; <code>center</code> claims the rest and centres inside it. Everything uses logical properties, so the order mirrors in RTL with no flag to set."
        [code]="locationSnippet"
        language="ts"
      >
        <oge-toolbar>
          <oge-toolbar-item text="Back" location="before" />
          <oge-toolbar-item type="label" text="report.xlsx" location="center" />
          <oge-toolbar-item text="Share" location="after" />
        </oge-toolbar>
      </app-demo-card>

      <app-demo-card
        [chips]="['overflow', 'locateInMenu', 'overflowChanged']"
        heading="Overflow menu"
        description="Drag the width down and the trailing commands collapse into the menu. <code>locateInMenu</code> defaults to <code>'auto'</code>; <code>'always'</code> pins an item to the menu whatever the width, <code>'never'</code> keeps it on the bar even if the row overflows."
        [code]="overflowSnippet"
        language="ts"
      >
        <div class="mb-3 flex items-center gap-2 text-sm">
          <label for="tb-width">width</label>
          <input
            id="tb-width"
            type="range"
            min="220"
            max="720"
            step="10"
            [value]="width()"
            (input)="onWidth($event)"
          />
          <span class="opacity-70">{{ width() }}px</span>
        </div>
        <div [style.max-width.px]="width()">
          <oge-toolbar overflow="menu" (overflowChanged)="onOverflow($event)">
            <oge-toolbar-item text="Cut" locateInMenu="never" />
            <oge-toolbar-item text="Copy" />
            <oge-toolbar-item text="Paste" />
            <oge-toolbar-item text="Paste special" />
            <oge-toolbar-item text="Print preview" />
            <oge-toolbar-item text="Document settings" locateInMenu="always" />
          </oge-toolbar>
        </div>
        <p class="mt-2 text-sm opacity-70">
          in the menu → {{ inMenu() }} command(s)
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['overflowPriority']"
        heading="Overflow priority"
        description="Every reference toolbar drops strictly from the end of the row, so keeping a primary command means moving it to the front. <code>overflowPriority</code> separates yield order from visual order — higher survives longer — and equal priorities fall back to end-first, so the default reproduces the reference behaviour exactly."
        [code]="prioritySnippet"
        language="ts"
      >
        <div class="mb-3 flex items-center gap-2 text-sm">
          <label for="tb-priority-width">width</label>
          <input
            id="tb-priority-width"
            type="range"
            min="220"
            max="720"
            step="10"
            [value]="priorityWidth()"
            (input)="onPriorityWidth($event)"
          />
          <span class="opacity-70">{{ priorityWidth() }}px</span>
        </div>
        <div [style.max-width.px]="priorityWidth()">
          <oge-toolbar overflow="menu">
            <oge-toolbar-item text="Open" />
            <oge-toolbar-item text="Print preview" [overflowPriority]="-1" />
            <oge-toolbar-item
              text="Document settings"
              [overflowPriority]="-1"
            />
            <oge-toolbar-item
              text="Save"
              severity="accent"
              [overflowPriority]="10"
            />
          </oge-toolbar>
        </div>
        <p class="mt-2 text-sm opacity-70">
          Narrow it: “Save” sits last on the bar and is still the last to leave.
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['menu', 'scroll', 'wrap', 'extended', 'none']"
        heading="Overflow modes"
        description="Five modes, one input — the union of every mode the reference libraries offer. <code>scroll</code> keeps a single line and adds arrows, <code>extended</code> hides the remainder in a second row behind a toggle that names it through <code>aria-controls</code>."
        [code]="modesSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          @for (option of overflowModes; track option) {
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              [class.font-semibold]="mode() === option"
              (click)="mode.set(option)"
            >
              {{ option }}
            </button>
          }
        </div>
        <div class="max-w-sm">
          <oge-toolbar [overflow]="mode()">
            <oge-toolbar-item text="Cut" />
            <oge-toolbar-item text="Copy" />
            <oge-toolbar-item text="Paste" />
            <oge-toolbar-item text="Paste special" />
            <oge-toolbar-item text="Print preview" />
          </oge-toolbar>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['[(active)]', 'aria-pressed', 'activeChanged']"
        heading="Toggle commands"
        description="A defined <code>active</code> is what makes an item a toggle. Declarative children own a two-way model and flip themselves; <code>items</code> entries are data the toolbar must not mutate, so it reports through <code>activeChanged</code> and the app applies it."
        [code]="toggleSnippet"
        language="ts"
      >
        <oge-toolbar (activeChanged)="onToggle($event)">
          <oge-toolbar-item text="Bold" [(active)]="bold" />
          <oge-toolbar-item text="Italic" [(active)]="italic" />
        </oge-toolbar>
        <p class="mt-2 text-sm opacity-70">
          bold {{ bold() }} · italic {{ italic() }} · last {{ lastToggle() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['addItem', 'hideItem', 'enableItem', 'refreshOverflow']"
        heading="Runtime changes"
        description="<code>items</code> stays the declared source of truth and the imperative calls are an override layer on top of it — so a re-supplied array cannot silently undo a <code>hideItem()</code>. <code>dataSource</code> loads the same shape from a server."
        [code]="runtimeSnippet"
        language="ts"
      >
        <oge-toolbar #runtimeBar [items]="runtimeTools" />
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="runtimeBar.addItem({ key: 'new', text: 'Added' })"
          >
            addItem
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="runtimeBar.hideItem('copy')"
          >
            hideItem('copy')
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="runtimeBar.enableItem('paste', false)"
          >
            disable('paste')
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="runtimeBar.clearItemOverrides()"
          >
            reset
          </button>
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="runtimeBar.refreshOverflow()"
          >
            refreshOverflow()
          </button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['showText', 'icon', 'aria-label']"
        heading="Icon-only commands"
        description='<code>showText="inMenu"</code> renders the bar entry icon-only and keeps the label for the overflow menu. The button never loses its accessible name — the text becomes its <code>aria-label</code>.'
        [code]="iconSnippet"
        language="ts"
      >
        <oge-toolbar showText="inMenu">
          <oge-toolbar-item text="Bold" [icon]="boldPath" />
          <oge-toolbar-item text="Italic" [icon]="italicPath" />
          <oge-toolbar-item
            text="Underline"
            [icon]="underlinePath"
            showText="always"
          />
        </oge-toolbar>
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeToolbarAfter', 'ogeToolbarItemTemplate']"
        heading="Custom content"
        description="Two escape hatches instead of a string-keyed <code>widget</code> + <code>options</code> bag. A projection slot puts any control straight on the bar — where it stays, because the toolbar cannot re-stamp DOM it does not own. An <code>ogeToolbarItemTemplate</code> inside an item <em>is</em> re-stampable, so that entry can still collapse into the menu."
        [code]="slotsSnippet"
        language="ts"
      >
        <oge-toolbar>
          <oge-toolbar-item text="View">
            <ng-template ogeToolbarItemTemplate>
              <oge-select-box
                [items]="views"
                [value]="view()"
                size="sm"
                label="View"
              />
            </ng-template>
          </oge-toolbar-item>
          <input
            ogeToolbarAfter
            class="rounded border px-2 py-1 text-sm"
            type="search"
            placeholder="Search…"
            aria-label="Search"
          />
        </oge-toolbar>
      </app-demo-card>

      <app-demo-card
        [chips]="['roving tabindex', 'orientation', 'wrap']"
        heading="Keyboard &amp; accessibility"
        description="One Tab stop for the whole toolbar, arrow keys between the controls, Home/End to the ends, disabled controls skipped. A vertical toolbar uses Up/Down and reports <code>aria-orientation</code>. A text input inside keeps its own arrow and Home/End keys — the APG warns against stealing them."
        [code]="keyboardSnippet"
        language="ts"
      >
        <oge-toolbar orientation="vertical" ariaLabel="Tools" [wrap]="false">
          <oge-toolbar-item text="Select" />
          <oge-toolbar-item text="Move" [disabled]="true" />
          <oge-toolbar-item text="Zoom" />
        </oge-toolbar>
      </app-demo-card>

      <app-demo-card
        [chips]="['provideOgeToolbarConfig']"
        heading="Configuration"
        description="Every user-facing string — including the overflow button's accessible name — lives in the messages interface, overridable application-wide or per instance with <code>[messages]</code>."
        [code]="configSnippet"
        language="ts"
      >
        <oge-toolbar
          size="sm"
          stylingMode="flat"
          [messages]="{ toolbar: 'Araç çubuğu', overflowMenu: 'Daha fazla' }"
          [items]="localized"
        />
      </app-demo-card>
    }
  `,
})
export class LayoutToolbarPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_TOOLBAR_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly itemsSnippet = ITEMS_SNIPPET;
  protected readonly locationSnippet = LOCATION_SNIPPET;
  protected readonly overflowSnippet = OVERFLOW_SNIPPET;
  protected readonly prioritySnippet = PRIORITY_SNIPPET;
  protected readonly iconSnippet = ICON_SNIPPET;
  protected readonly slotsSnippet = SLOTS_SNIPPET;
  protected readonly modesSnippet = MODES_SNIPPET;
  protected readonly toggleSnippet = TOGGLE_SNIPPET;
  protected readonly runtimeSnippet = RUNTIME_SNIPPET;
  protected readonly keyboardSnippet = KEYBOARD_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly boldPath = BOLD_PATH;
  protected readonly italicPath = ITALIC_PATH;
  protected readonly underlinePath = UNDERLINE_PATH;

  protected readonly last = signal('—');
  protected readonly width = signal(520);
  protected readonly priorityWidth = signal(520);
  protected readonly inMenu = signal(0);
  protected readonly views = ['All', 'Mine', 'Archived'];
  protected readonly overflowModes: readonly OgeToolbarOverflow[] = [
    'menu',
    'scroll',
    'wrap',
    'extended',
    'none',
  ];
  protected readonly mode = signal<OgeToolbarOverflow>('extended');
  protected readonly bold = signal(true);
  protected readonly italic = signal(false);
  protected readonly lastToggle = signal('—');
  protected readonly runtimeTools: readonly OgeToolbarItemData[] = [
    { key: 'cut', text: 'Cut' },
    { key: 'copy', text: 'Copy' },
    { key: 'paste', text: 'Paste' },
  ];
  protected readonly view = signal('All');

  protected readonly tools: readonly OgeToolbarItemData[] = [
    { key: 'undo', text: 'Undo' },
    { key: 'redo', text: 'Redo' },
    { key: 'sep', type: 'separator' },
    { key: 'bold', text: 'Bold', active: true },
    { key: 'note', type: 'label', text: 'Draft' },
    { key: 'publish', text: 'Publish', location: 'after', severity: 'accent' },
  ];

  protected readonly localized: readonly OgeToolbarItemData[] = [
    { key: 'yeni', text: 'Yeni' },
    { key: 'kaydet', text: 'Kaydet', severity: 'accent' },
    { key: 'ayarlar', text: 'Ayarlar', locateInMenu: 'always' },
  ];

  protected note(command: string): void {
    this.last.set(command);
  }

  protected onTool(event: OgeToolbarItemClickEvent): void {
    this.last.set(`${event.key} (${event.inMenu ? 'menu' : 'bar'})`);
  }

  protected onOverflow(event: OgeToolbarOverflowChangedEvent): void {
    this.inMenu.set(event.count);
  }

  protected onToggle(event: OgeToolbarItemActiveChangedEvent): void {
    this.lastToggle.set(`${event.key} → ${event.active}`);
  }

  protected onWidth(event: Event): void {
    this.width.set(Number((event.target as HTMLInputElement).value));
  }

  protected onPriorityWidth(event: Event): void {
    this.priorityWidth.set(Number((event.target as HTMLInputElement).value));
  }
}

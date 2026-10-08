import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import {
  OgeContextMenu,
  OgeTooltip,
  type OgeContextMenuOpeningEvent,
  type OgeMenuItem,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_OVERLAY_TOOLTIP_CONTEXT_MENU_SECTIONS,
  ReactOverlayTooltipContextMenuDemos,
} from '../react-overlay/tooltip-context-menu';
import {
  CONTEXT_DELEGATION_SNIPPET,
  CONTEXT_EVENTS_SNIPPET,
  CONTEXT_SNIPPET,
  TOOLTIP_OPTIONS_SNIPPET,
  TOOLTIP_SNIPPET,
  TOOLTIP_TEMPLATES_SNIPPET,
} from './tooltip-context-menu-snippets';

const SECTIONS = [
  'Tooltip basics',
  'Tooltip placement & delays',
  'Tooltip templates',
  'Context menu',
  'Context menu events',
  'Context menu delegation',
] as const;

/** A file row of the delegation demo. */
interface DemoFile {
  readonly name: string;
  readonly locked: boolean;
}

@Component({
  selector: 'app-overlay-tooltip-context-menu',
  imports: [
    OgeButton,
    OgeTooltip,
    OgeContextMenu,
    DemoCard,
    DocHeader,
    PageToc,
    ReactOverlayTooltipContextMenuDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tooltip & Context Menu"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="
        fw.isReact()
          ? ['OgeTooltip', 'placement', 'OgeContextMenu', 'onItemClick']
          : [
              'ogeTooltip',
              'tooltipPlacement',
              '[ogeContextMenu]',
              'contextMenuItemClick',
            ]
      "
    >
      @if (fw.isReact()) {
        <p>
          Two wrapper components turn the overlay engine into everyday UI:
          <code>&lt;OgeTooltip&gt;</code> attaches an accessible, viewport-aware
          tooltip to its child element, and
          <code>&lt;OgeContextMenu&gt;</code> opens a fully keyboard-navigable
          menu at the pointer on right-click. Both render into the document
          body, so overflow or transformed ancestors never clip them — and both
          run the same timing and menu machines as the Angular directives.
        </p>
      } @else {
        <p>
          Two directives turn the overlay engine into everyday UI:
          <code>ogeTooltip</code> attaches an accessible, viewport-aware tooltip
          to any element, and <code>[ogeContextMenu]</code> opens a fully
          keyboard-navigable menu at the pointer on right-click. Both render
          into the document body, so overflow or transformed ancestors never
          clip them.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-overlay-tooltip-context-menu-demos />
    } @else {
      <app-demo-card
        [chips]="['ogeTooltip', 'aria-describedby', 'Escape']"
        heading="Tooltip basics"
        description="Bind a string to <code>ogeTooltip</code> on any element. The bubble shows after a short hover dwell — or instantly on keyboard focus — and hides on leave, blur or <code>Escape</code>. While visible the trigger's <code>aria-describedby</code> points at the bubble, so screen readers announce it; an empty string disables the tooltip entirely."
        [code]="tooltipSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button text="Save" ogeTooltip="Saves your changes" />
          <oge-button
            text="Delete"
            severity="danger"
            stylingMode="outlined"
            ogeTooltip="Removes the record permanently"
          />
          <button
            type="button"
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
            ogeTooltip="Plain elements work too"
          >
            Plain button
          </button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['tooltipPlacement', 'tooltipShowDelay', 'tooltipDisabled']"
        heading="Tooltip placement & delays"
        description="<code>tooltipPlacement</code> prefers a side (<code>top</code>, <code>bottom</code>, <code>left</code>, <code>right</code> — centered on the anchor) and flips automatically when the viewport runs out of room. Delays fall back to the global overlay config (<code>provideOgeOverlayConfig</code>) and can be tuned per trigger; <code>tooltipDisabled</code> suppresses the tooltip without removing the directive."
        [code]="tooltipOptionsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button
            text="Top (default)"
            stylingMode="outlined"
            ogeTooltip="Centered above the trigger"
          />
          <oge-button
            text="Bottom"
            stylingMode="outlined"
            ogeTooltip="Prefers the bottom edge"
            tooltipPlacement="bottom"
          />
          <oge-button
            text="Right"
            stylingMode="outlined"
            ogeTooltip="To the right, flips near the edge"
            tooltipPlacement="right"
          />
          <oge-button
            text="Slow (800ms)"
            stylingMode="outlined"
            ogeTooltip="Waits 800ms before showing"
            [tooltipShowDelay]="800"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'TemplateRef',
          'tooltipContext',
          'tooltipArrow',
          'tooltipShowMode',
          'tooltipMaxWidth',
        ]"
        heading="Tooltip templates"
        description='<code>ogeTooltip</code> also takes a template, with <code>tooltipContext</code> as its <code>$implicit</code> — formatting, icons, a second line — and stays a non-interactive tooltip (never put focusable controls in it; reach for a popover then). <code>tooltipArrow</code> draws a callout pointer, <code>tooltipMaxWidth</code> widens or narrows the bubble, and <code>tooltipShowMode</code> switches from hover-and-focus to <code>focus</code>, <code>click</code> (toggles) or <code>manual</code> — driven through <code>#tip="ogeTooltip"</code> → <code>open()</code> / <code>close()</code> / <code>toggle()</code>.'
        [code]="tooltipTemplatesSnippet"
        language="ts"
      >
        <div
          class="flex flex-wrap items-center gap-3"
          data-testid="tooltip-templates"
        >
          <oge-button
            text="Ada Lovelace"
            stylingMode="outlined"
            [ogeTooltip]="person"
            [tooltipContext]="ada"
            [tooltipArrow]="true"
            tooltipPlacement="bottom"
            [tooltipMaxWidth]="240"
          />
          <ng-template #person let-p>
            <strong>{{ p.name }}</strong> · {{ p.role }}<br />Last seen
            {{ p.seen }}
          </ng-template>
          <oge-button
            text="Click me"
            stylingMode="outlined"
            ogeTooltip="Toggled by clicking"
            tooltipShowMode="click"
            [tooltipArrow]="true"
          />
          <oge-button
            text="Copy"
            ogeTooltip="Copied!"
            tooltipShowMode="manual"
            #copied="ogeTooltip"
            (clicked)="copied.open()"
            (focusout)="copied.close()"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['[ogeContextMenu]', 'Shift+F10', 'OgeMenuItem']"
        heading="Context menu"
        description="Bind an <code>OgeMenuItem</code> array to <code>[ogeContextMenu]</code> and right-click opens it at the pointer, replacing the browser menu. <kbd>Shift+F10</kbd> (or the menu key) opens it anchored to the element for keyboard users. The menu takes focus with full arrow-key, Home/End and type-ahead support; Escape and outside clicks close it and focus returns to the target."
        [code]="contextSnippet"
        language="ts"
      >
        <div
          class="flex h-28 w-full max-w-md select-none items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 outline-none focus-visible:border-indigo-400 dark:border-gray-700 dark:text-gray-400"
          tabindex="0"
          data-testid="context-target"
          [ogeContextMenu]="rowMenu"
          contextMenuAriaLabel="Row actions"
          (contextMenuItemClick)="lastAction.set($event.item.text)"
        >
          Right-click here (or focus + Shift+F10)
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'contextMenuItemClick',
          'opened / closed',
          'checked & danger',
        ]"
        heading="Context menu events"
        description="<code>contextMenuItemClick</code> delivers the activated item with its index and the originating DOM event — the same payload as <code>OgeMenuList</code>. <code>contextMenuOpened</code> and <code>contextMenuClosed</code> track visibility, and items support the full menu model: checkable entries, separators, disabled state, hints and destructive severity."
        [code]="contextEventsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-4">
          <div
            class="flex h-24 w-64 select-none items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 outline-none dark:border-gray-700 dark:text-gray-400"
            tabindex="0"
            [ogeContextMenu]="fileMenu"
            contextMenuAriaLabel="File actions"
            (contextMenuItemClick)="onFileAction($event)"
          >
            File: quarterly-report.xlsx
          </div>
          <span class="text-sm opacity-70"
            >last action: {{ lastAction() }}</span
          >
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'contextMenuTarget',
          'contextMenuOpening',
          'open(x, y)',
          'exportAs',
        ]"
        heading="Context menu delegation"
        description='One menu serves many rows: <code>contextMenuTarget</code> is a CSS selector matched with <code>closest()</code> inside the host, so a right-click (or <kbd>Shift+F10</kbd> on a focused row) targets that row — anchor, focus return and all — and anywhere else keeps the browser menu. The cancelable <code>contextMenuOpening</code> event carries <code>{ target, items, cancel, event }</code>: assign <code>items</code> to build the menu per row. <code>#menu="ogeContextMenu"</code> exposes <code>open(x, y)</code>, <code>open(event)</code> and <code>close()</code>.'
        [code]="contextDelegationSnippet"
        language="ts"
      >
        <div
          class="flex flex-wrap items-start gap-4"
          data-testid="context-delegation"
        >
          <ul
            class="m-0 w-64 list-none divide-y divide-gray-200 rounded-lg border border-gray-200 p-0 text-sm dark:divide-gray-800 dark:border-gray-800"
            [ogeContextMenu]="[]"
            contextMenuTarget="li"
            contextMenuAriaLabel="File actions"
            (contextMenuOpening)="buildFileMenu($event)"
            (contextMenuItemClick)="delegatedAction.set($event.item.text)"
            #filesMenu="ogeContextMenu"
          >
            @for (file of files; track file.name) {
              <li
                class="px-3 py-2 outline-none focus-visible:bg-indigo-50 dark:focus-visible:bg-indigo-950"
                tabindex="0"
                [attr.data-name]="file.name"
              >
                {{ file.name }}{{ file.locked ? ' (locked)' : '' }}
              </li>
            }
          </ul>
          <div class="flex flex-col items-start gap-2">
            <oge-button
              text="Open menu at the first row"
              stylingMode="outlined"
              (clicked)="openFirstRow(filesMenu)"
            />
            <span class="text-sm opacity-70" data-testid="delegation-last"
              >last action: {{ delegatedAction() }}</span
            >
          </div>
        </div>
      </app-demo-card>
    }

    <h3>Notes</h3>
    <ul>
      <li>
        Tooltips are <em>transient</em>: they never join the Escape stack, so an
        open tooltip cannot swallow the Escape meant for a drop-down or dialog
        underneath.
      </li>
      <li>
        The tooltip bubble is hoverable (WCAG 1.4.13): the pointer can move from
        the trigger onto it and it stays open; <kbd>Escape</kbd> pressed
        anywhere dismisses it. It stays non-interactive — nothing in it takes
        focus; interactive content belongs in a popover.
      </li>
      @if (fw.isReact()) {
        <li>
          Give context-menu targets <code>tabIndex={{ '{' }}0{{ '}' }}</code>
          (when they are not natively focusable) so keyboard users can reach
          <kbd>Shift+F10</kbd> and focus can be restored after closing.
        </li>
        <li>
          Both components read <code>&lt;OgeOverlayConfigProvider&gt;</code>
          for offsets, viewport padding and tooltip delays.
        </li>
      } @else {
        <li>
          Give context-menu targets <code>tabindex="0"</code> (when they are not
          natively focusable) so keyboard users can reach
          <kbd>Shift+F10</kbd> and focus can be restored after closing.
        </li>
        <li>
          Both directives read <code>provideOgeOverlayConfig()</code> for
          offsets, viewport padding and tooltip delays.
        </li>
      }
    </ul>
  `,
})
export class OverlayTooltipContextMenuPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections =
    REACT_OVERLAY_TOOLTIP_CONTEXT_MENU_SECTIONS;
  protected readonly lastAction = signal('—');

  protected readonly rowMenu: OgeMenuItem[] = [
    { text: 'Open', value: 'open' },
    { text: 'Duplicate', value: 'duplicate' },
    { separator: true, text: '' },
    { text: 'Delete', value: 'delete', severity: 'danger' },
  ];

  protected readonly fileMenu: OgeMenuItem[] = [
    { text: 'Download', value: 'download' },
    { text: 'Rename', value: 'rename' },
    { text: 'Shared with team', checked: true },
    { separator: true, text: '' },
    {
      text: 'Delete',
      value: 'delete',
      severity: 'danger',
      hint: 'Cannot be undone',
    },
  ];

  protected onFileAction(event: OgeMenuListItemClickEvent): void {
    this.lastAction.set(event.item.text);
  }

  protected readonly delegatedAction = signal('—');

  protected readonly ada = {
    name: 'Ada Lovelace',
    role: 'Engineer',
    seen: '5 min ago',
  };

  protected readonly files: readonly DemoFile[] = [
    { name: 'report.xlsx', locked: false },
    { name: 'budget.xlsx', locked: true },
    { name: 'notes.md', locked: false },
  ];

  /** Builds the delegated menu for the row that was right-clicked. */
  protected buildFileMenu(event: OgeContextMenuOpeningEvent): void {
    const name = event.target.getAttribute('data-name');
    const file = this.files.find((f) => f.name === name);
    if (!file) {
      event.cancel = true;
      return;
    }
    event.items = [
      { text: `Open ${file.name}`, value: 'open' },
      { text: 'Rename', value: 'rename', disabled: file.locked },
      { separator: true, text: '' },
      {
        text: 'Delete',
        value: 'delete',
        severity: 'danger',
        disabled: file.locked,
        hint: file.locked ? 'The file is locked' : undefined,
      },
    ];
  }

  /** Imperative open at the first row, through the same pipeline. */
  protected openFirstRow(menu: OgeContextMenu): void {
    const row = document.querySelector<HTMLElement>(
      '[data-testid="context-delegation"] li',
    );
    if (!row) return;
    const rect = row.getBoundingClientRect();
    menu.open(rect.left + 8, rect.top + rect.height / 2);
  }

  protected readonly tooltipSnippet = TOOLTIP_SNIPPET;
  protected readonly tooltipOptionsSnippet = TOOLTIP_OPTIONS_SNIPPET;
  protected readonly contextSnippet = CONTEXT_SNIPPET;
  protected readonly contextEventsSnippet = CONTEXT_EVENTS_SNIPPET;
  protected readonly tooltipTemplatesSnippet = TOOLTIP_TEMPLATES_SNIPPET;
  protected readonly contextDelegationSnippet = CONTEXT_DELEGATION_SNIPPET;
}

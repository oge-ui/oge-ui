import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import {
  OgeContextMenu,
  OgeTooltip,
  type OgeMenuItem,
  type OgeMenuListItemClickEvent,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  CONTEXT_EVENTS_SNIPPET,
  CONTEXT_SNIPPET,
  TOOLTIP_OPTIONS_SNIPPET,
  TOOLTIP_SNIPPET,
} from './tooltip-context-menu-snippets';

const SECTIONS = [
  'Tooltip basics',
  'Tooltip placement & delays',
  'Context menu',
  'Context menu events',
] as const;

@Component({
  selector: 'app-overlay-tooltip-context-menu',
  imports: [
    OgeButton,
    OgeTooltip,
    OgeContextMenu,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tooltip & Context Menu"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="[
        'ogeTooltip',
        'tooltipPlacement',
        '[ogeContextMenu]',
        'contextMenuItemClick',
      ]"
    >
      <p>
        Two directives turn the overlay engine into everyday UI:
        <code>ogeTooltip</code> attaches an accessible, viewport-aware tooltip
        to any element, and <code>[ogeContextMenu]</code> opens a fully
        keyboard-navigable menu at the pointer on right-click. Both render into
        the document body, so overflow or transformed ancestors never clip them.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

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
      [chips]="['contextMenuItemClick', 'opened / closed', 'checked & danger']"
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
        <span class="text-sm opacity-70">last action: {{ lastAction() }}</span>
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Tooltips are <em>transient</em>: they never join the Escape stack, so an
        open tooltip cannot swallow the Escape meant for a drop-down or dialog
        underneath.
      </li>
      <li>
        The tooltip bubble is <code>pointer-events: none</code> — it never
        blocks clicks on content beneath it.
      </li>
      <li>
        Give context-menu targets <code>tabindex="0"</code> (when they are not
        natively focusable) so keyboard users can reach <kbd>Shift+F10</kbd> and
        focus can be restored after closing.
      </li>
      <li>
        Both directives read <code>provideOgeOverlayConfig()</code> for offsets,
        viewport padding and tooltip delays.
      </li>
    </ul>
  `,
})
export class OverlayTooltipContextMenuPage {
  protected readonly sections = SECTIONS;
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

  protected readonly tooltipSnippet = TOOLTIP_SNIPPET;
  protected readonly tooltipOptionsSnippet = TOOLTIP_OPTIONS_SNIPPET;
  protected readonly contextSnippet = CONTEXT_SNIPPET;
  protected readonly contextEventsSnippet = CONTEXT_EVENTS_SNIPPET;
}

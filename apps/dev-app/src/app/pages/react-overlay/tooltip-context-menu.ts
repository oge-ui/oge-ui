import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import {
  OgeContextMenu,
  OgeTooltip,
  type OgeContextMenuHandle,
  type OgeContextMenuOpeningEvent,
  type OgeMenuItem,
  type OgeMenuListItemClickEvent,
  type OgeTooltipHandle,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { OVERLAY_TOOLTIP_CONTEXT_MENU_DEMOS } from './tooltip-context-menu-snippets';

/**
 * TOC of the React view — the same six sections as the Angular page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_OVERLAY_TOOLTIP_CONTEXT_MENU_SECTIONS = [
  'Tooltip basics',
  'Tooltip placement & delays',
  'Tooltip templates',
  'Context menu',
  'Context menu events',
  'Context menu delegation',
] as const;

const tooltip = (text: string, child: ReactNode, extra?: object) =>
  createElement(OgeTooltip, { text, ...extra }, child);

function TooltipDemo(): ReactNode {
  return createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-3' },
    tooltip('Saves your changes', createElement(OgeButton, { text: 'Save' }), {
      key: 'save',
    }),
    tooltip(
      'Removes the record permanently',
      createElement(OgeButton, {
        text: 'Delete',
        severity: 'danger',
        stylingMode: 'outlined',
      }),
      { key: 'delete' },
    ),
    tooltip(
      'Plain elements work too',
      createElement(
        'button',
        {
          type: 'button',
          className:
            'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700',
        },
        'Plain button',
      ),
      { key: 'plain' },
    ),
  );
}

function TooltipOptionsDemo(): ReactNode {
  const outlined = (text: string) =>
    createElement(OgeButton, { text, stylingMode: 'outlined' });
  return createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-3' },
    tooltip('Centered above the trigger', outlined('Top (default)'), {
      key: 'top',
    }),
    tooltip('Prefers the bottom edge', outlined('Bottom'), {
      key: 'bottom',
      placement: 'bottom',
    }),
    tooltip('To the right, flips near the edge', outlined('Right'), {
      key: 'right',
      placement: 'right',
    }),
    tooltip('Waits 800ms before showing', outlined('Slow (800ms)'), {
      key: 'slow',
      showDelay: 800,
    }),
  );
}

function TooltipTemplatesDemo(): ReactNode {
  const copied = useRef<OgeTooltipHandle>(null);
  return createElement(
    'div',
    {
      className: 'flex flex-wrap items-center gap-3',
      'data-testid': 'tooltip-templates',
    },
    createElement(
      OgeTooltip,
      {
        key: 'person',
        content: () =>
          createElement(
            'span',
            null,
            createElement('strong', null, 'Ada Lovelace'),
            ' · Engineer',
            createElement('br'),
            'Last seen 5 min ago',
          ),
        arrow: true,
        placement: 'bottom',
        maxWidth: 240,
      },
      createElement(OgeButton, {
        text: 'Ada Lovelace',
        stylingMode: 'outlined',
      }),
    ),
    createElement(
      OgeTooltip,
      {
        key: 'click',
        text: 'Toggled by clicking',
        showMode: 'click',
        arrow: true,
      },
      createElement(OgeButton, { text: 'Click me', stylingMode: 'outlined' }),
    ),
    createElement(
      OgeTooltip,
      { key: 'manual', text: 'Copied!', showMode: 'manual', ref: copied },
      createElement(
        'span',
        {
          className: 'inline-flex',
          onBlur: () => copied.current?.close(),
        },
        createElement(OgeButton, {
          text: 'Copy',
          onClick: () => copied.current?.open(),
        }),
      ),
    ),
  );
}

const ROW_MENU: OgeMenuItem[] = [
  { text: 'Open', value: 'open' },
  { text: 'Duplicate', value: 'duplicate' },
  { separator: true, text: '' },
  { text: 'Delete', value: 'delete', severity: 'danger' },
];

const FILE_MENU: OgeMenuItem[] = [
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

const TARGET_CLASS =
  'flex h-28 w-full max-w-md select-none items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 outline-none focus-visible:border-indigo-400 dark:border-gray-700 dark:text-gray-400';

function ContextMenuDemo(): ReactNode {
  return createElement(
    OgeContextMenu,
    { items: ROW_MENU, ariaLabel: 'Row actions' },
    createElement(
      'div',
      { className: TARGET_CLASS, tabIndex: 0, 'data-testid': 'context-target' },
      'Right-click here (or focus + Shift+F10)',
    ),
  );
}

function ContextMenuEventsDemo(): ReactNode {
  const [lastAction, setLastAction] = useState('—');
  return createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-4' },
    createElement(
      OgeContextMenu,
      {
        items: FILE_MENU,
        ariaLabel: 'File actions',
        onItemClick: (event: OgeMenuListItemClickEvent) =>
          setLastAction(event.item.text),
      },
      createElement(
        'div',
        {
          className:
            'flex h-24 w-64 select-none items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 outline-none dark:border-gray-700 dark:text-gray-400',
          tabIndex: 0,
        },
        'File: quarterly-report.xlsx',
      ),
    ),
    createElement(
      'span',
      { className: 'text-sm opacity-70' },
      `last action: ${lastAction}`,
    ),
  );
}

interface DemoFile {
  readonly name: string;
  readonly locked: boolean;
}

const FILES: readonly DemoFile[] = [
  { name: 'report.xlsx', locked: false },
  { name: 'budget.xlsx', locked: true },
  { name: 'notes.md', locked: false },
];

/** Builds the delegated menu for the row that was right-clicked. */
function buildFileMenu(event: OgeContextMenuOpeningEvent): void {
  const name = event.target.getAttribute('data-name');
  const file = FILES.find((f) => f.name === name);
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

function ContextMenuDelegationDemo(): ReactNode {
  const menu = useRef<OgeContextMenuHandle>(null);
  const [lastAction, setLastAction] = useState('—');
  const openFirstRow = () => {
    const row = document.querySelector<HTMLElement>(
      '[data-testid="context-delegation"] li',
    );
    if (!row) return;
    const rect = row.getBoundingClientRect();
    menu.current?.open(rect.left + 8, rect.top + rect.height / 2);
  };
  return createElement(
    'div',
    {
      className: 'flex flex-wrap items-start gap-4',
      'data-testid': 'context-delegation',
    },
    createElement(
      OgeContextMenu,
      {
        key: 'menu',
        ref: menu,
        items: [],
        target: 'li',
        ariaLabel: 'File actions',
        onOpening: buildFileMenu,
        onItemClick: (event: OgeMenuListItemClickEvent) =>
          setLastAction(event.item.text),
      },
      createElement(
        'ul',
        {
          className:
            'm-0 w-64 list-none divide-y divide-gray-200 rounded-lg border border-gray-200 p-0 text-sm dark:divide-gray-800 dark:border-gray-800',
        },
        FILES.map((file) =>
          createElement(
            'li',
            {
              key: file.name,
              className:
                'px-3 py-2 outline-none focus-visible:bg-indigo-50 dark:focus-visible:bg-indigo-950',
              tabIndex: 0,
              'data-name': file.name,
            },
            `${file.name}${file.locked ? ' (locked)' : ''}`,
          ),
        ),
      ),
    ),
    createElement(
      'div',
      { key: 'side', className: 'flex flex-col items-start gap-2' },
      createElement(OgeButton, {
        text: 'Open menu at the first row',
        stylingMode: 'outlined',
        onClick: openFirstRow,
      }),
      createElement(
        'span',
        { className: 'text-sm opacity-70', 'data-testid': 'delegation-last' },
        `last action: ${lastAction}`,
      ),
    ),
  );
}

/**
 * The React half of the tooltip & context menu page — the same six demo
 * sections as the Angular page, with the same example content, rendered as
 * real React trees inside `/components/overlay/tooltip-context-menu` when
 * the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-tooltip-context-menu-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/buttons/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['OgeTooltip', 'aria-describedby', 'Escape']"
      heading="Tooltip basics"
      description="Wrap any element in <code>&amp;lt;OgeTooltip text&amp;gt;</code>. The bubble shows after a short hover dwell — or instantly on keyboard focus — and hides on leave, blur or <code>Escape</code>. While visible the trigger's <code>aria-describedby</code> points at the bubble, so screen readers announce it; an empty string disables the tooltip entirely."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="tooltip" />
    </app-demo-card>

    <app-demo-card
      [chips]="['placement', 'showDelay', 'disabled']"
      heading="Tooltip placement & delays"
      description="<code>placement</code> prefers a side (<code>top</code>, <code>bottom</code>, <code>left</code>, <code>right</code> — centered on the anchor) and flips automatically when the viewport runs out of room. Delays fall back to the overlay config (<code>&amp;lt;OgeOverlayConfigProvider&amp;gt;</code>) and can be tuned per trigger; <code>disabled</code> suppresses the tooltip without removing the wrapper."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="tooltipOptions" />
    </app-demo-card>

    <app-demo-card
      [chips]="['content', 'arrow', 'showMode', 'maxWidth', 'ref handle']"
      heading="Tooltip templates"
      description="<code>content</code> takes a node or a render function — formatting, icons, a second line — and the tooltip stays non-interactive (never put focusable controls in it; reach for a popover then). <code>arrow</code> draws a callout pointer, <code>maxWidth</code> widens or narrows the bubble, and <code>showMode</code> switches from hover-and-focus to <code>focus</code>, <code>click</code> (toggles) or <code>manual</code> — driven through the ref handle's <code>open()</code> / <code>close()</code> / <code>toggle()</code>."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="tooltipTemplates" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeContextMenu', 'Shift+F10', 'OgeMenuItem']"
      heading="Context menu"
      description="Wrap the target in <code>&amp;lt;OgeContextMenu items&amp;gt;</code> and right-click opens the menu at the pointer, replacing the browser menu. <kbd>Shift+F10</kbd> (or the menu key) opens it anchored to the element for keyboard users. The menu takes focus with full arrow-key, Home/End and type-ahead support; Escape and outside clicks close it and focus returns to the target."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="contextMenu" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onItemClick', 'onOpened / onClosed', 'checked & danger']"
      heading="Context menu events"
      description="<code>onItemClick</code> delivers the activated item with its index and the originating DOM event — the same payload as <code>&amp;lt;OgeMenuList&amp;gt;</code>. <code>onOpened</code> and <code>onClosed</code> track visibility, and items support the full menu model: checkable entries, separators, disabled state, hints and destructive severity."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="contextMenuEvents" />
    </app-demo-card>

    <app-demo-card
      [chips]="['target', 'onOpening', 'open(x, y)', 'ref handle']"
      heading="Context menu delegation"
      description="One menu serves many rows: <code>target</code> is a CSS selector matched with <code>closest()</code> inside the child, so a right-click (or <kbd>Shift+F10</kbd> on a focused row) targets that row — anchor, focus return and all — and anywhere else keeps the browser menu. The cancelable <code>onOpening</code> receives <code>{ target, items, cancel, event }</code>: assign <code>items</code> to build the menu per row. The ref handle exposes <code>open(x, y)</code>, <code>open(event)</code> and <code>close()</code>."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="contextMenuDelegation" />
    </app-demo-card>
  `,
})
export class ReactOverlayTooltipContextMenuDemos {
  protected readonly demos = OVERLAY_TOOLTIP_CONTEXT_MENU_DEMOS;
  protected readonly tooltip = () => createElement(TooltipDemo);
  protected readonly tooltipOptions = () => createElement(TooltipOptionsDemo);
  protected readonly contextMenu = () => createElement(ContextMenuDemo);
  protected readonly contextMenuEvents = () =>
    createElement(ContextMenuEventsDemo);
  protected readonly tooltipTemplates = () =>
    createElement(TooltipTemplatesDemo);
  protected readonly contextMenuDelegation = () =>
    createElement(ContextMenuDelegationDemo);
}

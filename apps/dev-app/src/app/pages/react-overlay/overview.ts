import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { OgeButton, OgeButtonGroup } from '@oge-ui/react-buttons';
import {
  OgeMenuList,
  OgePopup,
  useAnchoredPanel,
  type OgeMenuItem,
  type OgePopupPlacement,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { OVERLAY_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same two sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_OVERLAY_OVERVIEW_SECTIONS = [
  'Anchored panel',
  'Menu list',
] as const;

const PLACEMENTS: readonly OgePopupPlacement[] = [
  'bottom-start',
  'bottom-end',
  'top-start',
  'right-start',
];

function AnchoredPanelDemo(): ReactNode {
  const [placementKeys, setPlacementKeys] = useState<readonly string[]>([
    'bottom-start',
  ]);
  const placement = (placementKeys[0] ?? 'bottom-start') as OgePopupPlacement;
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const panel = useAnchoredPanel({
    anchor: () => anchorRef.current,
    panel: () => popupRef.current,
    placement: () => placement,
  });
  // Reposition in place when the placement selection changes while open.
  const [lastPlacement, setLastPlacement] = useState(placement);
  if (lastPlacement !== placement) {
    setLastPlacement(placement);
    if (panel.isOpen) panel.updatePosition();
  }
  return createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-4' },
    createElement(
      'span',
      { ref: anchorRef, className: 'inline-flex' },
      createElement(OgeButton, {
        text: 'Toggle panel',
        ariaHasPopup: 'dialog',
        ariaExpanded: panel.isOpen,
        ariaControls: panel.panelId,
        onClick: () => panel.toggle(),
      }),
    ),
    createElement(
      OgeButtonGroup,
      {
        selectionMode: 'single',
        size: 'sm',
        stylingMode: 'outlined',
        selectedKeys: placementKeys,
        onSelectionChange: (change) => setPlacementKeys(change.selectedKeys),
        ariaLabel: 'Panel placement',
      },
      ...PLACEMENTS.map((value) =>
        createElement(OgeButton, { key: value, value, text: value }),
      ),
    ),
    panel.isOpen
      ? createElement(
          OgePopup,
          { panel, ref: popupRef },
          createElement(
            'div',
            { className: 'w-60 p-3 text-sm' },
            createElement(
              'p',
              { className: '!my-0 font-medium' },
              'Anchored content',
            ),
            createElement(
              'p',
              { className: '!mb-0 !mt-1 text-gray-500 dark:text-gray-400' },
              'Placement ',
              createElement('code', null, placement),
              ' — scroll or resize to watch it reposition; Escape or an outside click closes it.',
            ),
          ),
        )
      : null,
  );
}

const MENU_ITEMS: OgeMenuItem[] = [
  { text: 'Duplicate' },
  { text: 'Move to…', hint: 'Pick a destination' },
  { text: 'Pin', checked: true },
  { text: '', separator: true },
  { text: 'Archive', disabled: true },
  { text: 'Delete', severity: 'danger' },
];

function MenuListDemo(): ReactNode {
  const [last, setLast] = useState('');
  return createElement(
    'div',
    { className: 'flex flex-wrap items-start gap-6' },
    createElement(
      'div',
      {
        className:
          'w-56 rounded-lg border border-gray-200 py-1 shadow-sm dark:border-gray-800',
      },
      createElement(OgeMenuList, {
        items: MENU_ITEMS,
        ariaLabel: 'Demo actions',
        onItemClick: (event) => setLast(event.item.text),
      }),
    ),
    createElement(
      'span',
      { className: 'text-sm opacity-70' },
      `last action: ${last || '—'}`,
    ),
  );
}

/**
 * The React half of the overlay overview — the same two demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/overlay` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React overlay carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/buttons/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['useAnchoredPanel', 'OgePopup', 'flip + clamp']"
      heading="Anchored panel"
      description="<code>useAnchoredPanel</code> pairs an anchor element with a panel element and keeps the panel positioned: preferred placement, main-axis flip when the opposite side has more room, viewport clamping, repositioning on scroll/resize and panel growth. <code>&amp;lt;OgePopup&amp;gt;</code> supplies the fixed-position chrome and stays transparent until the first measure. Outside pointer-down and Escape close it by default."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="anchoredPanel" />
    </app-demo-card>

    <app-demo-card
      [chips]="['role=menu', 'activedescendant', 'type-ahead']"
      heading="Menu list"
      description="<code>&amp;lt;OgeMenuList&amp;gt;</code> implements the WAI-ARIA menu pattern with <code>aria-activedescendant</code>: the container holds real focus, arrows wrap and skip disabled items and separators, Home/End jump, printable keys type-ahead, Enter/Space activate. It is presentation-only — closing is delegated to the owner via <code>onCloseRequest</code>. Here it renders standalone (no popup) so the keyboard behavior is easy to try."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="menuList" />
    </app-demo-card>
  `,
})
export class ReactOverlayOverviewDemos {
  protected readonly demos = OVERLAY_OVERVIEW_DEMOS;
  protected readonly anchoredPanel = () => createElement(AnchoredPanelDemo);
  protected readonly menuList = () => createElement(MenuListDemo);
}

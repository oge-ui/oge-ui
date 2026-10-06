import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeFab,
  OgeSpeedDial,
  type OgeFabPosition,
  type OgeSpeedDialItem,
} from '@oge-ui/react-buttons';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { FAB_ICONS } from '../buttons/fab-snippets';
import { FAB_DEMOS } from './fab-snippets';

/** TOC of the React view — the same six sections as the Angular FAB page. */
export const REACT_BUTTONS_FAB_SECTIONS = [
  'Floating action button',
  'Extended FAB',
  'Positions & safe areas',
  'Speed dial',
  'Directions & label modes',
  'Hover mode',
] as const;

const box = (height: number, ...children: ReactNode[]) =>
  createElement(
    'div',
    { className: 'demo-fab-box', style: { height } },
    ...children,
  );

const POSITIONS: OgeFabPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];
const SHARE_ACTIONS: OgeSpeedDialItem[] = [
  { key: 'mail', label: 'Email', icon: FAB_ICONS.mail },
  { key: 'print', label: 'Print', icon: FAB_ICONS.print },
  { key: 'share', label: 'Copy link', icon: FAB_ICONS.share },
  { key: 'delete', label: 'Delete', icon: FAB_ICONS.trash, severity: 'danger' },
];
const FILE_ACTIONS: OgeSpeedDialItem[] = [
  { key: 'doc', label: 'Document', icon: FAB_ICONS.doc },
  { key: 'image', label: 'Image', icon: FAB_ICONS.image },
  { key: 'mail', label: 'Email draft', icon: FAB_ICONS.mail, disabled: true },
];
const QUICK_ACTIONS: OgeSpeedDialItem[] = [
  { key: 'share', label: 'Share', icon: FAB_ICONS.share },
  { key: 'mail', label: 'Email', icon: FAB_ICONS.mail },
];

function FabPreview(): ReactNode {
  const [clicks, setClicks] = useState(0);
  return box(
    224,
    createElement(OgeFab, {
      key: 'fab',
      label: 'Compose',
      icon: FAB_ICONS.pencil,
      positionMode: 'absolute',
      onClick: () => setClicks((n) => n + 1),
    }),
    createElement(
      'p',
      { key: 'out', className: 'p-3 text-sm', 'data-testid': 'fab-clicks' },
      `Pressed ${clicks} times`,
    ),
  );
}

function SpeedDialPreview(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [last, setLast] = useState('none');
  return createElement(
    'div',
    null,
    box(
      288,
      createElement(OgeSpeedDial, {
        key: 'dial',
        label: 'Share options',
        positionMode: 'absolute',
        items: SHARE_ACTIONS,
        opened,
        onOpenedChange: setOpened,
        onItemClick: ({ item }) => setLast(item.label),
      }),
    ),
    createElement(
      'p',
      { className: 'mt-2 text-sm', 'data-testid': 'speed-dial-last' },
      `Last action: ${last} · opened: ${opened}`,
    ),
  );
}

/**
 * The React half of the FAB & speed dial page — the same six sections as the
 * Angular page, rendered as real React trees inside `/components/buttons/fab`
 * when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-buttons-fab-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/buttons/src/styles.scss',
  styles: `
    .demo-fab-box {
      position: relative;
      overflow: hidden;
      border: 1px dashed var(--oge-border-color);
      border-radius: var(--oge-radius-lg);
    }
  `,
  template: `
    <app-demo-card
      [chips]="['label', 'icon', 'onClick']"
      heading="Floating action button"
      description="An icon-only FAB takes its accessible name from <code>label</code>. Pass the icon as SVG path data, or render your own <code>aria-hidden</code> icon as <code>children</code>. <code>onClick</code> reports the press."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="fab" />
    </app-demo-card>

    <app-demo-card
      [chips]="['extended', 'size', 'severity']"
      heading="Extended FAB"
      description="<code>extended</code> shows the label as text beside the icon in a pill. Sizes are 40 / 56 / 72 px; <code>severity</code> uses the button vocabulary (<code>normal</code> is the page surface)."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="extended" />
    </app-demo-card>

    <app-demo-card
      [chips]="['position', 'offset', 'env(safe-area-inset-*)']"
      heading="Positions & safe areas"
      description="Six logical positions — <code>start</code>/<code>end</code> mirror in RTL. Pinned edges use <code>max(offset, env(safe-area-inset-*))</code>, so a fixed FAB clears the home indicator and the notch once the app opts into <code>viewport-fit=cover</code>, and keeps the plain gap everywhere else."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="positions" />
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'opened', 'onItemClick', 'APG menu button']"
      heading="Speed dial"
      description="Enter, Space, a click or the arrow pointing along the dial opens it with focus on the nearest action (the arrow back opens it on the last). The arrows move and wrap, Home/End jump, Escape closes and returns focus to the FAB, Tab closes and moves on, a press outside closes it."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="speedDial" />
    </app-demo-card>

    <app-demo-card
      [chips]="['direction', 'labelMode', 'disabled item']"
      heading="Directions & label modes"
      description="<code>direction</code> overrides the default (up from a bottom FAB, down from a top one). <code>labelMode</code> is <code>hover</code> (beside the hovered or focused action, always on touch screens), <code>always</code>, or <code>none</code> — the label then stays the accessible name only. A disabled action is <code>aria-disabled</code> and skipped by the arrows."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="directions" />
    </app-demo-card>

    <app-demo-card
      [chips]="['openMode: hover']"
      heading="Hover mode"
      description='<code>openMode="hover"</code> also opens the dial while a mouse hovers it — never on touch, where a tap is the only gesture. Hover does not move focus; a click still opens it with focus on the first action.'
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="hover" />
    </app-demo-card>
  `,
})
export class ReactButtonsFabDemos {
  protected readonly demos = FAB_DEMOS;

  protected readonly fab = () => createElement(FabPreview);
  protected readonly speedDial = () => createElement(SpeedDialPreview);

  protected readonly extended = () =>
    createElement(
      'div',
      { className: 'demo-row' },
      createElement(OgeFab, {
        key: 'a',
        label: 'Compose',
        icon: FAB_ICONS.pencil,
        extended: true,
        positionMode: 'static',
      }),
      createElement(OgeFab, {
        key: 'b',
        label: 'Share',
        icon: FAB_ICONS.share,
        size: 'sm',
        severity: 'normal',
        positionMode: 'static',
      }),
      createElement(OgeFab, {
        key: 'c',
        label: 'Share',
        icon: FAB_ICONS.share,
        severity: 'success',
        positionMode: 'static',
      }),
      createElement(OgeFab, {
        key: 'd',
        label: 'Share',
        icon: FAB_ICONS.share,
        size: 'lg',
        severity: 'danger',
        positionMode: 'static',
      }),
    );

  protected readonly positions = () =>
    box(
      256,
      ...POSITIONS.map((position) =>
        createElement(OgeFab, {
          key: position,
          label: position,
          icon: FAB_ICONS.pencil,
          size: 'sm',
          positionMode: 'absolute',
          position,
          offset: '12px',
        }),
      ),
    );

  protected readonly directions = () =>
    box(
      240,
      createElement(OgeSpeedDial, {
        key: 'start',
        label: 'New file',
        positionMode: 'absolute',
        position: 'bottom-end',
        direction: 'start',
        labelMode: 'none',
        items: FILE_ACTIONS,
      }),
      createElement(OgeSpeedDial, {
        key: 'top',
        label: 'Insert',
        positionMode: 'absolute',
        position: 'top-start',
        labelMode: 'always',
        size: 'sm',
        items: FILE_ACTIONS,
      }),
    );

  protected readonly hover = () =>
    box(
      224,
      createElement(OgeSpeedDial, {
        key: 'hover',
        label: 'Quick actions',
        openMode: 'hover',
        positionMode: 'absolute',
        severity: 'normal',
        items: QUICK_ACTIONS,
      }),
    );
}

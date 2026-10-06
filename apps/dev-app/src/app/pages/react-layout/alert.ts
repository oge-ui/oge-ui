import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeAlert } from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_ALERT_DEMOS } from './alert-snippets';

/** TOC of the React view — the same five sections as the Angular alert page. */
export const REACT_LAYOUT_ALERT_SECTIONS = [
  'Severities',
  'Styling modes',
  'Title, actions & dismiss',
  'Live regions',
  'Custom icon',
] as const;

const stack = (...children: ReactNode[]) =>
  createElement('div', { className: 'grid gap-3' }, ...children);

const demoButton = (label: string, onClick: () => void, extra = '') =>
  createElement(
    'button',
    { type: 'button', className: `demo-btn ${extra}`.trim(), onClick },
    label,
  );

function DismissDemo(): ReactNode {
  const [visible, setVisible] = useState(true);
  return createElement(
    'div',
    null,
    createElement(
      OgeAlert,
      {
        severity: 'warning',
        title: 'Storage almost full',
        dismissible: true,
        visible,
        onVisibleChange: setVisible,
        actions: createElement(
          'button',
          { type: 'button', className: 'demo-btn' },
          'Manage storage',
        ),
      },
      'You have used 92% of your quota.',
    ),
    visible ? null : demoButton('Show again', () => setVisible(true)),
  );
}

function LiveDemo(): ReactNode {
  const [saved, setSaved] = useState(false);
  return createElement(
    'div',
    null,
    demoButton('Toggle saved', () => setSaved(!saved), 'mb-3'),
    stack(
      createElement(
        OgeAlert,
        {
          key: 's',
          severity: 'success',
          visible: saved,
          onVisibleChange: setSaved,
        },
        'Draft saved.',
      ),
      createElement(
        OgeAlert,
        { key: 'r', severity: 'info', live: 'off' },
        'This page is read-only.',
      ),
    ),
  );
}

const TIP_ICON = createElement(
  'svg',
  {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
  },
  createElement('path', {
    d: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z',
  }),
);

/**
 * The React half of the alert page — the same five sections as the Angular
 * page, rendered as real React trees inside `/components/alert` when the
 * reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-alert-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../shared/react-layout-demo-base.scss',
  template: `
    <app-demo-card
      [chips]="['info', 'success', 'warning', 'error']"
      heading="Severities"
      description='Four severities, four glyphs, four live-region roles: <code>info</code> / <code>success</code> are <code>role="status"</code>, <code>warning</code> / <code>error</code> <code>role="alert"</code>.'
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="severities" />
    </app-demo-card>

    <app-demo-card
      [chips]="['soft', 'outlined', 'filled']"
      heading="Styling modes"
      description="<code>soft</code> (default) is a tinted surface with a severity rail, <code>outlined</code> a coloured frame, <code>filled</code> the solid severity colour with <code>--oge-severity-contrast</code> text."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="modes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['title', 'actions', 'dismissible', 'onClosing']"
      heading="Title, actions & dismiss"
      description="<code>dismissible</code> adds a real dismiss button named from the messages catalog. <code>onClosing</code> is cancelable; when the alert held focus, focus moves to the next control instead of dropping to the page body."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="dismiss" />
    </app-demo-card>

    <app-demo-card
      [chips]="['live', 'announce on show', 'live: off']"
      heading="Live regions"
      description='The role stays on the host while it is hidden, so showing the alert inserts its text into an existing live region and is announced. <code>live="off"</code> renders no role for a permanent note; <code>assertive</code> / <code>polite</code> force one.'
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="live" />
    </app-demo-card>

    <app-demo-card
      [chips]="['icon', 'showIcon']"
      heading="Custom icon"
      description="<code>icon</code> replaces the default glyph inside an <code>aria-hidden</code> wrapper; <code>showIcon={false}</code> drops the icon column."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="icon" />
    </app-demo-card>
  `,
})
export class ReactLayoutAlertDemos {
  protected readonly demos = LAYOUT_ALERT_DEMOS;

  protected readonly severities = () =>
    stack(
      createElement(
        OgeAlert,
        { key: 'i', severity: 'info' },
        'A new version is available.',
      ),
      createElement(
        OgeAlert,
        { key: 's', severity: 'success' },
        'Your changes were saved.',
      ),
      createElement(
        OgeAlert,
        { key: 'w', severity: 'warning' },
        'Your trial ends in three days.',
      ),
      createElement(
        OgeAlert,
        { key: 'e', severity: 'error' },
        'The payment could not be processed.',
      ),
    );

  protected readonly modes = () =>
    stack(
      createElement(
        OgeAlert,
        { key: 's', severity: 'success', stylingMode: 'soft' },
        'Soft',
      ),
      createElement(
        OgeAlert,
        { key: 'o', severity: 'success', stylingMode: 'outlined' },
        'Outlined',
      ),
      createElement(
        OgeAlert,
        { key: 'f', severity: 'success', stylingMode: 'filled' },
        'Filled',
      ),
    );

  protected readonly dismiss = () => createElement(DismissDemo);
  protected readonly live = () => createElement(LiveDemo);

  protected readonly icon = () =>
    stack(
      createElement(
        OgeAlert,
        { key: 't', severity: 'info', title: 'Tip', icon: TIP_ICON },
        'Press ',
        createElement('kbd', { key: 'k' }, '?'),
        ' to see every keyboard shortcut.',
      ),
      createElement(
        OgeAlert,
        { key: 'n', severity: 'info', showIcon: false },
        'No icon at all.',
      ),
    );
}

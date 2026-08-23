import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import {
  OgeToastProvider,
  useOgeToasts,
  type OgeToastPosition,
  type OgeToastSeverity,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { OVERLAY_TOAST_DEMOS } from './toast-snippets';

/**
 * TOC of the React view — the same five sections as the Angular toast page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_OVERLAY_TOAST_SECTIONS = [
  'Severities',
  'Positions & stacking',
  'Sticky, action & undo',
  'Promise toasts',
  'Coalescing & progress',
] as const;

const SEVERITIES: OgeToastSeverity[] = ['success', 'info', 'warning', 'error'];
const POSITIONS: OgeToastPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];

const row = (...children: ReactNode[]) =>
  createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-3' },
    ...children,
  );

/** Each demo is its own React root, so each carries its own provider. */
const withProvider = (demo: () => ReactNode) =>
  createElement(OgeToastProvider, null, createElement(demo));

function SeveritiesDemo(): ReactNode {
  const toasts = useOgeToasts();
  const messages: Record<OgeToastSeverity, string> = {
    success: 'Changes saved',
    info: 'Sync completed a minute ago',
    warning: 'Storage quota at 90%',
    error: 'Could not reach the server',
  };
  return row(
    ...SEVERITIES.map((severity) =>
      createElement(OgeButton, {
        key: severity,
        text: severity,
        stylingMode: 'outlined',
        onClick: () =>
          toasts.show({
            message: messages[severity],
            severity,
            title: severity === 'warning' ? 'Heads up' : undefined,
          }),
      }),
    ),
  );
}

function PositionsDemo(): ReactNode {
  const toasts = useOgeToasts();
  return row(
    ...POSITIONS.map((position) =>
      createElement(OgeButton, {
        key: position,
        text: position,
        stylingMode: 'text',
        onClick: () => toasts.info(position, { position }),
      }),
    ),
    createElement(OgeButton, {
      key: 'burst',
      text: 'Burst ×8',
      onClick: () => {
        for (let i = 1; i <= 8; i++) {
          toasts.info(`Burst toast ${i} of 8`, { displayTime: 3000 });
        }
      },
    }),
  );
}

function UndoDemo(): ReactNode {
  const toasts = useOgeToasts();
  const [undoState, setUndoState] = useState('—');
  const deleteWithUndo = async (): Promise<void> => {
    setUndoState('row deleted…');
    const ref = toasts.show({
      message: 'Row deleted',
      sticky: true,
      action: { text: 'Undo', handler: () => setUndoState('restored!') },
    });
    const { reason } = await ref.closed;
    if (reason !== 'action') setUndoState(`gone for good (${reason})`);
  };
  return createElement(
    'div',
    { className: 'flex items-center gap-4' },
    createElement(OgeButton, {
      text: 'Delete row',
      severity: 'danger',
      stylingMode: 'outlined',
      onClick: () => void deleteWithUndo(),
    }),
    createElement('span', { className: 'text-sm opacity-70' }, undoState),
  );
}

function PromiseDemo(): ReactNode {
  const toasts = useOgeToasts();
  const run = (succeed: boolean): void => {
    const work = new Promise<number>((resolve, reject) => {
      setTimeout(
        () => (succeed ? resolve(3) : reject(new Error('network timeout'))),
        1800,
      );
    });
    void toasts.promise(work, {
      loading: 'Publishing…',
      success: (count) => `Published ${count} pages`,
      error: (e) => ({
        title: 'Publish failed',
        message: e instanceof Error ? e.message : String(e),
      }),
    });
  };
  return row(
    createElement(OgeButton, {
      key: 'ok',
      text: 'Publish (succeeds)',
      onClick: () => run(true),
    }),
    createElement(OgeButton, {
      key: 'fail',
      text: 'Publish (fails)',
      stylingMode: 'outlined',
      onClick: () => run(false),
    }),
  );
}

function CoalesceDemo(): ReactNode {
  const toasts = useOgeToasts();
  return row(
    createElement(OgeButton, {
      key: 'coalesce',
      text: 'Fail an import row',
      stylingMode: 'outlined',
      onClick: () =>
        toasts.error('Import row failed', { coalesce: true, sticky: true }),
    }),
    createElement(OgeButton, {
      key: 'progress',
      text: 'With progress bar',
      stylingMode: 'outlined',
      onClick: () =>
        toasts.info('Hover me — the bar pauses with the timer', {
          progressBar: true,
          displayTime: 6000,
        }),
    }),
    createElement(OgeButton, {
      key: 'clear',
      text: 'Clear all',
      stylingMode: 'text',
      onClick: () => toasts.clear(),
    }),
  );
}

/**
 * The React half of the toast page — the same five demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/overlay/toast` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-toast-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/buttons/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['success/info/warning/error', 'title', 'announce']"
      heading="Severities"
      description="One sugar method per severity — the accent bar, icon and screen-reader mode follow. <code>title</code> adds a bold first line; <code>announce</code> overrides the politeness (errors assert by default)."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="severities" />
    </app-demo-card>

    <app-demo-card
      [chips]="['position', 'toastMaxVisible', 'FIFO queue']"
      heading="Positions & stacking"
      description="Six logical positions (<code>top/bottom × start/center/end</code>) — RTL flips start/end automatically. The newest toast lands nearest the screen edge; extras beyond <code>toastMaxVisible</code> wait in a lossless FIFO queue and promote as slots free up. Try the burst button."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="positions" />
    </app-demo-card>

    <app-demo-card
      [chips]="['sticky', 'action', 'ref.closed']"
      heading="Sticky, action & undo"
      description="<code>sticky</code> disables auto-dismiss — recommended whenever there's an <code>action</code>, so keyboard users can reach it. The action press closes with reason <code>'action'</code>; awaiting <code>ref.closed</code> gives a clean undo pattern without extra state."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="undo" />
    </app-demo-card>

    <app-demo-card
      [chips]="['promise()', 'in-place morph', 'ref.update']"
      heading="Promise toasts"
      description="<code>promise()</code> shows a sticky spinner toast and morphs it in place when the promise settles — success or error accepts a message or a function returning a message or a full patch. The auto-dismiss timer only starts on settle. Under the hood it's the public <code>ref.update()</code> — usable for any live-updating toast."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="promise" />
    </app-demo-card>

    <app-demo-card
      [chips]="['coalesce', '×N badge', 'progressBar']"
      heading="Coalescing & progress"
      description="With <code>coalesce</code> an identical toast doesn't pile up — the existing one gains a live <code>×N</code> badge, restarts its timer and re-announces. <code>progressBar</code> shows the remaining time as a compositor-only bar that freezes exactly in sync with the paused timer."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="coalesce" />
    </app-demo-card>
  `,
})
export class ReactOverlayToastDemos {
  protected readonly demos = OVERLAY_TOAST_DEMOS;
  protected readonly severities = () => withProvider(SeveritiesDemo);
  protected readonly positions = () => withProvider(PositionsDemo);
  protected readonly undo = () => withProvider(UndoDemo);
  protected readonly promise = () => withProvider(PromiseDemo);
  protected readonly coalesce = () => withProvider(CoalesceDemo);
}

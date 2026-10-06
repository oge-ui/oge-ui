import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import { OgeSelectBox } from '@oge-ui/react-inputs';
import {
  OgeWindow,
  type OgeWindowClosedEvent,
  type OgeWindowClosingEvent,
  type OgeWindowMovedEvent,
  type OgeWindowPlacement,
  type OgeWindowResizedEvent,
  type OgeWindowState,
  type OgeWindowStateChangingEvent,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { OVERLAY_WINDOW_DEMOS } from './window-snippets';

/**
 * TOC of the React view — the same six sections as the Angular window page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_OVERLAY_WINDOW_SECTIONS = [
  'Basics',
  'Multiple windows & stacking',
  'Drag & resize (keyboard too)',
  'Minimize / maximize',
  'Placement & constraints',
  'Events',
] as const;

const PLACEMENTS: readonly OgeWindowPlacement[] = [
  'top-start',
  'top',
  'top-end',
  'start',
  'center',
  'end',
  'bottom-start',
  'bottom',
  'bottom-end',
];

const row = (...children: ReactNode[]) =>
  createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-3' },
    ...children,
  );

const note = (testId: string | null, text: string) =>
  createElement(
    'span',
    {
      key: 'note',
      className: 'text-sm opacity-70',
      ...(testId ? { 'data-testid': testId } : {}),
    },
    text,
  );

const outlined = (key: string, text: string, onClick: () => void) =>
  createElement(OgeButton, { key, text, stylingMode: 'outlined', onClick });

const para = (...children: ReactNode[]) =>
  createElement('p', { className: 'm-0' }, ...children);

function BasicDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  return createElement(
    'div',
    null,
    row(
      createElement(OgeButton, {
        key: 'open',
        text: 'Open window',
        onClick: () => setOpened(true),
      }),
      note(null, 'The page behind stays interactive.'),
    ),
    createElement(
      OgeWindow,
      {
        title: 'Quick notes',
        opened,
        onOpenedChange: setOpened,
        width: 360,
      },
      createElement(
        'label',
        { className: 'flex flex-col gap-1 text-sm' },
        createElement('span', null, 'Notes'),
        createElement('textarea', {
          className:
            'min-h-24 rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-transparent',
        }),
      ),
    ),
  );
}

const ALIGNMENTS = ['Start', 'Center', 'End'];

function StackingDemo(): ReactNode {
  const [inspector, setInspector] = useState(false);
  const [layers, setLayers] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [active, setActive] = useState('—');
  const [alignment, setAlignment] = useState<unknown>('Start');
  return createElement(
    'div',
    null,
    row(
      outlined('open', 'Open three windows', () => {
        setInspector(true);
        setLayers(true);
        setConsoleOpen(true);
      }),
      note('active-window', `active: ${active}`),
    ),
    createElement(
      OgeWindow,
      {
        key: 'inspector',
        title: 'Inspector',
        opened: inspector,
        onOpenedChange: setInspector,
        placement: 'top-start',
        width: 280,
        onActivated: () => setActive('Inspector'),
      },
      createElement(OgeSelectBox, {
        label: 'Align',
        items: ALIGNMENTS,
        value: alignment,
        onValueChange: setAlignment,
      }),
    ),
    createElement(
      OgeWindow,
      {
        key: 'layers',
        title: 'Layers',
        opened: layers,
        onOpenedChange: setLayers,
        placement: 'top-end',
        width: 260,
        onActivated: () => setActive('Layers'),
      },
      createElement(
        'ul',
        { className: 'm-0 list-none p-0 text-sm' },
        createElement('li', { key: 'b' }, 'Background'),
        createElement('li', { key: 's' }, 'Shapes'),
        createElement('li', { key: 'l' }, 'Labels'),
      ),
    ),
    createElement(
      OgeWindow,
      {
        key: 'console',
        title: 'Console',
        opened: consoleOpen,
        onOpenedChange: setConsoleOpen,
        placement: 'bottom',
        width: 420,
        onActivated: () => setActive('Console'),
      },
      createElement('p', { className: 'm-0 font-mono text-sm' }, '> ready'),
    ),
  );
}

function DragDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [status, setStatus] = useState('not moved yet');
  return createElement(
    'div',
    null,
    row(
      outlined('open', 'Open draggable window', () => setOpened(true)),
      note('drag-status', status),
    ),
    createElement(
      OgeWindow,
      {
        title: 'Drag me',
        opened,
        onOpenedChange: setOpened,
        width: 320,
        minWidth: 260,
        minHeight: 160,
        maxWidth: 640,
        onMoved: (event: OgeWindowMovedEvent) =>
          setStatus(`moved to ${event.x}, ${event.y} (${event.source})`),
        onResized: (event: OgeWindowResizedEvent) =>
          setStatus(
            `resized to ${event.width} × ${event.height} (${event.source})`,
          ),
      },
      para(
        'Drag the title bar, or pull any edge. Focus the frame and use the arrow keys.',
      ),
    ),
  );
}

function StateDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [state, setState] = useState<OgeWindowState>('normal');
  const [locked, setLocked] = useState(false);
  return createElement(
    'div',
    null,
    row(
      outlined('open', 'Open report', () => setOpened(true)),
      createElement(
        'label',
        { key: 'veto', className: 'flex items-center gap-2 text-sm' },
        createElement('input', {
          type: 'checkbox',
          checked: locked,
          onChange: (event: { target: { checked: boolean } }) =>
            setLocked(event.target.checked),
        }),
        'Veto maximize',
      ),
      note('window-state', `state: ${state}`),
    ),
    createElement(
      OgeWindow,
      {
        title: 'Report',
        opened,
        onOpenedChange: setOpened,
        state,
        onStateChange: setState,
        width: 380,
        onStateChanging: (event: OgeWindowStateChangingEvent) => {
          if (event.state === 'maximized' && locked) event.cancel = true;
        },
      },
      para('Quarterly figures, ready for review.'),
    ),
  );
}

function PlacementDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [placement, setPlacement] = useState<OgeWindowPlacement>('bottom-end');
  const [contained, setContained] = useState(true);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'flex flex-wrap items-center gap-2' },
      ...PLACEMENTS.map((p) =>
        createElement(OgeButton, {
          key: p,
          text: p,
          size: 'sm',
          stylingMode: 'outlined',
          onClick: () => {
            setPlacement(p);
            setOpened(true);
          },
        }),
      ),
      createElement(
        'label',
        { key: 'free', className: 'ms-2 flex items-center gap-2 text-sm' },
        createElement('input', {
          type: 'checkbox',
          checked: !contained,
          onChange: (event: { target: { checked: boolean } }) =>
            setContained(!event.target.checked),
        }),
        'Allow off-screen (title bar stays reachable)',
      ),
    ),
    createElement(
      OgeWindow,
      {
        title: 'Placed window',
        opened,
        onOpenedChange: setOpened,
        placement,
        keepInViewport: contained,
        width: 300,
      },
      para('Placement: ', createElement('code', null, placement)),
    ),
  );
}

function EventsDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [events, setEvents] = useState<readonly string[]>([]);
  const log = (entry: string): void =>
    setEvents((list) => [...list, entry].slice(-8));
  return createElement(
    'div',
    { className: 'flex flex-wrap items-start gap-4' },
    outlined('open', 'Open event log window', () => setOpened(true)),
    createElement(
      'ol',
      {
        key: 'log',
        className: 'm-0 min-w-56 list-decimal ps-5 font-mono text-xs',
        'aria-label': 'Window events',
        'data-testid': 'window-events',
      },
      ...events.map((entry, index) =>
        createElement('li', { key: index }, entry),
      ),
    ),
    createElement(
      OgeWindow,
      {
        key: 'window',
        title: 'Event log',
        opened,
        onOpenedChange: setOpened,
        placement: 'end',
        width: 300,
        onOpening: () => log('opening'),
        onClosing: (event: OgeWindowClosingEvent) =>
          log(`closing (${event.reason})`),
        onClosed: (event: OgeWindowClosedEvent) =>
          log(`closed (${event.reason})`),
        onMoved: (event: OgeWindowMovedEvent) => log(`moved (${event.source})`),
        onResized: (event: OgeWindowResizedEvent) =>
          log(`resized (${event.source})`),
        onStateChanged: (event) => log(`stateChanged → ${event.state}`),
        onActivated: () => log('activated'),
      },
      para('Move, resize, minimize or close me.'),
    ),
  );
}

/**
 * The React half of the window page — the same six demo sections as the
 * Angular page, rendered as real React trees inside
 * `/components/overlay/window` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-window-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/buttons/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['opened / onOpenedChange', 'non-modal', 'role=dialog']"
      heading="Basics"
      description='Open it through the controlled <code>opened</code> pair or the ref handle&apos;s <code>open()</code> / <code>close()</code> / <code>toggle()</code>. The window is a <code>role="dialog"</code> without <code>aria-modal</code>, labelled by its title: nothing behind it is blocked, focus moves into it on open (<code>autoFocus</code>) and back to the opener when it closes. <kbd>Escape</kbd> closes it only while focus is inside and no popup is open — a window never joins the modal Escape stack.'
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['z-order', 'bringToFront()', 'onActivated', 'zIndex']"
      heading="Multiple windows & stacking"
      description="Any number of windows can be open. They share one z-order — across component trees and both render layers — on top of the <code>--oge-z-window</code> token (below anchored popups, so a select opened inside a window still shows above it). A press or focus brings a window to the front and fires <code>onActivated</code>; the frontmost window's title bar carries the active accent. <code>zIndex</code> sets a base of your own."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="stacking" />
    </app-demo-card>

    <app-demo-card
      [chips]="['draggable', 'resizable', 'min/max', 'keyboard twin']"
      heading="Drag & resize (keyboard too)"
      description="The title bar drags the window and eight edge and corner handles resize it — both through the shared pointer gesture (3px threshold, touch-safe, <kbd>Escape</kbd> mid-gesture puts the window back). The keyboard twin works on the focused frame (Tab reaches it, a title-bar press focuses it): arrows move by 10px, <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + arrows resize, <kbd>Shift</kbd> makes either step 1px, and the result is announced. <code>minWidth</code>/<code>minHeight</code>/<code>maxWidth</code>/<code>maxHeight</code> bound the size; <code>onMoved</code> and <code>onResized</code> report the new box and the <code>source</code>."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="drag" />
    </app-demo-card>

    <app-demo-card
      [chips]="['state', 'onStateChanging', 'minimize()', 'maximize()']"
      heading="Minimize / maximize"
      description="Minimize collapses the window to its title bar, maximize fills the viewport (inside the safe-area insets), restore brings the previous box back. Title-bar buttons (labels from the overlay messages), a title-bar double-click, <kbd>Alt</kbd>+<kbd>↑</kbd> / <kbd>Alt</kbd>+<kbd>↓</kbd>, the controlled <code>state</code> pair and the handle's <code>minimize()</code> / <code>maximize()</code> / <code>restore()</code> all run the cancelable <code>onStateChanging</code> → <code>onStateChanged</code> pipeline."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="state" />
    </app-demo-card>

    <app-demo-card
      [chips]="['placement', 'position', 'keepInViewport', 'RTL']"
      heading="Placement & constraints"
      description="Without a <code>position</code> the window opens at its <code>placement</code> — the centre, an edge (<code>top</code>, <code>bottom</code>, logical <code>start</code> / <code>end</code>) or a corner — and a new placement re-places an open window. <code>position</code> (<code>&#123; x, y &#125;</code> in viewport px) wins and moves the window when it changes. <code>keepInViewport</code> (default) keeps the whole window on screen; with <code>false</code> it may hang off the sides and bottom, but its title bar always stays reachable. A viewport resize re-clamps open windows."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="placement" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'onOpening',
        'onClosing',
        'onMoved',
        'onStateChanged',
        'onActivated',
      ]"
      heading="Events"
      description="Every interaction reports through a callback: cancelable <code>onOpening</code>, <code>onClosing</code> (with the <code>reason</code> — <code>'escape'</code>, <code>'closeButton'</code>, <code>'api'</code>) and <code>onStateChanging</code>; past-tense <code>onClosed</code>, <code>onMoved</code>, <code>onResized</code>, <code>onStateChanged</code> and <code>onActivated</code>. Interact with the window and watch the log."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="events" />
    </app-demo-card>
  `,
})
export class ReactOverlayWindowDemos {
  protected readonly demos = OVERLAY_WINDOW_DEMOS;
  protected readonly basic = () => createElement(BasicDemo);
  protected readonly stacking = () => createElement(StackingDemo);
  protected readonly drag = () => createElement(DragDemo);
  protected readonly state = () => createElement(StateDemo);
  protected readonly placement = () => createElement(PlacementDemo);
  protected readonly events = () => createElement(EventsDemo);
}

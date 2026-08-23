import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import { OgeSelectBox } from '@oge-ui/react-inputs';
import {
  OgeModal,
  OgeModalProvider,
  useOgeModalData,
  useOgeModalRef,
  useOgeModals,
  type OgeModalClosedEvent,
  type OgeModalSlotContext,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { OVERLAY_MODAL_DEMOS } from './modal-snippets';

/**
 * TOC of the React view — the same seven sections as the Angular modal page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_OVERLAY_MODAL_SECTIONS = [
  'Basics',
  'Form content & stacked popups',
  'Full screen, placement & sizing',
  'Window mode & modal service',
  'Async close guard',
  'Busy state',
  'Typed result',
] as const;

const p = (...children: ReactNode[]) =>
  createElement('p', { className: 'm-0' }, ...children);

const row = (...children: ReactNode[]) =>
  createElement(
    'div',
    { className: 'flex flex-wrap items-center gap-3' },
    ...children,
  );

const outlined = (key: string, text: string, onClick: () => void) =>
  createElement(OgeButton, { key, text, stylingMode: 'outlined', onClick });

function BasicDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  return createElement(
    'div',
    null,
    createElement(OgeButton, {
      text: 'Open modal',
      onClick: () => setOpened(true),
    }),
    createElement(
      OgeModal,
      {
        title: 'Team settings',
        opened,
        onOpenedChange: setOpened,
        renderFooter: ({ close }: OgeModalSlotContext) =>
          createElement(
            'div',
            { className: 'contents' },
            createElement(OgeButton, {
              key: 'cancel',
              text: 'Cancel',
              stylingMode: 'text',
              onClick: () => close(),
            }),
            createElement(OgeButton, {
              key: 'save',
              text: 'Save',
              onClick: () => close(),
            }),
          ),
      },
      p(
        'Centered dialog with backdrop, focus trap and scroll lock. Try ',
        createElement('kbd', null, 'Tab'),
        ' — focus wraps inside the dialog.',
      ),
    ),
  );
}

const STATUSES = ['Open', 'In progress', 'Done'];
const ASSIGNEES = ['Ada', 'Grace', 'Linus', 'Margaret'];

function FormDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [status, setStatus] = useState<unknown>('Open');
  const [assignee, setAssignee] = useState<unknown>(undefined);
  return createElement(
    'div',
    null,
    outlined('open', 'Edit record', () => setOpened(true)),
    createElement(
      OgeModal,
      {
        title: 'Edit record',
        opened,
        onOpenedChange: setOpened,
        width: 420,
        renderFooter: ({ close }: OgeModalSlotContext) =>
          createElement(OgeButton, { text: 'Done', onClick: () => close() }),
      },
      createElement(
        'div',
        { className: 'flex flex-col gap-3' },
        createElement(OgeSelectBox, {
          key: 'status',
          label: 'Status',
          items: STATUSES,
          value: status,
          onValueChange: setStatus,
        }),
        createElement(OgeSelectBox, {
          key: 'assignee',
          label: 'Assignee',
          items: ASSIGNEES,
          value: assignee,
          onValueChange: setAssignee,
        }),
      ),
    ),
  );
}

function SizingDemo(): ReactNode {
  const [sizingOpen, setSizingOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [unshadedOpen, setUnshadedOpen] = useState(false);
  return createElement(
    'div',
    null,
    row(
      outlined('max', 'Maximizable', () => setSizingOpen(true)),
      outlined('top', 'Top placement', () => setTopOpen(true)),
      outlined('quiet', 'No shading', () => setUnshadedOpen(true)),
    ),
    createElement(
      OgeModal,
      {
        title: 'Quarterly report',
        opened: sizingOpen,
        onOpenedChange: setSizingOpen,
        fullScreen,
        onFullScreenChange: setFullScreen,
        showMaximizeButton: true,
        width: 480,
        minHeight: 220,
        maxWidth: '90vw',
      },
      p(
        'Use the title-bar button (or press it again) to toggle full screen — the state is a controlled ',
        createElement('code', null, 'fullScreen'),
        ' prop.',
      ),
    ),
    createElement(
      OgeModal,
      {
        title: 'Quick search',
        opened: topOpen,
        onOpenedChange: setTopOpen,
        placement: 'top',
      },
      createElement('input', {
        className:
          'w-full rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-transparent',
        placeholder: 'Type to search…',
      }),
    ),
    createElement(
      OgeModal,
      {
        title: 'Transparent backdrop',
        opened: unshadedOpen,
        onOpenedChange: setUnshadedOpen,
        shading: false,
        width: 360,
      },
      p(
        'No dimming, but still modal: focus stays trapped and the page behind does not scroll.',
      ),
    ),
  );
}

/** Content of the imperative demo — gets its data and ref via the hooks. */
function ServiceDemoDialog(): ReactNode {
  const data = useOgeModalData<string>();
  const ref = useOgeModalRef<string>();
  return createElement(
    'div',
    null,
    createElement(
      'p',
      { className: 'm-0 mb-3' },
      'Rename ',
      createElement('code', null, data),
      ' — this component was opened imperatively and read its payload via ',
      createElement('code', null, 'useOgeModalData()'),
      '.',
    ),
    createElement(
      'div',
      { className: 'flex justify-end gap-2' },
      createElement(OgeButton, {
        key: 'cancel',
        text: 'Cancel',
        stylingMode: 'text',
        onClick: () => ref.close(),
      }),
      createElement(OgeButton, {
        key: 'rename',
        text: 'Rename',
        onClick: () => ref.close(`renamed-${data}`),
      }),
    ),
  );
}

function WindowDemo(): ReactNode {
  const modals = useOgeModals();
  const [opened, setOpened] = useState(false);
  const [serviceResult, setServiceResult] = useState('—');
  const [helpClicks, setHelpClicks] = useState(0);
  const openServiceDemo = async (): Promise<void> => {
    const ref = modals.open<string, string>(createElement(ServiceDemoDialog), {
      title: 'Opened via useOgeModals()',
      width: 380,
      data: 'report.xlsx',
    });
    const { result, reason } = await ref.closed;
    setServiceResult(result ?? `dismissed (${reason})`);
  };
  return createElement(
    'div',
    null,
    row(
      outlined('window', 'Drag & resize', () => setOpened(true)),
      outlined('service', 'Open via provider', () => void openServiceDemo()),
      createElement(
        'span',
        { key: 'result', className: 'text-sm opacity-70' },
        `provider result: ${serviceResult}`,
      ),
    ),
    createElement(
      OgeModal,
      {
        title: 'Drag me by this bar',
        opened,
        onOpenedChange: setOpened,
        dragEnabled: true,
        resizeEnabled: true,
        width: 380,
        minHeight: 160,
        renderHeaderActions: () =>
          createElement(
            'button',
            {
              type: 'button',
              className: 'oge-modal-close',
              'aria-label': 'Help',
              onClick: () => setHelpClicks((n) => n + 1),
            },
            '?',
          ),
      },
      p(
        'Drag the title bar; resize from the bottom-right corner. Position and size reset on reopen (',
        createElement('code', null, 'restorePosition'),
        '). The ',
        createElement('code', null, '?'),
        ' button in the title bar comes from the ',
        createElement('code', null, 'renderHeaderActions'),
        ` slot — clicked ${helpClicks} times, and it never starts a drag.`,
      ),
    ),
  );
}

function GuardDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState('');
  const confirmDiscard = (): boolean =>
    draft === '' || confirm('Discard unsaved changes?');
  return createElement(
    'div',
    null,
    outlined('open', 'Open guarded draft', () => setOpened(true)),
    createElement(
      OgeModal,
      {
        title: 'Draft message',
        opened,
        onOpenedChange: setOpened,
        closeGuard: confirmDiscard,
        renderFooter: ({ close }: OgeModalSlotContext) =>
          createElement(OgeButton, { text: 'Close', onClick: () => close() }),
      },
      createElement(
        'label',
        { className: 'flex flex-col gap-1 text-sm' },
        createElement('span', null, 'Message (edit to make it dirty)'),
        createElement('textarea', {
          className:
            'min-h-20 rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-transparent',
          value: draft,
          onChange: (event: { target: { value: string } }) =>
            setDraft(event.target.value),
        }),
      ),
    ),
  );
}

function BusyDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const openBusyDemo = (): void => {
    setOpened(true);
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setOpened(false);
    }, 2000);
  };
  return createElement(
    'div',
    null,
    outlined('open', 'Simulate save (2s)', openBusyDemo),
    createElement(
      OgeModal,
      {
        title: 'Publishing changes',
        opened,
        onOpenedChange: setOpened,
        busy: saving,
      },
      p('Escape, backdrop and ✕ are blocked while the fake request runs.'),
    ),
  );
}

function ResultDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  const [outcome, setOutcome] = useState('—');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'flex items-center gap-4' },
      createElement(OgeButton, {
        text: 'Delete file…',
        severity: 'danger',
        stylingMode: 'outlined',
        onClick: () => setOpened(true),
      }),
      createElement(
        'span',
        { className: 'text-sm opacity-70' },
        `outcome: ${outcome}`,
      ),
    ),
    createElement(
      OgeModal<string>,
      {
        title: 'Delete file?',
        opened,
        onOpenedChange: setOpened,
        width: 360,
        onClosed: (event: OgeModalClosedEvent<string>) =>
          setOutcome(
            event.result === 'delete' ? 'deleted' : `kept (${event.reason})`,
          ),
        renderFooter: ({ close }: OgeModalSlotContext<string>) =>
          createElement(
            'div',
            { className: 'contents' },
            createElement(OgeButton, {
              key: 'cancel',
              text: 'Cancel',
              stylingMode: 'text',
              onClick: () => close(),
            }),
            createElement(OgeButton, {
              key: 'delete',
              text: 'Delete',
              severity: 'danger',
              onClick: () => close('delete'),
            }),
          ),
      },
      p('This cannot be undone.'),
    ),
  );
}

/**
 * The React half of the modal page — the same seven demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/overlay/modal` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-modal-demos',
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
      [chips]="['opened / onOpenedChange', 'title', 'renderFooter']"
      heading="Basics"
      description="Open declaratively via the controlled <code>opened</code> pair or imperatively with the ref handle's <code>open()</code>/<code>close()</code>/<code>toggle()</code>. The <code>renderFooter</code> slot receives a <code>close</code> function; <code>Escape</code>, backdrop clicks and the ✕ button work out of the box and focus returns to the opener."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['width', 'OgeSelectBox', 'Escape stack']"
      heading="Form content & stacked popups"
      description="Any content goes in as children — including dropdown editors. Their popups render <em>above</em> the modal, and the shared Escape stack closes the topmost surface first: one <kbd>Escape</kbd> for the open select popup, a second for the modal."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>

    <app-demo-card
      [chips]="['fullScreen', 'placement', 'shading', 'min/max size']"
      heading="Full screen, placement & sizing"
      description='<code>showMaximizeButton</code> puts a maximize/restore toggle in the title bar, driving the controlled <code>fullScreen</code> pair (size props are ignored while full screen). <code>placement="top"</code> pins the dialog near the top edge — command-palette style — and <code>shading={false}</code> keeps the backdrop transparent while staying fully modal. Sizing accepts <code>width/height</code> plus <code>min/max</code> variants, as numbers (px) or CSS strings.'
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="sizing" />
    </app-demo-card>

    <app-demo-card
      [chips]="['dragEnabled', 'resizeEnabled', 'useOgeModals', 'inert']"
      heading="Window mode & modal service"
      description="<code>dragEnabled</code> makes the title bar a drag handle (viewport-clamped unless <code>dragOutsideBoundary</code>), <code>resizeEnabled</code> adds a corner handle with <code>onResizeStarted</code>/<code>onResized</code> callbacks, and <code>restorePosition</code> resets both on reopen. For imperative flows — or <code>transform</code>ed ancestors — <code>useOgeModals().open(content, config)</code> renders a body-appended modal under <code>&amp;lt;OgeModalProvider&amp;gt;</code>; the content reads <code>useOgeModalData()</code> and closes itself via <code>useOgeModalRef()</code>, whose <code>closed</code> promise carries the typed result. <code>inertBackground</code> additionally marks the page behind the modal <code>inert</code>."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="window" />
    </app-demo-card>

    <app-demo-card
      [chips]="['closeGuard', 'closePending', 'async veto']"
      heading="Async close guard"
      description="<code>closeGuard</code> runs before every close — <code>Escape</code>, backdrop, ✕ and <code>close()</code> alike — and may return a <code>Promise&amp;lt;boolean&amp;gt;</code>: the modal stays open until it resolves, single-flight guarded. No other library covers the async unsaved-changes veto without hand-rolled plumbing. Flipping the <code>opened</code> prop to <code>false</code> bypasses the guard (the app already decided)."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="guard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['busy', 'aria-busy', 'spinner veil']"
      heading="Busy state"
      description="While <code>busy</code> is true the modal shows a spinner veil, sets <code>aria-busy</code> and blocks user-initiated closes — programmatic <code>close()</code> still works, so finish your async work and close. Pairs naturally with the button family's async <code>action</code>."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="busy" />
    </app-demo-card>

    <app-demo-card
      [chips]="['close(result)', 'OgeModalClosedEvent', 'reason']"
      heading="Typed result"
      description="<code>close(result)</code> — from the handle or the footer slot — carries a typed value into <code>onClosed</code>, alongside the close <code>reason</code>. Declarative confirm/prompt flows no longer need side-channel component state."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="result" />
    </app-demo-card>
  `,
})
export class ReactOverlayModalDemos {
  protected readonly demos = OVERLAY_MODAL_DEMOS;
  protected readonly basic = () => createElement(BasicDemo);
  protected readonly form = () => createElement(FormDemo);
  protected readonly sizing = () => createElement(SizingDemo);
  /** The imperative demo needs the provider above it — its own React root. */
  protected readonly window = () =>
    createElement(OgeModalProvider, null, createElement(WindowDemo));
  protected readonly guard = () => createElement(GuardDemo);
  protected readonly busy = () => createElement(BusyDemo);
  protected readonly result = () => createElement(ResultDemo);
}

import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import {
  OgePopover,
  type OgePopoverClosingEvent,
  type OgePopoverHandle,
  type OgePopoverSlotContext,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { OVERLAY_POPOVER_DEMOS } from './popover-snippets';

/**
 * TOC of the React view — the same five sections as the Angular page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_OVERLAY_POPOVER_SECTIONS = [
  'Basics',
  'Triggers',
  'Placement & arrow',
  'Modal vs non-modal',
  'Events & imperative API',
] as const;

const ROW = 'flex flex-wrap items-center gap-3';
const FIELD_CLASS =
  'mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900';

const button = (text: string, extra?: object) =>
  createElement(OgeButton, { text, ...extra });

const actions =
  (primary: string) =>
  ({ close }: OgePopoverSlotContext): ReactNode =>
    createElement(
      'div',
      { className: 'contents' },
      button('Cancel', { stylingMode: 'text', onClick: close, key: 'c' }),
      button(primary, { onClick: close, key: 'p' }),
    );

function BasicsDemo(): ReactNode {
  return createElement(
    'div',
    { className: ROW, 'data-testid': 'popover-basics' },
    createElement(
      OgePopover,
      {
        trigger: button('Share'),
        title: 'Share report',
        arrow: true,
        renderFooter: ({ close }: OgePopoverSlotContext) =>
          createElement(
            'div',
            { className: 'contents' },
            button('Done', { stylingMode: 'text', onClick: close, key: 'd' }),
            button('Copy link', { onClick: close, key: 'c' }),
          ),
      },
      createElement('p', null, 'Anyone with the link can view this report.'),
    ),
  );
}

function TriggersDemo(): ReactNode {
  const manual = useRef<OgePopoverHandle>(null);
  const outlined = (text: string, extra?: object) =>
    button(text, { stylingMode: 'outlined', ...extra });
  return createElement(
    'div',
    { className: ROW, 'data-testid': 'popover-triggers' },
    createElement(
      OgePopover,
      { key: 'click', trigger: outlined('Click'), title: 'Click' },
      'Toggles on activation.',
    ),
    createElement(
      OgePopover,
      {
        key: 'hover',
        trigger: outlined('Hover'),
        showOn: 'hover',
        showCloseButton: false,
        ariaLabel: 'Hover help',
      },
      'Move into me — I stay open. ',
      createElement(
        'a',
        {
          href: '#hover',
          className: 'text-indigo-600 underline dark:text-indigo-400',
        },
        'Links work',
      ),
      '.',
    ),
    createElement(
      OgePopover,
      {
        key: 'focus',
        trigger: createElement('input', {
          className:
            'rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900',
          'aria-label': 'Coupon',
          placeholder: 'Coupon code',
        }),
        showOn: 'focus',
        showCloseButton: false,
        ariaLabel: 'Coupon help',
      },
      'Codes are case-insensitive.',
    ),
    createElement(
      OgePopover,
      {
        key: 'manual',
        ref: manual,
        trigger: outlined('Manual', {
          onClick: () => manual.current?.toggle(),
        }),
        showOn: 'manual',
        title: 'Manual',
      },
      'Opened from code.',
    ),
  );
}

const PLACEMENTS = [
  { label: 'Top', placement: 'top' },
  { label: 'Right start', placement: 'right-start' },
  { label: 'Bottom end', placement: 'bottom-end' },
  { label: 'Left', placement: 'left' },
] as const;

function PlacementDemo(): ReactNode {
  return createElement(
    'div',
    { className: ROW, 'data-testid': 'popover-placement' },
    PLACEMENTS.map((p) =>
      createElement(
        OgePopover,
        {
          key: p.placement,
          trigger: button(p.label, { stylingMode: 'outlined' }),
          placement: p.placement,
          arrow: true,
          width: 220,
          title: p.label,
        },
        `Prefers ${p.placement}; flips when there is no room.`,
      ),
    ),
  );
}

function ModalDemo(): ReactNode {
  return createElement(
    'div',
    { className: ROW, 'data-testid': 'popover-modal' },
    createElement(
      OgePopover,
      {
        key: 'filter',
        trigger: button('Filter', { stylingMode: 'outlined' }),
        title: 'Filter',
      },
      createElement(
        'label',
        { className: 'block text-sm' },
        'Contains',
        createElement('input', {
          className: FIELD_CLASS,
          'data-testid': 'filter-input',
        }),
      ),
    ),
    createElement(
      'button',
      {
        key: 'next',
        type: 'button',
        className:
          'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700',
        'data-testid': 'after-filter',
      },
      'Next control',
    ),
    createElement(
      OgePopover,
      {
        key: 'rename',
        trigger: button('Rename'),
        title: 'Rename file',
        modal: true,
        renderFooter: actions('Save'),
      },
      createElement(
        'label',
        { className: 'block text-sm' },
        'Name',
        createElement('input', {
          className: FIELD_CLASS,
          defaultValue: 'report.xlsx',
        }),
      ),
    ),
  );
}

function EventsDemo(): ReactNode {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [lastEvent, setLastEvent] = useState('—');
  return createElement(
    'div',
    { className: ROW, 'data-testid': 'popover-events' },
    createElement(
      OgePopover,
      {
        key: 'details',
        trigger: button('Details'),
        title: 'Order #1042',
        open,
        onOpenChange: setOpen,
        onOpened: (e: { reason: string }) =>
          setLastEvent(`opened: ${e.reason}`),
        onClosing: (e: OgePopoverClosingEvent) => {
          e.cancel = pinned && e.reason !== 'closeButton';
        },
        onClosed: (e: { reason: string }) =>
          setLastEvent(`closed: ${e.reason}`),
      },
      'Shipped today — arrives Thursday.',
    ),
    button('Open from code', {
      key: 'api',
      stylingMode: 'outlined',
      onClick: () => setOpen(true),
    }),
    createElement(
      'label',
      { key: 'pin', className: 'flex items-center gap-1.5 text-sm' },
      createElement('input', {
        type: 'checkbox',
        checked: pinned,
        onChange: () => setPinned(!pinned),
      }),
      'Pin',
    ),
    createElement(
      'span',
      {
        key: 'state',
        className: 'text-sm opacity-70',
        'data-testid': 'popover-last-event',
      },
      `visible: ${open} · last: ${lastEvent}`,
    ),
  );
}

/**
 * The React half of the popover page — the same five demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/overlay/popover` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-popover-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/buttons/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['OgePopover', 'trigger', 'title', 'renderFooter', 'arrow']"
      heading="Basics"
      description='Pass the trigger element as <code>trigger</code> and the body as children. The trigger becomes an APG disclosure — <code>aria-haspopup="dialog"</code>, <code>aria-expanded</code> and <code>aria-controls</code> — and the panel is a <code>role="dialog"</code> labelled by its title. <code>renderFooter</code> receives <code>close</code> for the action bar; Escape, an outside click and the ✕ close it too.'
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showOn', 'click', 'hover', 'focus', 'manual']"
      heading="Triggers"
      description="<code>showOn</code> picks what opens it: <code>click</code> (the default disclosure), <code>hover</code> — a short dwell, then a grace period that lets the pointer travel into the panel, and keyboard focus opens it too so the content is never pointer-only — <code>focus</code>, or <code>manual</code> for popovers driven only from code (the ref handle's <code>open()</code> / <code>close()</code> / <code>toggle()</code>)."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="triggers" />
    </app-demo-card>

    <app-demo-card
      [chips]="['placement', 'arrow', 'width / maxWidth']"
      heading="Placement & arrow"
      description="<code>placement</code> prefers a side and alignment (<code>top</code>, <code>right-start</code>, <code>bottom-end</code>…) and flips when the viewport runs out of room, RTL-aware. <code>arrow</code> draws a callout pointer on the edge facing the trigger; its geometry is shared with the tooltip and keeps pointing at the trigger after the viewport clamp shifted the panel. <code>width</code> / <code>maxWidth</code> size the content box."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="placement" />
    </app-demo-card>

    <app-demo-card
      [chips]="['modal', 'aria-modal', 'Tab order', 'initialFocus']"
      heading="Modal vs non-modal"
      description="Non-modal (the default) follows the APG disclosure: focus stays on the trigger, <kbd>Tab</kbd> moves into the panel and on past it — the panel is rendered into the body, yet focus order matches the visual order — and leaving it closes it. <code>modal</code> makes it an <code>aria-modal</code> dialog: focus moves inside (<code>initialFocus</code>), <kbd>Tab</kbd> is trapped, and focus returns to the trigger on close."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="modal" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'open / onOpenChange',
        'onOpening / onClosing',
        'onOpened / onClosed',
        'ref handle',
      ]"
      heading="Events & imperative API"
      description="<code>open</code> + <code>onOpenChange</code> control it (or <code>defaultOpen</code> uncontrolled); changes from code run the same pipeline. <code>onOpening</code> and <code>onClosing</code> are cancelable and carry the reason (<code>click</code>, <code>hover</code>, <code>focus</code>, <code>api</code> / <code>trigger</code>, <code>pointerLeave</code>, <code>focusOut</code>, <code>outside</code>, <code>escape</code>, <code>closeButton</code>); <code>onOpened</code> and <code>onClosed</code> follow. Here “Pin” vetoes every close except the ✕."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="events" />
    </app-demo-card>
  `,
})
export class ReactOverlayPopoverDemos {
  protected readonly demos = OVERLAY_POPOVER_DEMOS;
  protected readonly basics = () => createElement(BasicsDemo);
  protected readonly triggers = () => createElement(TriggersDemo);
  protected readonly placement = () => createElement(PlacementDemo);
  protected readonly modal = () => createElement(ModalDemo);
  protected readonly events = () => createElement(EventsDemo);
}

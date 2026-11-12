import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { OgeTour, type OgeTourHandle } from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { TOUR_STEPS, TOUR_WELCOME_STEPS } from '../overlay/tour-demo-data';
import { OVERLAY_TOUR_DEMOS } from './tour-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_OVERLAY_TOUR_SECTIONS = [
  'Guided tour',
  'Resuming & centered steps',
] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

function BasicsDemo(): ReactNode {
  const tour = useRef<OgeTourHandle>(null);
  const [last, setLast] = useState('Not taken yet');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      {
        key: 'toolbar',
        className:
          'flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800',
      },
      createElement('input', {
        key: 'search',
        id: 'tour-demo-search',
        type: 'search',
        'aria-label': 'Search',
        placeholder: 'Search…',
        className:
          'min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-transparent',
      }),
      createElement(
        'button',
        {
          key: 'filters',
          id: 'tour-demo-filters',
          type: 'button',
          className: BUTTON,
        },
        'Filters',
      ),
      createElement(
        'button',
        {
          key: 'export',
          id: 'tour-demo-export',
          type: 'button',
          className: BUTTON,
        },
        'Export',
      ),
    ),
    createElement(
      'div',
      { key: 'row', className: 'mt-3 flex items-center gap-3' },
      createElement(
        'button',
        {
          key: 'start',
          type: 'button',
          className: BUTTON,
          'data-testid': 'start-tour',
          onClick: () => tour.current?.start(),
        },
        'Take the tour',
      ),
      createElement(
        'span',
        { key: 'last', className: 'text-sm', 'data-testid': 'tour-last' },
        last,
      ),
    ),
    createElement(OgeTour, {
      key: 'tour',
      ref: tour,
      steps: TOUR_STEPS,
      onClosed: (e) => setLast(`Closed by ${e.reason} on step ${e.step + 1}`),
    }),
  );
}

function ControlledDemo(): ReactNode {
  const [step, setStep] = useState(0);
  const [opened, setOpened] = useState(false);
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        key: 'resume',
        type: 'button',
        className: BUTTON,
        'data-testid': 'resume-tour',
        onClick: () => setOpened(true),
      },
      'Resume the tour',
    ),
    createElement(
      'span',
      { key: 'step', className: 'ms-3 text-sm', 'data-testid': 'tour-step' },
      `Step ${step + 1} of ${TOUR_WELCOME_STEPS.length}`,
    ),
    createElement(OgeTour, {
      key: 'tour',
      steps: TOUR_WELCOME_STEPS,
      step,
      onStepChange: setStep,
      opened,
      onOpenedChange: setOpened,
      closeOnBackdropClick: true,
    }),
  );
}

/**
 * The React half of the tour page — rendered inside `/components/overlay/tour`
 * when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-tour-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the one stylesheet the React tour needs
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/overlay/src/lib/tour/tour.scss',
  template: `
    <app-demo-card
      [chips]="['steps', 'target', 'placement', 'ref.start()', 'onClosed']"
      heading="Guided tour"
      description="Targets are CSS selectors here (an element or a function works too); <code>placement</code> picks the side of the card, which flips when it does not fit. The last step has no target, so its card is centered. <code>onClosed</code> reports how it ended — done, skip, escape, backdrop or api — so an app can show a tour only once."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['step', 'opened', 'closeOnBackdropClick']"
      heading="Resuming & centered steps"
      description="<code>step</code> / <code>onStepChange</code> and <code>opened</code> / <code>onOpenedChange</code> are controlled, so a tour can resume where the user left off. Steps without a target center the card over a dimmed page; <code>closeOnBackdropClick</code> lets a press on the page skip the tour (off by default)."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="controlled" />
    </app-demo-card>
  `,
})
export class ReactOverlayTourDemos {
  protected readonly demos = OVERLAY_TOUR_DEMOS;
  protected readonly basics = () => createElement(BasicsDemo);
  protected readonly controlled = () => createElement(ControlledDemo);
}

import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeStepper,
  OgeStepperConfigProvider,
  type OgeStepBlockedEvent,
  type OgeStepDefinition,
  type OgeStepperHandle,
  type OgeStepperOrientation,
} from '@oge-ui/react-navigation';
import { OgeTextBox } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { NAVIGATION_STEPPER_DEMOS } from './stepper-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular stepper page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_NAVIGATION_STEPPER_SECTIONS = [
  'Commands',
  'Linear flow',
  'Step states',
  'Leave guard',
  'Orientation',
  'Navigation buttons',
  'Inside a form',
  'Configuration',
] as const;

const ORIENTATIONS: readonly OgeStepperOrientation[] = [
  'horizontal',
  'vertical',
];

// Filled 16-viewBox glyphs for a step's `icon` field (SVG path data).
const USER_ICON =
  'M8 7.5A2.75 2.75 0 1 0 8 2a2.75 2.75 0 0 0 0 5.5ZM2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5Z';
const BOX_ICON = 'M8 1.5 14 4.5v7L8 14.5 2 11.5v-7Z';
const STAR_ICON =
  'm8 1.5 1.9 3.9 4.3.6-3.1 3 .7 4.2L8 11.2l-3.8 2 .7-4.2-3.1-3 4.3-.6Z';

/** The docs' plain button chrome, shared by the interactive demos. */
const demoButton = (
  key: string,
  label: string,
  onClick?: () => void,
  extra?: Record<string, unknown>,
) =>
  createElement(
    'button',
    {
      key,
      type: 'button',
      className: 'rounded border px-2 py-1 text-sm',
      onClick,
      ...extra,
    },
    label,
  );

/** A step body — the node the Angular `<oge-step>` would have projected. */
const body = (text: string) =>
  createElement('p', { className: 'text-sm opacity-70' }, text);

/** The checkbox rows the linear-flow and leave-guard demos use. */
const checkbox = (
  key: string,
  label: string,
  checked: boolean,
  onChange: () => void,
) =>
  createElement(
    'label',
    { key, className: 'flex items-center gap-2 text-sm' },
    createElement('input', { type: 'checkbox', checked, onChange }),
    label,
  );

function CommandsDemo(): ReactNode {
  const [step, setStep] = useState(0);
  const steps: readonly OgeStepDefinition[] = [
    {
      key: 'account',
      label: 'Account',
      description: 'Who you are',
      icon: USER_ICON,
      content: body('Account fields…'),
    },
    {
      key: 'shipping',
      label: 'Shipping',
      description: 'Where it goes',
      optional: true,
      icon: BOX_ICON,
      content: body('Shipping fields…'),
    },
    {
      key: 'review',
      label: 'Review',
      description: 'One last look',
      icon: STAR_ICON,
      content: body('Confirm and submit…'),
    },
  ];
  return createElement(OgeStepper, {
    steps,
    activeIndex: step,
    onActiveIndexChange: setStep,
    showNavigation: true,
    ariaLabel: 'Checkout',
  });
}

function LinearDemo(): ReactNode {
  const [step, setStep] = useState(0);
  const [accountDone, setAccountDone] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [blocked, setBlocked] = useState<string | undefined>(undefined);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-4' },
      checkbox('account', 'Account is complete', accountDone, () =>
        setAccountDone(!accountDone),
      ),
      checkbox('payment', 'Payment is complete', paymentDone, () =>
        setPaymentDone(!paymentDone),
      ),
    ),
    createElement(OgeStepper, {
      activeIndex: step,
      onActiveIndexChange: setStep,
      linear: true,
      showNavigation: true,
      ariaLabel: 'Linear flow',
      onStepBlocked: (event: OgeStepBlockedEvent) => setBlocked(event.reason),
      steps: [
        { label: 'Account', completed: accountDone, editable: false },
        { label: 'Payment', completed: paymentDone },
        { label: 'Review' },
      ],
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm opacity-70' },
      `last refusal → ${blocked ?? '—'}`,
    ),
  );
}

function GuardDemo(): ReactNode {
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(true);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3' },
      checkbox('dirty', 'pretend step 1 has unsaved changes', dirty, () =>
        setDirty(!dirty),
      ),
    ),
    createElement(OgeStepper, {
      activeIndex: step,
      onActiveIndexChange: setStep,
      showNavigation: true,
      ariaLabel: 'Leave guard',
      steps: [
        {
          label: 'Details',
          stepGuard: () => !dirty || confirm('Discard your changes?'),
          content: body('Details…'),
        },
        { label: 'Done', content: body('Done…') },
      ],
    }),
  );
}

function OrientationDemo(): ReactNode {
  const [step, setStep] = useState(0);
  const [orientation, setOrientation] =
    useState<OgeStepperOrientation>('vertical');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      ...ORIENTATIONS.map((option) =>
        demoButton(option, option, () => setOrientation(option), {
          className:
            orientation === option
              ? 'rounded border px-2 py-1 text-sm font-semibold'
              : 'rounded border px-2 py-1 text-sm',
        }),
      ),
    ),
    createElement(OgeStepper, {
      orientation,
      activeIndex: step,
      onActiveIndexChange: setStep,
      showNavigation: true,
      ariaLabel: 'Orientation',
      steps: [
        { label: 'One', content: body('First body…') },
        { label: 'Two', content: body('Second body…') },
      ],
    }),
  );
}

function NavButtonsDemo(): ReactNode {
  const wizard = useRef<OgeStepperHandle>(null);
  const [step, setStep] = useState(0);
  return createElement(
    'div',
    null,
    createElement(OgeStepper, {
      ref: wizard,
      activeIndex: step,
      onActiveIndexChange: setStep,
      ariaLabel: 'Navigation buttons',
      steps: [
        {
          label: 'One',
          content: createElement(
            'div',
            null,
            createElement(
              'p',
              { className: 'mb-2 text-sm opacity-70' },
              'First body…',
            ),
            demoButton('continue', 'Continue', () => wizard.current?.next()),
          ),
        },
        { label: 'Two', content: body('Second body…') },
      ],
    }),
    createElement(
      'div',
      { className: 'mt-3' },
      demoButton('back', 'Back', () => wizard.current?.previous()),
    ),
  );
}

function FormDemo(): ReactNode {
  const [order, setOrder] = useState({ email: '', card: '' });
  return createElement(OgeStepper, {
    linear: true,
    showNavigation: true,
    ariaLabel: 'Order',
    steps: [
      {
        key: 'account',
        label: 'Account',
        completed: order.email !== '',
        content: createElement(OgeTextBox, {
          label: 'E-mail',
          required: true,
          value: order.email,
          onValueChange: (email: string) =>
            setOrder((current) => ({ ...current, email })),
        }),
      },
      {
        key: 'payment',
        label: 'Payment',
        completed: order.card !== '',
        content: createElement(OgeTextBox, {
          label: 'Card',
          required: true,
          value: order.card,
          onValueChange: (card: string) =>
            setOrder((current) => ({ ...current, card })),
        }),
      },
    ],
  });
}

/**
 * The React half of the stepper page — the same eight demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/stepper` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-navigation-stepper-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React stepper carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles. The "Inside a form"
  // section puts React inputs inside a step, so that stylesheet comes too.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/navigation/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['activeIndex', 'showNavigation', 'icon', 'optional']"
      heading="Commands"
      description="The built-in Back / Next bar becomes Finish on the last step. None of Angular Material, Kendo or PrimeNG ships navigation buttons at all — every one of them makes you hand-roll a wizard's most predictable part. <code>icon</code> takes SVG path data and replaces the step number."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="commands" />
    </app-demo-card>

    <app-demo-card
      [chips]="['linear', 'completed', 'editable', 'onStepBlocked']"
      heading="Linear flow"
      description="<code>linear</code> blocks moving past a step that is neither <code>completed</code> nor <code>optional</code>; <code>editable: false</code> blocks coming back. Every refusal calls <code>onStepBlocked</code> with the reason — Material refuses silently and its own docs tell you to add a live region yourself."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="linear" />
    </app-demo-card>

    <app-demo-card
      [chips]="['number', 'active', 'done', 'error']"
      heading="Step states"
      description="The indicator state is derived from the step's own flags. <code>error</code> outranks <code>done</code>, so a completed step that later fails still reads as needing attention. The glyph is <code>aria-hidden</code>, so the state is announced in text as well."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="states" />
    </app-demo-card>

    <app-demo-card
      [chips]="['stepGuard', 'changePending']"
      heading="Leave guard"
      description="<code>stepGuard</code> runs when the user leaves a step, inside the same pipeline the headers use. <code>false</code>, a throw and a rejection all veto; a promise reports <code>changePending</code> and a second gesture meanwhile is dropped. It gates the finish on the last step too."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="guard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['orientation', 'display']"
      heading="Orientation"
      description="Vertical stacks the bodies under their own headers. The ARIA model is identical either way — the headers stay buttons with <code>aria-current='step'</code>, so a screen reader hears the same widget."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="orientation" />
    </app-demo-card>

    <app-demo-card
      [chips]="['ref', 'next()', 'previous()']"
      heading="Navigation buttons"
      description="Angular turns any button into a control with <code>[ogeStepperNext]</code> / <code>[ogeStepperPrevious]</code>. React has no directives, so the same pipeline is addressed through the imperative handle: <code>next()</code> and <code>previous()</code> run <code>linear</code> and <code>stepGuard</code> exactly as the headers do — from inside a step body or from anywhere outside, which Material's equivalents cannot do."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="navButtons" />
    </app-demo-card>

    <app-demo-card
      [chips]="['@oge-ui/react-inputs', 'linear', 'completed']"
      heading="Inside a form"
      description="Angular wraps the stepper in <code>&lt;oge-form-steps&gt;</code> and reads step completion from the form's own per-step error rollup. <code>&#64;oge-ui/forms</code> has no React layer yet (<code>docs/REACT-PARITY.md</code>), so the honest React idiom is the same shape one level down: <code>&#64;oge-ui/react-inputs</code> editors bound to your own state, with <code>completed</code> computed from it. The linear gate, the per-step error display and the “steps ahead stay quiet” behaviour are the stepper's, not the form's."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgeStepperConfigProvider']"
      heading="Configuration"
      description="Every user-facing string — including the two announced only to screen readers, because the indicator glyph is <code>aria-hidden</code> — lives in the messages interface, overridable for a subtree with <code>&lt;OgeStepperConfigProvider&gt;</code> or per instance with the <code>messages</code> prop."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactNavigationStepperDemos {
  protected readonly demos = NAVIGATION_STEPPER_DEMOS;

  protected readonly commands = () => createElement(CommandsDemo);
  protected readonly linear = () => createElement(LinearDemo);
  protected readonly guard = () => createElement(GuardDemo);
  protected readonly orientation = () => createElement(OrientationDemo);
  protected readonly navButtons = () => createElement(NavButtonsDemo);
  protected readonly form = () => createElement(FormDemo);

  protected readonly states = () =>
    createElement(OgeStepper, {
      activeIndex: 0,
      ariaLabel: 'Step states',
      steps: [
        { label: 'Active', description: 'the current step' },
        { label: 'Done', completed: true },
        { label: 'Error', completed: true, invalid: true },
        { label: 'Upcoming' },
      ],
    });

  protected readonly config = () =>
    createElement(
      OgeStepperConfigProvider,
      {
        config: {
          linear: true,
          messages: { next: 'İleri', previous: 'Geri', finish: 'Bitir' },
        },
      },
      createElement(OgeStepper, {
        activeIndex: 1,
        showNavigation: true,
        messages: { stepper: 'Adımlar' },
        steps: [{ label: 'Hesap', completed: true }, { label: 'Ödeme' }],
      }),
    );
}

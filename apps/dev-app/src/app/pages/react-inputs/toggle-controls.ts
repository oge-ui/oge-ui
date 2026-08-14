import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeCheckBox, OgeRadioGroup, OgeSwitch } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_TOGGLE_CONTROLS_DEMOS } from './toggle-controls-snippets';

/**
 * TOC of the React view — the same five sections as the Angular
 * toggle-controls page (`docs/REACT-PARITY.md`: pages mirror section for
 * section). The keyboard/accessibility notes are framework-agnostic and stay
 * single-sourced on the page itself.
 */
export const REACT_INPUTS_TOGGLE_CONTROLS_SECTIONS = [
  'Check Box',
  'Switch',
  'Radio Group',
  'Forms integration',
  'Keyboard & accessibility',
] as const;

interface DemoPlan {
  id: string;
  name: string;
  soldOut?: boolean;
}

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const PLANS: DemoPlan[] = [
  { id: 'starter', name: 'Starter' },
  { id: 'team', name: 'Team' },
  { id: 'scale', name: 'Scale (sold out)', soldOut: true },
  { id: 'enterprise', name: 'Enterprise' },
];

const FORM_PLANS: DemoPlan[] = [
  { id: 'free', name: 'Free' },
  { id: 'pro', name: 'Pro' },
];

/** Two- and three-state checkboxes — a real controlled React component. */
function CheckBoxDemo(): ReactNode {
  const [agreed, setAgreed] = useState<boolean | null>(false);
  const [all, setAll] = useState<boolean | null>(null);
  return row(
    createElement(
      OgeCheckBox,
      { key: 'agreed', value: agreed, onValueChange: setAgreed },
      'I agree to the terms',
    ),
    createElement(OgeCheckBox, {
      key: 'all',
      threeState: true,
      text: 'Select all',
      value: all,
      onValueChange: setAll,
    }),
    createElement(
      'div',
      { key: 'out', className: 'text-sm text-gray-500 dark:text-gray-400' },
      'select all: ',
      createElement(
        'code',
        null,
        all === null ? 'null (indeterminate)' : String(all),
      ),
    ),
  );
}

/** `role="switch"` buttons with localized track text. */
function SwitchDemo(): ReactNode {
  const [notify, setNotify] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [plain, setPlain] = useState(false);
  const [small, setSmall] = useState(true);
  return row(
    createElement(OgeSwitch, {
      key: 'notify',
      label: 'Notifications',
      value: notify,
      onValueChange: setNotify,
    }),
    createElement(OgeSwitch, {
      key: 'localized',
      label: 'Localized',
      onText: 'AÇIK',
      offText: 'KAPALI',
      value: enabled,
      onValueChange: setEnabled,
    }),
    createElement(OgeSwitch, {
      key: 'plain',
      label: 'Plain',
      onText: '',
      offText: '',
      value: plain,
      onValueChange: setPlain,
    }),
    createElement(OgeSwitch, {
      key: 'small',
      label: 'Small',
      size: 'sm',
      value: small,
      onValueChange: setSmall,
    }),
    createElement(OgeSwitch, {
      key: 'disabled',
      label: 'Disabled',
      disabled: true,
      value: true,
    }),
  );
}

/** WAI-ARIA radiogroup with roving tabindex, in both layouts. */
function RadioGroupDemo(): ReactNode {
  const [planId, setPlanId] = useState<unknown>('team');
  const [priority, setPriority] = useState<unknown>('Normal');
  return row(
    createElement(OgeRadioGroup<DemoPlan>, {
      key: 'plan',
      label: 'Plan',
      items: PLANS,
      displayExpr: 'name',
      valueExpr: 'id',
      disabledExpr: 'soldOut',
      value: planId,
      onValueChange: setPlanId,
    }),
    createElement(OgeRadioGroup<string>, {
      key: 'priority',
      label: 'Priority',
      layout: 'horizontal',
      items: ['Low', 'Normal', 'High'],
      value: priority,
      onValueChange: setPriority,
    }),
    createElement(
      'div',
      {
        key: 'out',
        className: 'pt-1 text-sm text-gray-500 dark:text-gray-400',
        'data-testid': 'plan-output',
      },
      'plan: ',
      createElement('code', null, String(planId ?? 'null')),
    ),
  );
}

/**
 * The React form integration point: one state object, three controlled
 * editors. A form library would hold the same values in its field objects.
 */
function ToggleFormDemo(): ReactNode {
  const [model, setModel] = useState<{
    terms: boolean;
    marketing: boolean;
    plan: unknown;
  }>({ terms: false, marketing: false, plan: 'free' });
  return createElement(
    'form',
    {
      className: 'demo-row demo-row-start',
      onSubmit: (event: { preventDefault(): void }) => event.preventDefault(),
    },
    createElement(
      OgeCheckBox,
      {
        key: 'terms',
        value: model.terms,
        onValueChange: (value: boolean | null) =>
          setModel({ ...model, terms: value === true }),
      },
      'Accept terms',
    ),
    createElement(OgeSwitch, {
      key: 'marketing',
      label: 'Marketing',
      value: model.marketing,
      onValueChange: (marketing: boolean) => setModel({ ...model, marketing }),
    }),
    createElement(OgeRadioGroup<DemoPlan>, {
      key: 'plan',
      label: 'Plan',
      items: FORM_PLANS,
      displayExpr: 'name',
      valueExpr: 'id',
      value: model.plan,
      onValueChange: (plan: unknown) => setModel({ ...model, plan }),
    }),
    createElement(
      'div',
      { key: 'out', className: 'text-sm text-gray-500 dark:text-gray-400' },
      'model: ',
      createElement('code', null, JSON.stringify(model)),
    ),
  );
}

/**
 * The React half of the toggle-controls page — the same demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/inputs/toggle-controls` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-toggle-controls-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React controls carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      heading="Check Box"
      description="A real (visually hidden) native checkbox drives semantics — label clicks, <kbd>Space</kbd> and <code>aria-checked='mixed'</code> come for free. <code>value</code> is <code>boolean | null</code>: <code>null</code> always renders the indeterminate dash, and <code>threeState</code> lets users cycle into it."
      [chips]="['boolean | null', 'threeState', 'indeterminate']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="checkbox" />
    </app-demo-card>

    <app-demo-card
      heading="Switch"
      description="A native <code>&amp;lt;button role='switch'&amp;gt;</code> with <code>aria-checked</code> and a sliding thumb. Track texts default to the localized <code>switchOn</code>/<code>switchOff</code> messages ('ON'/'OFF'); override per instance or pass empty strings to hide them. The reference swipe gesture is deliberately not replicated."
      [chips]="['role=switch', 'onText / offText', 'messages']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="switchDemo" />
    </app-demo-card>

    <app-demo-card
      heading="Radio Group"
      description="Flat items with <code>displayExpr</code>/<code>valueExpr</code>/<code>disabledExpr</code>; <code>layout</code> switches column/row. Arrows move focus <em>and</em> selection (wrapping, disabled skipped, RTL-aware) per the WAI-ARIA radio-group pattern."
      [chips]="['displayExpr / valueExpr', 'layout', 'roving tabindex']"
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="radio" />
    </app-demo-card>

    <app-demo-card
      heading="Forms integration"
      description="React has no <code>formField</code>/<code>formControl</code> binding — <strong>the controlled pair is the integration point</strong>. All three controls are the same controlled/uncontrolled pair (<code>value</code> + <code>onValueChange</code>, or <code>defaultValue</code> alone), so any form layer binds them by holding the value: <code>useState</code> here, a field object with React Hook Form, Formik or TanStack Form. <code>onValueCommitted</code> carries <code>previousValue</code> and the originating event for cross-field rules."
      [chips]="['controlled pair', 'defaultValue', 'onValueCommitted']"
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="forms" />
    </app-demo-card>
  `,
})
export class ReactInputsToggleControlsDemos {
  protected readonly demos = INPUTS_TOGGLE_CONTROLS_DEMOS;

  protected readonly checkbox = () => createElement(CheckBoxDemo);
  protected readonly switchDemo = () => createElement(SwitchDemo);
  protected readonly radio = () => createElement(RadioGroupDemo);
  protected readonly forms = () => createElement(ToggleFormDemo);
}

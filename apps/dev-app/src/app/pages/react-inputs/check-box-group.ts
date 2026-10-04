import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeCheckBoxGroup } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_CHECK_BOX_GROUP_DEMOS } from './check-box-group-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_CHECK_BOX_GROUP_SECTIONS = [
  'Getting started',
  'Select all',
  'Layouts',
  'Inside a form',
] as const;

interface Channel {
  id: string;
  name: string;
  locked?: boolean;
}

const CHANNELS: Channel[] = [
  { id: 'mail', name: 'E-mail' },
  { id: 'sms', name: 'SMS' },
  { id: 'push', name: 'Push (always on)', locked: true },
  { id: 'call', name: 'Phone call' },
];
const EXPORT_COLUMNS = ['Name', 'E-mail', 'City', 'Country', 'Phone'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TOPPINGS = ['Basil', 'Olives', 'Mushrooms', 'Peppers', 'Onion', 'Ham'];
const INTERESTS = ['Design', 'Engineering', 'Product', 'Sales'];

function GroupDemo(): ReactNode {
  const [notify, setNotify] = useState<readonly unknown[]>(['mail', 'push']);
  return createElement(
    'div',
    null,
    createElement(OgeCheckBoxGroup<Channel>, {
      key: 'group',
      label: 'Notify me by',
      hint: 'We never share your details.',
      items: CHANNELS,
      displayExpr: 'name',
      valueExpr: 'id',
      disabledExpr: 'locked',
      value: notify,
      onValueChange: setNotify,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement(
        'code',
        { 'data-testid': 'group-value' },
        JSON.stringify(notify),
      ),
    ),
  );
}

function GroupSelectAllDemo(): ReactNode {
  const [picked, setPicked] = useState<readonly unknown[]>(['Name', 'City']);
  return createElement(OgeCheckBoxGroup<string>, {
    label: 'Columns to export',
    items: EXPORT_COLUMNS,
    showSelectAll: true,
    value: picked,
    onValueChange: setPicked,
  });
}

function GroupLayoutDemo(): ReactNode {
  const [workDays, setWorkDays] = useState<readonly unknown[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ]);
  const [pizza, setPizza] = useState<readonly unknown[]>(['Basil']);
  return createElement(
    'div',
    { className: 'flex flex-col gap-6' },
    createElement(OgeCheckBoxGroup<string>, {
      key: 'days',
      label: 'Days',
      layout: 'horizontal',
      items: DAYS,
      value: workDays,
      onValueChange: setWorkDays,
    }),
    createElement(OgeCheckBoxGroup<string>, {
      key: 'toppings',
      label: 'Toppings',
      layout: 'columns',
      columns: 3,
      items: TOPPINGS,
      value: pizza,
      onValueChange: setPizza,
    }),
  );
}

function GroupFormDemo(): ReactNode {
  const [value, setValue] = useState<readonly unknown[]>([]);
  const [touched, setTouched] = useState(false);
  return createElement(OgeCheckBoxGroup<string>, {
    label: 'Interests',
    items: INTERESTS,
    required: true,
    value,
    onValueChange: setValue,
    touched,
    onBlur: () => setTouched(true),
    errors: value.length
      ? []
      : [{ kind: 'required', message: 'Pick at least one interest' }],
  });
}

/**
 * The React half of the check box group page — the same demo sections as the
 * Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-check-box-group-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['items', 'valueExpr', 'disabledExpr', 'hint']"
      heading="Getting started"
      description="<code>displayExpr</code> / <code>valueExpr</code> / <code>disabledExpr</code> are the select box vocabulary. The value is the array of checked <code>valueExpr</code> results <strong>in items order</strong>; disabled items keep their state."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showSelectAll', 'tri-state', 'selectAll()']"
      heading="Select all"
      description="<code>showSelectAll</code> adds a tri-state box over the <em>enabled</em> items — checked, mixed or unchecked; from mixed it selects all. The handle's <code>selectAll()</code> / <code>unselectAll()</code> do the same from code."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="selectAll" />
    </app-demo-card>

    <app-demo-card
      [chips]="['vertical', 'horizontal', 'columns']"
      heading="Layouts"
      description="<code>layout: 'vertical' | 'horizontal' | 'columns'</code> — a column, a wrapping row, or a CSS grid of <code>columns</code> columns."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="layouts" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled pair', 'errors', 'touched']"
      heading="Inside a form"
      description="React has no <code>formField</code> binding — <strong>the controlled pair is the integration point</strong>: derive “at least one” in your form layer and pass <code>errors</code> and <code>touched</code> back; the group renders the message in its subscript."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsCheckBoxGroupDemos {
  protected readonly demos = INPUTS_CHECK_BOX_GROUP_DEMOS;

  protected readonly basic = () => createElement(GroupDemo);
  protected readonly selectAll = () => createElement(GroupSelectAllDemo);
  protected readonly layouts = () => createElement(GroupLayoutDemo);
  protected readonly form = () => createElement(GroupFormDemo);
}

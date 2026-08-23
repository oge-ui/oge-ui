import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import {
  OgeForm,
  type OgeFormHandle,
  type OgeFormItemDefinition,
} from '@oge-ui/react-forms';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { FORMS_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same seven sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_FORMS_OVERVIEW_SECTIONS = [
  'Declarative items',
  'Data-driven items',
  'Editor selection',
  'Groups',
  'Label placement',
  'Template slots',
  'Actions & submit',
] as const;

/**
 * `OgeForm` is generic in its model, and `createElement` cannot infer that
 * generic from a props object — so every demo instantiates it explicitly
 * (`OgeForm<Employee>`). In a JSX app, which is what the snippets show, the
 * inference works and no annotation is needed.
 */
interface Employee {
  firstName: string;
  lastName: string;
  email: string;
  notes: string;
}
interface Order {
  reference: string;
  quantity: number;
  priority: string;
  shipped: boolean;
}
interface Profile {
  name: string;
  age: number;
  birthday: Date;
  active: boolean;
  team: string;
  bio: string;
}
interface Account {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}
interface Settings {
  host: string;
  port: number;
  secure: boolean;
}
interface Ticket {
  title: string;
  rating: number;
}
interface Signup {
  email: string;
  password: string;
}

const note = (text: ReactNode) =>
  createElement('p', { className: 'mt-2 text-sm opacity-70' }, text);

/** The `layout` array in place of projected `<oge-form-item>` children. */
function DeclarativeItemsDemo(): ReactNode {
  const [employee, setEmployee] = useState({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: '',
    notes: '',
  });
  return createElement(
    'div',
    null,
    createElement(OgeForm<Employee>, {
      formData: employee,
      onFormDataChange: setEmployee,
      colCount: 2,
      layout: [
        { field: 'firstName', label: 'First name', isRequired: true },
        { field: 'lastName', label: 'Last name' },
        { field: 'email', label: 'E-mail', hint: 'We never share it.' },
        { field: 'notes', editorType: 'textArea', colSpan: 2 },
      ],
    }),
    note(`formData → ${employee.firstName} ${employee.lastName}`),
  );
}

const ORDER_FIELDS: OgeFormItemDefinition[] = [
  { field: 'reference', label: 'Reference', isRequired: true },
  { field: 'quantity', label: 'Quantity', editorOptions: { min: 1, max: 99 } },
  {
    field: 'priority',
    label: 'Priority',
    editorOptions: { items: ['low', 'normal', 'high'] },
  },
  { field: 'shipped', label: 'Shipped', dataType: 'boolean' },
];

/** The same item model as data — `items` renders after the layout tree. */
function ItemsDemo(): ReactNode {
  const [order, setOrder] = useState({
    reference: '',
    quantity: 1,
    priority: 'normal',
    shipped: false,
  });
  return createElement(OgeForm<Order>, {
    formData: order,
    onFormDataChange: setOrder,
    items: ORDER_FIELDS,
    colCount: 2,
  });
}

const TEAMS = ['Platform', 'Design', 'Support'];

/** Inference: model value → dataType → editor, each beaten by the next. */
function EditorSelectionDemo(): ReactNode {
  const [profile, setProfile] = useState({
    name: 'Grace',
    age: 45,
    birthday: new Date(1980, 4, 12),
    active: true,
    team: 'Platform',
    bio: '',
  });
  return createElement(OgeForm<Profile>, {
    formData: profile,
    onFormDataChange: setProfile,
    colCount: 2,
    layout: [
      { field: 'name', label: 'Name' },
      { field: 'age', label: 'Age' },
      { field: 'birthday', label: 'Birthday' },
      { field: 'active', label: 'Active' },
      { field: 'team', label: 'Team', editorOptions: { items: TEAMS } },
      { field: 'bio', label: 'Bio', editorType: 'textArea', colSpan: 2 },
    ],
  });
}

/** Groups are real fieldsets, and they nest. */
function GroupsDemo(): ReactNode {
  const [account, setAccount] = useState({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '',
    address: '',
  });
  return createElement(OgeForm<Account>, {
    formData: account,
    onFormDataChange: setAccount,
    colCount: 2,
    layout: [
      {
        caption: 'Identity',
        colCount: 2,
        children: [
          { field: 'firstName', label: 'First name' },
          { field: 'lastName', label: 'Last name' },
        ],
      },
      {
        caption: 'Contact',
        colCount: 2,
        children: [
          { field: 'email', label: 'E-mail' },
          { field: 'phone', label: 'Phone' },
          { field: 'address', label: 'Address', colSpan: 2 },
        ],
      },
    ],
  });
}

/** Side labels: the form draws the `<label htmlFor>` in its own column. */
function LabelPlacementDemo(): ReactNode {
  const [settings, setSettings] = useState({
    host: 'localhost',
    port: 5432,
    secure: true,
  });
  return createElement(OgeForm<Settings>, {
    formData: settings,
    onFormDataChange: setSettings,
    labelLocation: 'start',
    alignItemLabels: true,
    showColonAfterLabel: true,
    colCount: 1,
    layout: [
      { field: 'host', label: 'Host', isRequired: true },
      { field: 'port', label: 'Port' },
      { field: 'secure', label: 'Use TLS' },
    ],
  });
}

/** `renderLabel` + `renderEditor` on one item — the chrome stays put. */
function RenderPropsDemo(): ReactNode {
  const [ticket, setTicket] = useState({ title: '', rating: 3 });
  return createElement(OgeForm<Ticket>, {
    formData: ticket,
    onFormDataChange: setTicket,
    labelLocation: 'start',
    colCount: 1,
    layout: [
      { field: 'title', label: 'Title', isRequired: true },
      {
        field: 'rating',
        label: 'Rating',
        renderLabel: ({ label }) => createElement('em', null, label),
        renderEditor: ({ editorId, value, setValue }) =>
          createElement(
            'span',
            null,
            createElement('input', {
              type: 'range',
              min: 1,
              max: 5,
              id: editorId,
              value: Number(value),
              onChange: (event: ChangeEvent<HTMLInputElement>) =>
                setValue(Number(event.target.value)),
            }),
            createElement(
              'span',
              { className: 'ml-2 text-sm' },
              `${Number(value)} / 5`,
            ),
          ),
      },
    ],
  });
}

/** The `actions` slot, the submit pipeline and the handle's `reset()`. */
function ActionsDemo(): ReactNode {
  const form = useRef<OgeFormHandle<{ email: string; password: string }>>(null);
  const [signup, setSignup] = useState({ email: '', password: '' });
  const [saved, setSaved] = useState(false);
  return createElement(
    'div',
    null,
    createElement(OgeForm<Signup>, {
      ref: form,
      formData: signup,
      onFormDataChange: setSignup,
      showValidationSummary: true,
      onSubmitted: () => setSaved(true),
      layout: [
        { field: 'email', label: 'E-mail', isRequired: true },
        { field: 'password', label: 'Password', isRequired: true },
      ],
      actions: createElement(
        'span',
        { className: 'flex gap-2' },
        createElement(OgeButton, {
          text: 'Create',
          stylingMode: 'contained',
          useSubmitBehavior: true,
        }),
        createElement(OgeButton, {
          text: 'Reset',
          onClick: () => form.current?.reset(),
        }),
      ),
    }),
    saved ? note('submitted → account created') : null,
  );
}

/**
 * The React demo cards of the forms overview, rendered inside
 * `/components/forms` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-forms-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-demo-card
      [chips]="['formData', 'field', 'label', 'colSpan', 'hint']"
      heading="Declarative items"
      description="Each layout entry names a model property through <code>field</code>. Dot-notation reaches nested objects. <code>colSpan</code> widens an item across the layout columns, and <code>hint</code> lands in the editor's own subscript so nothing shifts when an error replaces it."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="declarative" />
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'editorOptions', 'dataType']"
      heading="Data-driven items"
      description="The same item model as an array — useful when the fields come from a server. Entries render after the <code>layout</code> tree, and <code>visibleIndex</code> reorders both sources together."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="items" />
    </app-demo-card>

    <app-demo-card
      [chips]="['dataType', 'editorType', 'editorOptions.items']"
      heading="Editor selection"
      description="With no <code>editorType</code>, the editor follows <code>dataType</code> — and <code>dataType</code> itself is inferred from the current model value. An <code>editorOptions.items</code> list beats the inferred type (a select box), and an explicit <code>editorType</code> beats everything. Anything richer than the curated options belongs in a render prop, not in a reflective options bag."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="editors" />
    </app-demo-card>

    <app-demo-card
      [chips]="['caption', 'children', 'colCount']"
      heading="Groups"
      description="A group renders a real <code>&amp;lt;fieldset&amp;gt;</code> with the caption as its <code>&amp;lt;legend&amp;gt;</code> — the markup screen readers expect for a labelled section — and carries its own column count. Groups nest."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="groups" />
    </app-demo-card>

    <app-demo-card
      [chips]="['labelLocation', 'alignItemLabels', 'showColonAfterLabel']"
      heading="Label placement"
      description="<code>labelLocation: 'top'</code> keeps each editor's own label chrome. <code>'start'</code> and <code>'end'</code> hand the label to the form, which draws a real <code>&amp;lt;label htmlFor&amp;gt;</code> in its own column — <code>alignItemLabels</code> gives every row the same label width so the editors line up."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="labels" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderItem', 'renderEditor', 'renderLabel']"
      heading="Template slots"
      description="Four render props, each legal on <code>&amp;lt;OgeForm&amp;gt;</code> (applies to every item) or on a single item definition (applies to that one, and wins). <code>renderEditor</code> replaces only the control and keeps the label, required mark and error text — the context hands you <code>editorId</code> so your control keeps the <code>&amp;lt;label htmlFor&amp;gt;</code> association, and <code>setValue</code> so it writes back into the model. <code>renderItem</code> replaces the whole field, and <code>renderGroupCaption</code> replaces a legend's content."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
    </app-demo-card>

    <app-demo-card
      [chips]="['actions', 'onSubmitted', 'reset()']"
      heading="Actions &amp; submit"
      description="Pass the buttons to the <code>actions</code> prop. Submitting marks every field touched, runs validation, fires the cancelable <code>onSubmitting</code> and — only if both pass — <code>onSubmitted</code>. A failed submit reveals the summary and moves focus to the first invalid field."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="actions" />
    </app-demo-card>
  `,
})
export class ReactFormsOverviewDemos {
  protected readonly demos = FORMS_OVERVIEW_DEMOS;

  protected readonly declarative = () => createElement(DeclarativeItemsDemo);
  protected readonly items = () => createElement(ItemsDemo);
  protected readonly editors = () => createElement(EditorSelectionDemo);
  protected readonly groups = () => createElement(GroupsDemo);
  protected readonly labels = () => createElement(LabelPlacementDemo);
  protected readonly templates = () => createElement(RenderPropsDemo);
  protected readonly actions = () => createElement(ActionsDemo);
}

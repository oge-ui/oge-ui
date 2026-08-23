import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeForm,
  type OgeFormHandle,
  type OgeFormItemDefinition,
} from '@oge-ui/react-forms';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { FORMS_LAYOUT_DEMOS } from './layout-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular layout page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_FORMS_LAYOUT_SECTIONS = [
  'Fixed columns',
  'Auto-fit columns',
  'Responsive by container',
  'Nested groups',
  'Tab sections',
  'Accordion sections',
  'Read-only & disabled',
  'Visibility & order',
] as const;

// `createElement` cannot infer OgeForm's model generic from a props object, so
// each demo instantiates it explicitly. JSX — what the snippets show — infers.
interface Record_ {
  code: string;
  name: string;
  owner: string;
  summary: string;
}
interface Server {
  host: string;
  port: number;
  user: string;
  database: string;
}
interface Company {
  name: string;
  taxId: string;
  employees: number;
  street: string;
  city: string;
  postalCode: string;
}
interface Employee {
  firstName: string;
  lastName: string;
  title: string;
  salary: number;
}
interface Invoice {
  number: string;
  total: number;
  comment: string;
}
interface Shipment {
  carrier: string;
  reference: string;
  trackingNumber: string;
}

const SERVER_FIELDS: OgeFormItemDefinition[] = [
  { field: 'host', label: 'Host' },
  { field: 'port', label: 'Port' },
  { field: 'user', label: 'User' },
  { field: 'database', label: 'Database' },
];

const useServer = () =>
  useState<Server>({
    host: 'db.internal',
    port: 5432,
    user: 'postgres',
    database: 'oge',
  });

const useEmployee = () =>
  useState<Employee>({
    firstName: 'Ada',
    lastName: 'Lovelace',
    title: '',
    salary: 120000,
  });

/** A numeric `colCount`, with `colSpan` clamped to the count in force. */
function FixedColumnsDemo(): ReactNode {
  const [columns, setColumns] = useState(3);
  const [record, setRecord] = useState<Record_>({
    code: 'OGE-1',
    name: 'Form layout',
    owner: 'Ada',
    summary: '',
  });
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex items-center gap-2 text-sm' },
      createElement('span', null, 'columns:'),
      ...[1, 2, 3].map((n) =>
        createElement(
          'button',
          {
            key: n,
            type: 'button',
            className: `rounded border px-2 py-0.5 ${
              columns === n ? 'font-semibold' : ''
            }`,
            onClick: () => setColumns(n),
          },
          String(n),
        ),
      ),
    ),
    createElement(OgeForm<Record_>, {
      formData: record,
      onFormDataChange: setRecord,
      colCount: columns,
      layout: [
        { field: 'code', label: 'Code' },
        { field: 'name', label: 'Name' },
        { field: 'owner', label: 'Owner' },
        { field: 'summary', label: 'Summary', colSpan: columns },
      ],
    }),
  );
}

/** `colCount: 'auto'` — as many `minColWidth` tracks as the form is wide. */
function AutoFitDemo(): ReactNode {
  const [server, setServer] = useServer();
  return createElement(OgeForm<Server>, {
    formData: server,
    onFormDataChange: setServer,
    items: SERVER_FIELDS,
    colCount: 'auto',
    minColWidth: 260,
  });
}

/** Explicit counts per container-query breakpoint. */
function BreakpointsDemo(): ReactNode {
  const [server, setServer] = useServer();
  return createElement(OgeForm<Server>, {
    formData: server,
    onFormDataChange: setServer,
    items: SERVER_FIELDS,
    colCountByScreen: { xs: 1, sm: 2, md: 3, lg: 4 },
  });
}

/** Nested fieldsets, each with its own column count. */
function NestedGroupsDemo(): ReactNode {
  const [company, setCompany] = useState<Company>({
    name: 'OGE UI',
    taxId: '',
    employees: 12,
    street: '',
    city: '',
    postalCode: '',
  });
  return createElement(OgeForm<Company>, {
    formData: company,
    onFormDataChange: setCompany,
    colCount: 2,
    layout: [
      {
        caption: 'Company',
        colCount: 2,
        children: [
          { field: 'name', label: 'Name', colSpan: 2 },
          { field: 'taxId', label: 'Tax id' },
          { field: 'employees', label: 'Employees' },
          {
            caption: 'Billing address',
            colCount: 2,
            children: [
              { field: 'street', label: 'Street', colSpan: 2 },
              { field: 'city', label: 'City' },
              { field: 'postalCode', label: 'Postal code' },
            ],
          },
        ],
      },
    ],
  });
}

const submitButton = (onClick: () => void) =>
  createElement(
    'button',
    {
      type: 'button',
      className: 'mt-3 rounded border px-2 py-1 text-sm',
      onClick,
    },
    'Submit (Title is empty)',
  );

/** One tab per group, with error badges and reveal-before-focus. */
function TabSectionsDemo(): ReactNode {
  const [employee, setEmployee] = useEmployee();
  const form = useRef<OgeFormHandle<Employee>>(null);
  return createElement(
    'div',
    null,
    createElement(OgeForm<Employee>, {
      ref: form,
      formData: employee,
      onFormDataChange: setEmployee,
      showValidationSummary: true,
      layout: [
        {
          kind: 'tabs',
          children: [
            {
              caption: 'Personal',
              colCount: 2,
              children: [
                { field: 'firstName', label: 'First name' },
                { field: 'lastName', label: 'Last name' },
              ],
            },
            {
              caption: 'Employment',
              colCount: 2,
              children: [
                { field: 'title', label: 'Title', isRequired: true },
                { field: 'salary', label: 'Salary' },
              ],
            },
          ],
        },
      ],
    }),
    submitButton(() => void form.current?.submit()),
  );
}

/** The same over the accordion, whose invalid indicator the form drives. */
function AccordionSectionsDemo(): ReactNode {
  const [employee, setEmployee] = useEmployee();
  const form = useRef<OgeFormHandle<Employee>>(null);
  return createElement(
    'div',
    null,
    createElement(OgeForm<Employee>, {
      ref: form,
      formData: employee,
      onFormDataChange: setEmployee,
      scrollToFirstInvalid: false,
      layout: [
        {
          kind: 'accordion',
          children: [
            {
              caption: 'Personal',
              children: [{ field: 'firstName', label: 'First name' }],
            },
            {
              caption: 'Employment',
              children: [{ field: 'title', label: 'Title', isRequired: true }],
            },
          ],
        },
      ],
    }),
    submitButton(() => void form.current?.submit()),
  );
}

/** Form-level state falling through to the item, and an item opting out. */
function ReadOnlyDemo(): ReactNode {
  const [locked, setLocked] = useState(true);
  const [archived, setArchived] = useState(false);
  const [invoice, setInvoice] = useState<Invoice>({
    number: 'INV-204',
    total: 1290,
    comment: '',
  });
  const toggle = (
    label: string,
    checked: boolean,
    onChange: () => void,
  ): ReactNode =>
    createElement(
      'label',
      { key: label, className: 'flex items-center gap-1' },
      createElement('input', { type: 'checkbox', checked, onChange }),
      label,
    );
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex gap-3 text-sm' },
      toggle('readOnly', locked, () => setLocked((value) => !value)),
      toggle('disabled', archived, () => setArchived((value) => !value)),
    ),
    createElement(OgeForm<Invoice>, {
      formData: invoice,
      onFormDataChange: setInvoice,
      readOnly: locked,
      disabled: archived,
      colCount: 2,
      layout: [
        { field: 'number', label: 'Number' },
        { field: 'total', label: 'Total' },
        { field: 'comment', label: 'Comment', readOnly: false },
      ],
    }),
  );
}

/** `visible` drops an item outright; `visibleIndex` pulls one forward. */
function VisibilityDemo(): ReactNode {
  const [shipment, setShipment] = useState<Shipment>({
    carrier: 'DHL',
    reference: 'REF-9',
    trackingNumber: '',
  });
  return createElement(OgeForm<Shipment>, {
    formData: shipment,
    onFormDataChange: setShipment,
    colCount: 2,
    layout: [
      { field: 'carrier', label: 'Carrier', visibleIndex: 1 },
      { field: 'reference', label: 'Reference', visibleIndex: 0 },
      {
        field: 'trackingNumber',
        label: 'Tracking number',
        visible: shipment.carrier !== '',
      },
    ],
  });
}

/**
 * The React demo cards of the form-layout page, rendered inside
 * `/components/forms/layout` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-forms-layout-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-demo-card
      [chips]="['colCount', 'colSpan']"
      heading="Fixed columns"
      description="A numeric <code>colCount</code> produces <code>repeat(n, minmax(0, 1fr))</code>. An item's <code>colSpan</code> is clamped to the count in force, so a span of 4 in a 2-column form spans 2 rather than overflowing."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="fixed" />
    </app-demo-card>

    <app-demo-card
      [chips]="['colCount=auto', 'minColWidth']"
      heading="Auto-fit columns"
      description="The default. <code>repeat(auto-fit, minmax(minColWidth, 1fr))</code> fits as many columns as the form is wide, with no breakpoints to maintain. Resize the browser — or the card — and the count follows."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="auto" />
    </app-demo-card>

    <app-demo-card
      [chips]="['colCountByScreen', '&#64;container']"
      heading="Responsive by container"
      description="Explicit counts per breakpoint when auto-fit is not precise enough. The breakpoints are container queries on the form itself — <code>xs</code> under 480px, then 480 / 720 / 960 / 1200 — so the same form nested in a narrow panel behaves like a phone layout even on a wide screen."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="breakpoints" />
    </app-demo-card>

    <app-demo-card
      [chips]="['nested groups', 'legend', 'group colCount']"
      heading="Nested groups"
      description="Groups nest as nested fieldsets, each with its own column count. That is the structure assistive technology reads as “this block of fields belongs together”, and it is why the group is a real fieldset rather than a styled div."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="nested" />
    </app-demo-card>

    <app-demo-card
      [chips]="['kind: tabs', 'error badges', 'focus reveal']"
      heading="Tab sections"
      description="A <code>&#123; kind: 'tabs' &#125;</code> node turns each child group into a tab, its caption the tab text. The strip, its keyboard handling and its overflow come from <code>&#64;oge-ui/react-tabs</code> — none of it is re-implemented. A tab holding invalid fields gets a count badge, and a failed submit selects that tab before focusing the field."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="tabs" />
    </app-demo-card>

    <app-demo-card
      [chips]="['kind: accordion', 'invalid sections']"
      heading="Accordion sections"
      description="The same idea over <code>&#64;oge-ui/react-layout</code>. A panel holding an invalid field gets the accordion's own invalid indicator — the danger rail, the dot and its screen-reader label — and a failed submit expands it."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="accordion" />
    </app-demo-card>

    <app-demo-card
      [chips]="['readOnly', 'disabled', 'per-item override']"
      heading="Read-only &amp; disabled"
      description="Form-level <code>disabled</code> wraps the fields in a <code>&amp;lt;fieldset disabled&amp;gt;</code>; <code>readOnly</code> forwards to every editor. Both fall through group level to item level, and an item may opt out."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="readOnly" />
    </app-demo-card>

    <app-demo-card
      [chips]="['visible', 'visibleIndex']"
      heading="Visibility &amp; order"
      description="<code>visible</code> drops an item from the layout entirely — no hidden input, no stale value in the DOM. <code>visibleIndex</code> pulls items to the front in index order; everything without one keeps its declaration order behind them."
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="visibility" />
    </app-demo-card>
  `,
})
export class ReactFormsLayoutDemos {
  protected readonly demos = FORMS_LAYOUT_DEMOS;

  protected readonly fixed = () => createElement(FixedColumnsDemo);
  protected readonly auto = () => createElement(AutoFitDemo);
  protected readonly breakpoints = () => createElement(BreakpointsDemo);
  protected readonly nested = () => createElement(NestedGroupsDemo);
  protected readonly tabs = () => createElement(TabSectionsDemo);
  protected readonly accordion = () => createElement(AccordionSectionsDemo);
  protected readonly readOnly = () => createElement(ReadOnlyDemo);
  protected readonly visibility = () => createElement(VisibilityDemo);
}

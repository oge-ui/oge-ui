import { demoSource } from '../../shared/demo-source';

export const COLCOUNT_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  template: `<oge-form [(formData)]="record" [colCount]="columns()">
  <oge-form-item field="code" label="Code" />
  <oge-form-item field="name" label="Name" />
  <oge-form-item field="owner" label="Owner" />
  <oge-form-item field="summary" label="Summary" [colSpan]="columns()" />
</oge-form>`,
  body: `protected readonly columns = signal(3);

protected readonly record = signal({
  code: 'OGE-1',
  name: 'Form layout',
  owner: 'Ada',
  summary: '',
});`,
});

export const AUTO_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm'] },
  types: { '@oge-ui/forms': ['OgeFormItemData'] },
  template: `<!-- the default: as many 260px columns as the FORM is wide -->
<oge-form
  [(formData)]="server"
  [items]="fields"
  colCount="auto"
  [minColWidth]="260"
/>`,
  body: `protected readonly server = signal({
  host: 'db.internal',
  port: 5432,
  user: 'postgres',
  database: 'oge',
});

protected readonly fields: OgeFormItemData[] = [
  { field: 'host', label: 'Host' },
  { field: 'port', label: 'Port' },
  { field: 'user', label: 'User' },
  { field: 'database', label: 'Database' },
];`,
});

export const BREAKPOINT_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm'] },
  types: { '@oge-ui/forms': ['OgeFormItemData'] },
  template: `<!-- keyed to the form's own width, not the window's, so this
     works identically inside a dialog, a drawer or a grid cell -->
<oge-form
  [(formData)]="server"
  [items]="fields"
  [colCountByScreen]="{ xs: 1, sm: 2, md: 3, lg: 4 }"
/>`,
  body: `protected readonly server = signal({
  host: 'db.internal',
  port: 5432,
  user: 'postgres',
  database: 'oge',
});

protected readonly fields: OgeFormItemData[] = [
  { field: 'host', label: 'Host' },
  { field: 'port', label: 'Port' },
  { field: 'user', label: 'User' },
  { field: 'database', label: 'Database' },
];`,
});

export const NESTED_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormGroup', 'OgeFormItem'] },
  template: `<oge-form [(formData)]="company" [colCount]="2">
  <oge-form-group caption="Company" [colCount]="2">
    <oge-form-item field="name" label="Name" [colSpan]="2" />
    <oge-form-item field="taxId" label="Tax id" />
    <oge-form-item field="employees" label="Employees" />

    <oge-form-group caption="Billing address" [colCount]="2">
      <oge-form-item field="street" label="Street" [colSpan]="2" />
      <oge-form-item field="city" label="City" />
      <oge-form-item field="postalCode" label="Postal code" />
    </oge-form-group>
  </oge-form-group>
</oge-form>`,
  body: `protected readonly company = signal({
  name: 'OGE UI',
  taxId: '',
  employees: 12,
  street: '',
  city: '',
  postalCode: '',
});`,
});

export const READONLY_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  template: `<oge-form
  [(formData)]="invoice"
  [readOnly]="locked()"
  [disabled]="archived()"
  [colCount]="2"
>
  <oge-form-item field="number" label="Number" />
  <oge-form-item field="total" label="Total" />
  <!-- an item may always opt out of the form-level state -->
  <oge-form-item field="comment" label="Comment" [readOnly]="false" />
</oge-form>`,
  body: `protected readonly locked = signal(true);
protected readonly archived = signal(false);

protected readonly invoice = signal({
  number: 'INV-204',
  total: 1290,
  comment: '',
});`,
});

export const VISIBILITY_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  template: `<oge-form [(formData)]="shipment" [colCount]="2">
  <oge-form-item field="carrier" label="Carrier" [visibleIndex]="1" />
  <oge-form-item field="reference" label="Reference" [visibleIndex]="0" />
  <oge-form-item
    field="trackingNumber"
    label="Tracking number"
    [visible]="shipment().carrier !== ''"
  />
</oge-form>`,
  body: `protected readonly shipment = signal({
  carrier: 'DHL',
  reference: 'REF-9',
  trackingNumber: '',
});`,
});

export const SECTIONS_SNIPPET = demoSource({
  use: {
    '@oge-ui/forms': ['OgeForm', 'OgeFormGroup', 'OgeFormItem', 'OgeFormTabs'],
  },
  template: `<!-- one tab per group; the tab strip, its keyboard handling and its
     overflow come from @oge-ui/tabs, not from a copy of it -->
<oge-form [(formData)]="employee" [showValidationSummary]="true">
  <oge-form-tabs>
    <oge-form-group caption="Personal" [colCount]="2">
      <oge-form-item field="firstName" label="First name" />
      <oge-form-item field="lastName" label="Last name" />
    </oge-form-group>
    <oge-form-group caption="Employment" [colCount]="2">
      <oge-form-item field="title" label="Title" [isRequired]="true" />
      <oge-form-item field="salary" label="Salary" />
    </oge-form-group>
  </oge-form-tabs>
</oge-form>`,
  body: `protected readonly employee = signal({
  firstName: 'Ada',
  lastName: 'Lovelace',
  title: '',
  salary: 120000,
});`,
});

export const ACCORDION_SECTION_SNIPPET = demoSource({
  use: {
    '@oge-ui/forms': [
      'OgeForm',
      'OgeFormAccordion',
      'OgeFormGroup',
      'OgeFormItem',
    ],
  },
  template: `<oge-form [(formData)]="employee">
  <oge-form-accordion [expandedKeys]="[]">
    <oge-form-group caption="Personal">
      <oge-form-item field="firstName" label="First name" />
    </oge-form-group>
    <oge-form-group caption="Employment">
      <oge-form-item field="title" label="Title" [isRequired]="true" />
    </oge-form-group>
  </oge-form-accordion>
</oge-form>`,
  body: `protected readonly employee = signal({
  firstName: 'Ada',
  lastName: 'Lovelace',
  title: '',
  salary: 120000,
});`,
});

import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeCheckBoxGroup'] },
  template: `<!-- One real check box per item (native semantics, its own Tab stop —
     the APG checkbox group) inside a role="group" named by the label. The
     value is the ARRAY of checked valueExpr results, in items order however
     the user clicked. Disabled items keep their state. -->
<oge-check-box-group
  label="Notify me by"
  hint="We never share your details."
  [items]="channels"
  displayExpr="name"
  valueExpr="id"
  disabledExpr="locked"
  [(value)]="notify"
/>`,
  body: `protected readonly channels = [
  { id: 'mail', name: 'E-mail' },
  { id: 'sms', name: 'SMS' },
  { id: 'push', name: 'Push (always on)', locked: true },
  { id: 'call', name: 'Phone call' },
];
protected readonly notify = signal<readonly unknown[]>(['mail', 'push']);`,
});

export const SELECT_ALL_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeCheckBoxGroup'] },
  template: `<!-- showSelectAll: a tri-state box over the ENABLED items — checked,
     mixed or unchecked; from mixed it selects all. selectAll() /
     unselectAll() do the same from code. -->
<oge-check-box-group
  label="Columns to export"
  [items]="columns"
  [showSelectAll]="true"
  [(value)]="picked"
/>`,
  body: `protected readonly columns = ['Name', 'E-mail', 'City', 'Country', 'Phone'];
protected readonly picked = signal<readonly unknown[]>(['Name', 'City']);`,
});

export const LAYOUT_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeCheckBoxGroup'] },
  template: `<!-- layout: 'vertical' (default) | 'horizontal' (a wrapping row) |
     'columns' (a CSS grid of [columns] columns). -->
<oge-check-box-group label="Days" layout="horizontal" [items]="days" [(value)]="workDays" />
<oge-check-box-group
  label="Toppings"
  layout="columns"
  [columns]="3"
  [items]="toppings"
  [(value)]="pizza"
/>`,
  body: `protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
protected readonly workDays = signal<readonly unknown[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
protected readonly toppings = ['Basil', 'Olives', 'Mushrooms', 'Peppers', 'Onion', 'Ham'];
protected readonly pizza = signal<readonly unknown[]>(['Basil']);`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeCheckBoxGroup'],
    '@angular/forms/signals': ['FormField'],
  },
  helpers: { '@angular/forms/signals': ['form', 'minLength'] },
  template: `<!-- Signal Forms' required() treats [] as a value, so "at least one"
     is minLength(…, 1) with its own message. Reactive Validators.required
     treats [] as empty and works as is. -->
<oge-check-box-group
  label="Interests"
  [items]="interests"
  [formField]="f.interests"
/>`,
  body: `protected readonly interests = ['Design', 'Engineering', 'Product', 'Sales'];
protected readonly model = signal<{ interests: readonly unknown[] }>({ interests: [] });
protected readonly f = form(this.model, (p) => {
  minLength(p.interests, 1, { message: 'Pick at least one interest' });
});`,
});

import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  template: `<oge-form [(formData)]="employee" [colCount]="2">
  <oge-form-item field="firstName" label="First name" [isRequired]="true" />
  <oge-form-item field="lastName" label="Last name" />
  <oge-form-item field="email" label="E-mail" hint="We never share it." />
  <oge-form-item field="notes" editorType="textArea" [colSpan]="2" />
</oge-form>`,
  body: `protected readonly employee = signal({
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: '',
  notes: '',
});`,
});

export const ITEMS_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm'] },
  types: { '@oge-ui/forms': ['OgeFormItemData'] },
  template: `<oge-form [(formData)]="order" [items]="fields" [colCount]="2" />`,
  body: `protected readonly order = signal({
  reference: '',
  quantity: 1,
  priority: 'normal',
  shipped: false,
});

protected readonly fields: OgeFormItemData[] = [
  { field: 'reference', label: 'Reference', isRequired: true },
  { field: 'quantity', label: 'Quantity', editorOptions: { min: 1, max: 99 } },
  {
    field: 'priority',
    label: 'Priority',
    editorOptions: { items: ['low', 'normal', 'high'] },
  },
  { field: 'shipped', label: 'Shipped', dataType: 'boolean' },
];`,
});

export const EDITOR_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  template: `<oge-form [(formData)]="profile" [colCount]="2">
  <!-- no dataType: inferred from the model value -->
  <oge-form-item field="name" label="Name" />
  <oge-form-item field="age" label="Age" />
  <oge-form-item field="birthday" label="Birthday" />
  <oge-form-item field="active" label="Active" />
  <!-- an option list beats the inferred type -->
  <oge-form-item
    field="team"
    label="Team"
    [editorOptions]="{ items: teams }"
  />
  <!-- editorType beats everything -->
  <oge-form-item field="bio" label="Bio" editorType="textArea" [colSpan]="2" />
</oge-form>`,
  body: `protected readonly teams = ['Platform', 'Design', 'Support'];

protected readonly profile = signal({
  name: 'Grace',
  age: 45,
  birthday: new Date(1980, 4, 12),
  active: true,
  team: 'Platform',
  bio: '',
});`,
});

export const GROUP_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormGroup', 'OgeFormItem'] },
  template: `<oge-form [(formData)]="account" [colCount]="2">
  <oge-form-group caption="Identity" [colCount]="2">
    <oge-form-item field="firstName" label="First name" />
    <oge-form-item field="lastName" label="Last name" />
  </oge-form-group>

  <oge-form-group caption="Contact" [colCount]="2">
    <oge-form-item field="email" label="E-mail" />
    <oge-form-item field="phone" label="Phone" />
    <oge-form-item field="address" label="Address" [colSpan]="2" />
  </oge-form-group>
</oge-form>`,
  body: `protected readonly account = signal({
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '',
  address: '',
});`,
});

export const LABEL_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  template: `<oge-form
  [(formData)]="settings"
  labelLocation="start"
  [alignItemLabels]="true"
  [showColonAfterLabel]="true"
  [colCount]="1"
>
  <oge-form-item field="host" label="Host" [isRequired]="true" />
  <oge-form-item field="port" label="Port" />
  <oge-form-item field="secure" label="Use TLS" />
</oge-form>`,
  body: `protected readonly settings = signal({
  host: 'localhost',
  port: 5432,
  secure: true,
});`,
});

export const ACTIONS_SNIPPET = demoSource({
  use: {
    '@oge-ui/forms': ['OgeForm', 'OgeFormItem'],
    '@oge-ui/buttons': ['OgeButton'],
  },
  template: `<oge-form
  #form
  [(formData)]="signup"
  [showValidationSummary]="true"
  (submitted)="saved.set(true)"
>
  <oge-form-item field="email" label="E-mail" [isRequired]="true" />
  <oge-form-item field="password" label="Password" [isRequired]="true" />

  <div ogeFormActions>
    <oge-button
      text="Create"
      stylingMode="contained"
      buttonType="submit"
      [useSubmitBehavior]="true"
    />
    <oge-button text="Reset" (click)="form.reset()" />
  </div>
</oge-form>`,
  body: `protected readonly signup = signal({ email: '', password: '' });
protected readonly saved = signal(false);`,
});

export const TEMPLATE_SNIPPET = demoSource({
  use: {
    '@oge-ui/forms': [
      'OgeForm',
      'OgeFormItem',
      'OgeFormEditorTemplate',
      'OgeFormLabelTemplate',
    ],
  },
  template: `<oge-form [(formData)]="ticket" labelLocation="start" [colCount]="1">
  <oge-form-item field="title" label="Title" [isRequired]="true" />

  <!-- replace only the editor; the form keeps the label, required mark
       and error text, and hands you the id its <label for> points at -->
  <oge-form-item field="rating" label="Rating">
    <ng-template ogeFormLabelTemplate let-text>
      <em>{{ text }}</em>
    </ng-template>
    <ng-template ogeFormEditorTemplate let-item let-editorId="editorId">
      <input
        type="range"
        min="1"
        max="5"
        [id]="editorId"
        [value]="ticket().rating"
        (input)="setRating($any($event.target).value)"
      />
      <span>{{ ticket().rating }} / 5</span>
    </ng-template>
  </oge-form-item>
</oge-form>`,
  body: `protected readonly ticket = signal({ title: '', rating: 3 });

protected setRating(value: string): void {
  this.ticket.update((t) => ({ ...t, rating: Number(value) }));
}`,
});

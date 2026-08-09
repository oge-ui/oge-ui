import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import {
  OgeForm,
  OgeFormEditorTemplate,
  OgeFormGroup,
  OgeFormItem,
  OgeFormLabelTemplate,
  type OgeFormItemData,
} from '@oge-ui/forms';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  ACTIONS_SNIPPET,
  BASIC_SNIPPET,
  EDITOR_SNIPPET,
  GROUP_SNIPPET,
  ITEMS_SNIPPET,
  LABEL_SNIPPET,
  TEMPLATE_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Declarative items',
  'Data-driven items',
  'Editor selection',
  'Groups',
  'Label placement',
  'Template slots',
  'Actions & submit',
] as const;

@Component({
  selector: 'app-forms-overview',
  imports: [
    OgeButton,
    OgeForm,
    OgeFormGroup,
    OgeFormItem,
    OgeFormEditorTemplate,
    OgeFormLabelTemplate,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Form"
      category="Forms"
      [chips]="['Signal Forms', 'reactive forms', 'container queries', 'a11y']"
    >
      <p>
        <code>&lt;oge-form&gt;</code> lays out the
        <code>&#64;oge-ui/inputs</code> editors: labels, responsive columns,
        nestable <code>&lt;fieldset&gt;</code> groups, a validation summary and
        submit. Items come from projected
        <code>&lt;oge-form-item&gt;</code> children, from a data-driven
        <code>items</code> array, or both — children first.
      </p>
      <p>
        The binding mode is derived from what you bind:
        <code>[fieldTree]</code> for Angular Signal Forms,
        <code>[formGroup]</code> for reactive forms, or
        <code>[(formData)]</code> for a plain signal model. That last one is not
        a second validation engine — the form compiles each item's
        <code>validationRules</code> into a Signal Forms schema and runs the
        very same code path.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['[(formData)]', 'field', 'label', 'colSpan', 'hint']"
      heading="Declarative items"
      description="Each <code>&amp;lt;oge-form-item&amp;gt;</code> names a model property through <code>field</code>. Dot-notation reaches nested objects. <code>colSpan</code> widens an item across the layout columns, and <code>hint</code> lands in the editor's own subscript so nothing shifts when an error replaces it."
      [code]="basicSnippet"
      language="ts"
    >
      <oge-form [(formData)]="employee" [colCount]="2">
        <oge-form-item
          field="firstName"
          label="First name"
          [isRequired]="true"
        />
        <oge-form-item field="lastName" label="Last name" />
        <oge-form-item field="email" label="E-mail" hint="We never share it." />
        <oge-form-item field="notes" editorType="textArea" [colSpan]="2" />
      </oge-form>
      <p class="mt-2 text-sm opacity-70">
        formData → {{ employee().firstName }} {{ employee().lastName }}
      </p>
    </app-demo-card>

    <app-demo-card
      [chips]="['items', 'editorOptions', 'dataType']"
      heading="Data-driven items"
      description="The same item model as an array — useful when the fields come from a server. Entries render after any projected children, and <code>visibleIndex</code> reorders both sources together."
      [code]="itemsSnippet"
      language="ts"
    >
      <oge-form [(formData)]="order" [items]="orderFields" [colCount]="2" />
    </app-demo-card>

    <app-demo-card
      [chips]="['dataType', 'editorType', 'editorOptions.items']"
      heading="Editor selection"
      description="With no <code>editorType</code>, the editor follows <code>dataType</code> — and <code>dataType</code> itself is inferred from the current model value. An <code>editorOptions.items</code> list beats the inferred type (a select box), and an explicit <code>editorType</code> beats everything. Anything richer than the curated options belongs in a template, not in a reflective options bag."
      [code]="editorSnippet"
      language="ts"
    >
      <oge-form [(formData)]="profile" [colCount]="2">
        <oge-form-item field="name" label="Name" />
        <oge-form-item field="age" label="Age" />
        <oge-form-item field="birthday" label="Birthday" />
        <oge-form-item field="active" label="Active" />
        <oge-form-item
          field="team"
          label="Team"
          [editorOptions]="{ items: teams }"
        />
        <oge-form-item
          field="bio"
          label="Bio"
          editorType="textArea"
          [colSpan]="2"
        />
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['&lt;oge-form-group&gt;', 'caption', 'colCount']"
      heading="Groups"
      description="A group renders a real <code>&amp;lt;fieldset&amp;gt;</code> with the caption as its <code>&amp;lt;legend&amp;gt;</code> — the markup screen readers expect for a labelled section — and carries its own column count. Groups nest."
      [code]="groupSnippet"
      language="ts"
    >
      <oge-form [(formData)]="account" [colCount]="2">
        <oge-form-group caption="Identity" [colCount]="2">
          <oge-form-item field="firstName" label="First name" />
          <oge-form-item field="lastName" label="Last name" />
        </oge-form-group>
        <oge-form-group caption="Contact" [colCount]="2">
          <oge-form-item field="email" label="E-mail" />
          <oge-form-item field="phone" label="Phone" />
          <oge-form-item field="address" label="Address" [colSpan]="2" />
        </oge-form-group>
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['labelLocation', 'alignItemLabels', 'showColonAfterLabel']"
      heading="Label placement"
      description="<code>labelLocation: 'top'</code> keeps each editor's own label chrome. <code>'start'</code> and <code>'end'</code> hand the label to the form, which draws a real <code>&amp;lt;label for&amp;gt;</code> in its own column — <code>alignItemLabels</code> gives every row the same label width so the editors line up."
      [code]="labelSnippet"
      language="ts"
    >
      <oge-form
        [(formData)]="settings"
        labelLocation="start"
        [alignItemLabels]="true"
        [showColonAfterLabel]="true"
        [colCount]="1"
      >
        <oge-form-item field="host" label="Host" [isRequired]="true" />
        <oge-form-item field="port" label="Port" />
        <oge-form-item field="secure" label="Use TLS" />
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'ogeFormItemTemplate',
        'ogeFormEditorTemplate',
        'ogeFormLabelTemplate',
      ]"
      heading="Template slots"
      description="Four slots, each legal at form level (applies to every item) or inside a single <code>&amp;lt;oge-form-item&amp;gt;</code> (applies to that one, and wins). <code>ogeFormEditorTemplate</code> replaces only the control and keeps the label, required mark and error text — the context hands you <code>editorId</code> so your control keeps the <code>&amp;lt;label for&amp;gt;</code> association. <code>ogeFormItemTemplate</code> replaces the whole field, and <code>ogeFormGroupCaptionTemplate</code> replaces a legend's content."
      [code]="templateSnippet"
      language="ts"
    >
      <oge-form [(formData)]="ticket" labelLocation="start" [colCount]="1">
        <oge-form-item field="title" label="Title" [isRequired]="true" />
        <oge-form-item field="rating" label="Rating">
          <ng-template ogeFormLabelTemplate let-text>
            <em>{{ text }}</em>
          </ng-template>
          <ng-template ogeFormEditorTemplate let-editorId="editorId">
            <input
              type="range"
              min="1"
              max="5"
              [id]="editorId"
              [value]="ticket().rating"
              (input)="setRating($any($event.target).value)"
            />
            <span class="ml-2 text-sm">{{ ticket().rating }} / 5</span>
          </ng-template>
        </oge-form-item>
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['ogeFormActions', 'submitted', 'reset()']"
      heading="Actions & submit"
      description="Project the buttons into the <code>ogeFormActions</code> slot. Submitting marks every field touched, runs validation, emits the cancelable <code>submitting</code> event and — only if both pass — <code>submitted</code>. A failed submit reveals the summary and moves focus to the first invalid field."
      [code]="actionsSnippet"
      language="ts"
    >
      <oge-form
        #signupForm
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
          <oge-button text="Reset" (click)="signupForm.reset()" />
        </div>
      </oge-form>
      @if (saved()) {
        <p class="mt-2 text-sm opacity-70">submitted → account created</p>
      }
    </app-demo-card>
  `,
})
export class FormsOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly itemsSnippet = ITEMS_SNIPPET;
  protected readonly editorSnippet = EDITOR_SNIPPET;
  protected readonly groupSnippet = GROUP_SNIPPET;
  protected readonly labelSnippet = LABEL_SNIPPET;
  protected readonly actionsSnippet = ACTIONS_SNIPPET;

  protected readonly teams = ['Platform', 'Design', 'Support'];

  protected readonly employee = signal({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: '',
    notes: '',
  });

  protected readonly order = signal({
    reference: '',
    quantity: 1,
    priority: 'normal',
    shipped: false,
  });

  protected readonly orderFields: OgeFormItemData[] = [
    { field: 'reference', label: 'Reference', isRequired: true },
    {
      field: 'quantity',
      label: 'Quantity',
      editorOptions: { min: 1, max: 99 },
    },
    {
      field: 'priority',
      label: 'Priority',
      editorOptions: { items: ['low', 'normal', 'high'] },
    },
    { field: 'shipped', label: 'Shipped', dataType: 'boolean' },
  ];

  protected readonly profile = signal({
    name: 'Grace',
    age: 45,
    birthday: new Date(1980, 4, 12),
    active: true,
    team: 'Platform',
    bio: '',
  });

  protected readonly account = signal({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '',
    address: '',
  });

  protected readonly settings = signal({
    host: 'localhost',
    port: 5432,
    secure: true,
  });

  protected readonly signup = signal({ email: '', password: '' });
  protected readonly saved = signal(false);

  protected readonly templateSnippet = TEMPLATE_SNIPPET;
  protected readonly ticket = signal({ title: '', rating: 3 });

  protected setRating(value: string): void {
    this.ticket.update((t) => ({ ...t, rating: Number(value) }));
  }
}

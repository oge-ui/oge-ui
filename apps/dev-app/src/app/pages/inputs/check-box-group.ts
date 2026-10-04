import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, minLength } from '@angular/forms/signals';
import { OgeCheckBoxGroup } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_CHECK_BOX_GROUP_SECTIONS,
  ReactInputsCheckBoxGroupDemos,
} from '../react-inputs/check-box-group';
import {
  BASIC_SNIPPET,
  FORMS_SNIPPET,
  LAYOUT_SNIPPET,
  SELECT_ALL_SNIPPET,
} from './check-box-group-snippets';

const SECTIONS = [
  'Getting started',
  'Select all',
  'Layouts',
  'Inside a form',
] as const;

@Component({
  selector: 'app-inputs-check-box-group',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeCheckBoxGroup,
    FormField,
    ReactInputsCheckBoxGroupDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Check Box Group"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['array value', 'select all', 'layouts', 'Signal Forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeCheckBoxGroup /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> binds a list of check boxes to
          one <strong>array</strong> value: real
          <code>&lt;OgeCheckBox&gt;</code>es in a labelled
          <code>role="group"</code>, an optional tri-state "select all" over the
          enabled items, and the committed array in items order. The ordering
          and select-all rules are the shared
          <code>&#64;oge-ui/behavior</code> choice-group core the Angular editor
          runs.
        </p>
      } @else {
        <p>
          An items-bound list of check boxes whose value is the
          <strong>array</strong> of checked item values — the Syncfusion /
          PrimeNG checkbox group, as one form field with a label, hint and
          validation subscript. Each item is a real
          <code>oge-check-box</code> (native semantics, its own Tab stop — the
          APG checkbox pattern) inside a <code>role="group"</code> named by the
          label.
        </p>
        <p>
          Works standalone via <code>[(value)]</code>, with Signal Forms via
          <code>[formField]</code>, and with reactive/template forms via
          <code>formControl</code>/<code>ngModel</code>.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-check-box-group-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'valueExpr', 'disabledExpr', 'hint']"
        heading="Getting started"
        description="<code>displayExpr</code> / <code>valueExpr</code> / <code>disabledExpr</code> are the select box vocabulary. The value is the array of checked <code>valueExpr</code> results <strong>in items order</strong>, whatever order the user clicked in; disabled items keep their state."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-check-box-group
          label="Notify me by"
          hint="We never share your details."
          [items]="channels"
          displayExpr="name"
          valueExpr="id"
          disabledExpr="locked"
          [(value)]="notify"
        />
        <p class="mt-3 text-sm">
          Value: <code data-testid="group-value">{{ notifyText() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['showSelectAll', 'tri-state', 'selectAll()']"
        heading="Select all"
        description="<code>showSelectAll</code> adds a tri-state box over the <em>enabled</em> items — checked, mixed (<code>aria-checked='mixed'</code>) or unchecked; from mixed it selects all. <code>selectAll()</code> / <code>unselectAll()</code> do the same from code."
        [code]="selectAllSnippet"
        language="ts"
      >
        <oge-check-box-group
          label="Columns to export"
          [items]="exportColumns"
          [showSelectAll]="true"
          [(value)]="picked"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['vertical', 'horizontal', 'columns']"
        heading="Layouts"
        description="<code>layout: 'vertical' | 'horizontal' | 'columns'</code> — a column, a wrapping row, or a CSS grid of <code>columns</code> columns."
        [code]="layoutSnippet"
        language="ts"
      >
        <div class="flex flex-col gap-6">
          <oge-check-box-group
            label="Days"
            layout="horizontal"
            [items]="days"
            [(value)]="workDays"
          />
          <oge-check-box-group
            label="Toppings"
            layout="columns"
            [columns]="3"
            [items]="toppings"
            [(value)]="pizza"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['[formField]', 'minLength(…, 1)', 'CVA']"
        heading="Inside a form"
        description="Signal Forms' <code>required()</code> treats <code>[]</code> as a value, so “at least one” is <code>minLength(p.field, 1, { message })</code>; reactive <code>Validators.required</code> treats <code>[]</code> as empty and works as is. Touch the group and leave it empty to see the error."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-check-box-group
          label="Interests"
          [items]="interests"
          [formField]="f.interests"
        />
      </app-demo-card>
    }
  `,
})
export class InputsCheckBoxGroupPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_CHECK_BOX_GROUP_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly selectAllSnippet = SELECT_ALL_SNIPPET;
  protected readonly layoutSnippet = LAYOUT_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly channels = [
    { id: 'mail', name: 'E-mail' },
    { id: 'sms', name: 'SMS' },
    { id: 'push', name: 'Push (always on)', locked: true },
    { id: 'call', name: 'Phone call' },
  ];
  protected readonly notify = signal<readonly unknown[]>(['mail', 'push']);
  protected readonly notifyText = computed(() => JSON.stringify(this.notify()));

  protected readonly exportColumns = [
    'Name',
    'E-mail',
    'City',
    'Country',
    'Phone',
  ];
  protected readonly picked = signal<readonly unknown[]>(['Name', 'City']);

  protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly workDays = signal<readonly unknown[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ]);
  protected readonly toppings = [
    'Basil',
    'Olives',
    'Mushrooms',
    'Peppers',
    'Onion',
    'Ham',
  ];
  protected readonly pizza = signal<readonly unknown[]>(['Basil']);

  protected readonly interests = ['Design', 'Engineering', 'Product', 'Sales'];
  protected readonly model = signal<{ interests: readonly unknown[] }>({
    interests: [],
  });
  protected readonly f = form(this.model, (p) => {
    minLength(p.interests, 1, { message: 'Pick at least one interest' });
  });
}

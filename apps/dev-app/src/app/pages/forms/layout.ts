import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeForm,
  OgeFormAccordion,
  OgeFormGroup,
  OgeFormItem,
  OgeFormTabs,
  type OgeFormItemData,
} from '@oge-ui/forms';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  AUTO_SNIPPET,
  BREAKPOINT_SNIPPET,
  COLCOUNT_SNIPPET,
  NESTED_SNIPPET,
  ACCORDION_SECTION_SNIPPET,
  READONLY_SNIPPET,
  SECTIONS_SNIPPET,
  VISIBILITY_SNIPPET,
} from './layout-snippets';

const SECTIONS = [
  'Fixed columns',
  'Auto-fit columns',
  'Responsive by container',
  'Nested groups',
  'Tab sections',
  'Accordion sections',
  'Read-only & disabled',
  'Visibility & order',
] as const;

@Component({
  selector: 'app-forms-layout',
  imports: [
    OgeForm,
    OgeFormGroup,
    OgeFormItem,
    OgeFormTabs,
    OgeFormAccordion,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Form layout"
      category="Forms"
      [chips]="['colCount', 'colSpan', 'container queries', 'fieldset']"
    >
      <p>
        The layout is one CSS grid per level. <code>colCount</code> sets the
        track count, <code>colSpan</code> widens an item inside it, and groups
        may override the count for their own subtree.
      </p>
      <p>
        Responsiveness is a <strong>container query</strong>, not a window-width
        callback: <code>colCountByScreen</code> keys off the form's own inline
        size, so a form inside a dialog, a drawer or a grid cell picks the right
        column count without any JavaScript resize listener.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['colCount', 'colSpan']"
      heading="Fixed columns"
      description="A numeric <code>colCount</code> produces <code>repeat(n, minmax(0, 1fr))</code>. An item's <code>colSpan</code> is clamped to the count in force, so a span of 4 in a 2-column form spans 2 rather than overflowing."
      [code]="colCountSnippet"
      language="ts"
    >
      <div class="mb-3 flex items-center gap-2 text-sm">
        <span>columns:</span>
        @for (n of columnChoices; track n) {
          <button
            type="button"
            class="rounded border px-2 py-0.5"
            [class.font-semibold]="columns() === n"
            (click)="columns.set(n)"
          >
            {{ n }}
          </button>
        }
      </div>
      <oge-form [(formData)]="record" [colCount]="columns()">
        <oge-form-item field="code" label="Code" />
        <oge-form-item field="name" label="Name" />
        <oge-form-item field="owner" label="Owner" />
        <oge-form-item field="summary" label="Summary" [colSpan]="columns()" />
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['colCount=auto', 'minColWidth']"
      heading="Auto-fit columns"
      description="The default. <code>repeat(auto-fit, minmax(minColWidth, 1fr))</code> fits as many columns as the form is wide, with no breakpoints to maintain. Resize the browser — or the card — and the count follows."
      [code]="autoSnippet"
      language="ts"
    >
      <oge-form
        [(formData)]="server"
        [items]="serverFields"
        colCount="auto"
        [minColWidth]="260"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['colCountByScreen', '&#64;container']"
      heading="Responsive by container"
      description="Explicit counts per breakpoint when auto-fit is not precise enough. The breakpoints are container queries on the form itself — <code>xs</code> under 480px, then 480 / 720 / 960 / 1200 — so the same form nested in a narrow panel behaves like a phone layout even on a wide screen."
      [code]="breakpointSnippet"
      language="ts"
    >
      <oge-form
        [(formData)]="server"
        [items]="serverFields"
        [colCountByScreen]="{ xs: 1, sm: 2, md: 3, lg: 4 }"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['nested groups', 'legend', 'group colCount']"
      heading="Nested groups"
      description="Groups nest as nested fieldsets, each with its own column count. That is the structure assistive technology reads as “this block of fields belongs together”, and it is why the group is a real fieldset rather than a styled div."
      [code]="nestedSnippet"
      language="ts"
    >
      <oge-form [(formData)]="company" [colCount]="2">
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
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['&lt;oge-form-tabs&gt;', 'error badges', 'focus reveal']"
      heading="Tab sections"
      description="Wrap the groups in <code>&amp;lt;oge-form-tabs&amp;gt;</code> and each group becomes a tab, its caption the tab text. The strip, its keyboard handling and its overflow come from <code>&#64;oge-ui/tabs</code> — none of it is re-implemented. A tab holding invalid fields gets a count badge, and a failed submit selects that tab before focusing the field."
      [code]="sectionsSnippet"
      language="ts"
    >
      <oge-form
        #tabbedForm
        [(formData)]="tabbedEmployee"
        [showValidationSummary]="true"
      >
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
      </oge-form>
      <button
        type="button"
        class="mt-3 rounded border px-2 py-1 text-sm"
        (click)="tabbedForm.submit()"
      >
        Submit (Title is empty)
      </button>
    </app-demo-card>

    <app-demo-card
      [chips]="['&lt;oge-form-accordion&gt;', 'invalid sections']"
      heading="Accordion sections"
      description="The same idea over <code>&#64;oge-ui/layout</code>. A panel holding an invalid field gets the accordion's own invalid indicator — the danger rail, the dot and its screen-reader label — and a failed submit expands it."
      [code]="accordionSnippet"
      language="ts"
    >
      <oge-form
        #accordionForm
        [(formData)]="accordionEmployee"
        [scrollToFirstInvalid]="false"
      >
        <oge-form-accordion [expandedKeys]="[]">
          <oge-form-group caption="Personal">
            <oge-form-item field="firstName" label="First name" />
          </oge-form-group>
          <oge-form-group caption="Employment">
            <oge-form-item field="title" label="Title" [isRequired]="true" />
          </oge-form-group>
        </oge-form-accordion>
      </oge-form>
      <button
        type="button"
        class="mt-3 rounded border px-2 py-1 text-sm"
        (click)="accordionForm.submit()"
      >
        Submit (Title is empty)
      </button>
    </app-demo-card>

    <app-demo-card
      [chips]="['readOnly', 'disabled', 'per-item override']"
      heading="Read-only & disabled"
      description="Form-level <code>disabled</code> wraps the fields in a <code>&amp;lt;fieldset disabled&amp;gt;</code>; <code>readOnly</code> forwards to every editor. Both fall through group level to item level, and an item may opt out. In <code>[fieldTree]</code> mode the schema owns this instead — express it with <code>disabled()</code> / <code>readonly()</code>, because the <code>FormField</code> directive writes those inputs itself."
      [code]="readOnlySnippet"
      language="ts"
    >
      <div class="mb-3 flex gap-3 text-sm">
        <label class="flex items-center gap-1">
          <input
            type="checkbox"
            [checked]="locked()"
            (change)="toggleLocked()"
          />
          readOnly
        </label>
        <label class="flex items-center gap-1">
          <input
            type="checkbox"
            [checked]="archived()"
            (change)="toggleArchived()"
          />
          disabled
        </label>
      </div>
      <oge-form
        [(formData)]="invoice"
        [readOnly]="locked()"
        [disabled]="archived()"
        [colCount]="2"
      >
        <oge-form-item field="number" label="Number" />
        <oge-form-item field="total" label="Total" />
        <oge-form-item field="comment" label="Comment" [readOnly]="false" />
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['visible', 'visibleIndex']"
      heading="Visibility & order"
      description="<code>visible</code> drops an item from the layout entirely — no hidden input, no stale value in the DOM. <code>visibleIndex</code> pulls items to the front in index order; everything without one keeps its declaration order behind them."
      [code]="visibilitySnippet"
      language="ts"
    >
      <oge-form [(formData)]="shipment" [colCount]="2">
        <oge-form-item field="carrier" label="Carrier" [visibleIndex]="1" />
        <oge-form-item field="reference" label="Reference" [visibleIndex]="0" />
        <oge-form-item
          field="trackingNumber"
          label="Tracking number"
          [visible]="shipment().carrier !== ''"
        />
      </oge-form>
    </app-demo-card>
  `,
})
export class FormsLayoutPage {
  protected readonly sections = SECTIONS;
  protected readonly colCountSnippet = COLCOUNT_SNIPPET;
  protected readonly autoSnippet = AUTO_SNIPPET;
  protected readonly breakpointSnippet = BREAKPOINT_SNIPPET;
  protected readonly nestedSnippet = NESTED_SNIPPET;
  protected readonly readOnlySnippet = READONLY_SNIPPET;
  protected readonly visibilitySnippet = VISIBILITY_SNIPPET;
  protected readonly sectionsSnippet = SECTIONS_SNIPPET;
  protected readonly accordionSnippet = ACCORDION_SECTION_SNIPPET;

  protected readonly tabbedEmployee = signal({
    firstName: 'Ada',
    lastName: 'Lovelace',
    title: '',
    salary: 120000,
  });

  protected readonly accordionEmployee = signal({
    firstName: 'Ada',
    lastName: 'Lovelace',
    title: '',
    salary: 120000,
  });

  protected readonly columnChoices = [1, 2, 3] as const;
  protected readonly columns = signal(3);

  protected readonly record = signal({
    code: 'OGE-1',
    name: 'Form layout',
    owner: 'Ada',
    summary: '',
  });

  protected readonly server = signal({
    host: 'db.internal',
    port: 5432,
    user: 'postgres',
    database: 'oge',
  });

  protected readonly serverFields: OgeFormItemData[] = [
    { field: 'host', label: 'Host' },
    { field: 'port', label: 'Port' },
    { field: 'user', label: 'User' },
    { field: 'database', label: 'Database' },
  ];

  protected readonly company = signal({
    name: 'OGE UI',
    taxId: '',
    employees: 12,
    street: '',
    city: '',
    postalCode: '',
  });

  protected readonly locked = signal(true);
  protected readonly archived = signal(false);

  protected readonly invoice = signal({
    number: 'INV-204',
    total: 1290,
    comment: '',
  });

  protected readonly shipment = signal({
    carrier: 'DHL',
    reference: 'REF-9',
    trackingNumber: '',
  });

  protected toggleLocked(): void {
    this.locked.update((value) => !value);
  }

  protected toggleArchived(): void {
    this.archived.update((value) => !value);
  }
}

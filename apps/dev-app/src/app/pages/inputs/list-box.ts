import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  OgeListBox,
  OgeListBoxGroupTemplate,
  OgeListBoxItemTemplate,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { DEMO_CITIES, type DemoCity } from './list-box-data';
import {
  REACT_INPUTS_LIST_BOX_SECTIONS,
  ReactInputsListBoxDemos,
} from '../react-inputs/list-box';
import {
  BASIC_SNIPPET,
  FORMS_SNIPPET,
  GROUPS_SNIPPET,
  MULTIPLE_SNIPPET,
  REORDER_SNIPPET,
  TEMPLATE_SNIPPET,
} from './list-box-snippets';

const SECTIONS = [
  'Getting started',
  'Multiple selection',
  'Groups and search',
  'Custom templates',
  'Inside a form',
  'Reordering',
] as const;

@Component({
  selector: 'app-inputs-list-box',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeListBox,
    OgeListBoxItemTemplate,
    OgeListBoxGroupTemplate,
    ReactiveFormsModule,
    ReactInputsListBoxDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="List Box"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['APG listbox', 'single / multiple', 'type-ahead', 'forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeListBox /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is a standing, always-open list
          of options as a form editor — the WAI-ARIA APG listbox with one tab
          stop and <code>aria-activedescendant</code>, single or multiple
          selection, labelled groups, a search field, type-ahead and render
          props for the option and group content. The value is the controlled
          pair <code>value</code> + <code>onValueChange</code> (or
          <code>defaultValue</code>).
        </p>
      } @else {
        <p>
          A standing, always-open list of options as a form editor — the
          WAI-ARIA APG <strong>listbox</strong> (Kendo ListBox, PrimeNG
          Listbox): one tab stop with <code>aria-activedescendant</code>, arrows
          / Home / End / PageUp / PageDown and type-ahead,
          <code>single</code> mode where the selection follows focus and
          <code>multiple</code> mode with toggles, Shift ranges and Ctrl+A.
          <code>groupBy</code> renders labelled groups and
          <code>searchEnabled</code> a filter field.
        </p>
        <p>
          The list machine is the dropdown editors' select-list core,
          generalized to an always-open list in
          <code>&#64;oge-ui/behavior</code>
          — the very code the React list box runs. Works standalone via
          <code>[(value)]</code>, with Signal Forms via <code>[formField]</code>
          and with reactive/template forms via
          <code>formControl</code>/<code>ngModel</code>.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-list-box-demos />
    } @else {
      <app-demo-card
        [chips]="['single', 'selection follows focus', 'disabledExpr']"
        heading="Getting started"
        description="Arrows, Home/End and PageUp/PageDown move the active option and select it; typing jumps by prefix (accent-insensitive, so <kbd>i</kbd> finds İstanbul). Disabled options are skipped."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-list-box
          label="City"
          [items]="cities"
          displayExpr="name"
          valueExpr="id"
          disabledExpr="closed"
          [height]="220"
          [(value)]="city"
        />
        <p class="mt-3 text-sm">
          Value:
          <code data-testid="list-box-value">{{ show(city()) }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['multiple', 'showCheckBoxes', 'Shift ranges', 'Ctrl+A']"
        heading="Multiple selection"
        description='<code>selectionMode="multiple"</code> sets <code>aria-multiselectable</code>: Space, Enter and clicks toggle, Shift+arrows and Shift+click extend from the anchor, Ctrl+Shift+Home/End select to an edge, Ctrl+A selects all (again: none). The value is an items-ordered array.'
        [code]="multipleSnippet"
        language="ts"
      >
        <oge-list-box
          label="Cities to visit"
          [items]="cities"
          displayExpr="name"
          valueExpr="id"
          disabledExpr="closed"
          selectionMode="multiple"
          [showCheckBoxes]="true"
          [height]="220"
          [(value)]="picked"
        />
        <p class="mt-3 text-sm">
          Value:
          <code data-testid="list-box-multi-value">{{ show(picked()) }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['groupBy', 'searchEnabled', 'role=group']"
        heading="Groups and search"
        description='<code>groupBy</code> renders each group as a <code>role="group"</code> labelled by its header; <code>searchEnabled</code> adds a filter field above the list (ArrowDown moves into the list).'
        [code]="groupsSnippet"
        language="ts"
      >
        <oge-list-box
          label="Office"
          [items]="cities"
          displayExpr="name"
          valueExpr="id"
          groupBy="country"
          [searchEnabled]="true"
          [height]="260"
          [(value)]="office"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeListBoxItemTemplate', 'ogeListBoxGroupTemplate']"
        heading="Custom templates"
        description="The option keeps its role, selection state and check glyph — only the content is yours. The group template receives the label and the option count."
        [code]="templateSnippet"
        language="ts"
      >
        <oge-list-box
          label="Cities"
          [items]="cities"
          displayExpr="name"
          valueExpr="id"
          groupBy="country"
          selectionMode="multiple"
          [height]="260"
          [(value)]="templated"
        >
          <ng-template ogeListBoxItemTemplate let-city let-selected="selected">
            <span class="inline-flex items-center gap-2">
              <span
                class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
                aria-hidden="true"
                >{{ city.name.charAt(0) }}</span
              >
              {{ city.name }}
              @if (selected) {
                <small class="opacity-70">selected</small>
              }
            </span>
          </ng-template>
          <ng-template ogeListBoxGroupTemplate let-label let-count="count">
            {{ label }} · {{ count }}
          </ng-template>
        </oge-list-box>
      </app-demo-card>

      <app-demo-card
        [chips]="['formControl', 'Validators.required']"
        heading="Inside a form"
        description="A <code>FormValueControl</code> and a ControlValueAccessor: <code>formControl</code>, <code>ngModel</code> and <code>[formField]</code> all bind it. In multiple mode <code>required</code> means at least one option."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-list-box
          label="Destinations"
          hint="Pick at least one"
          [items]="cities"
          displayExpr="name"
          valueExpr="id"
          selectionMode="multiple"
          [height]="200"
          [formControl]="destinations"
        />
        <p class="mt-3 text-sm">
          Valid:
          <code data-testid="list-box-valid">{{ destinations.valid }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['allowReordering', 'Alt+↑/↓', 'drag', 'reordered']"
        heading="Reordering"
        description="<code>allowReordering</code> lets the user reorder the options: Alt+↑/↓ moves the active option, a pointer drag drops it before or after another (touch: after a long press). Each move runs the cancelable <code>reordering</code> → <code>reordered</code> pair and is announced; keep the order by storing <code>reordered.items</code>."
        [code]="reorderSnippet"
        language="ts"
      >
        <oge-list-box
          label="Route"
          [items]="route()"
          displayExpr="name"
          valueExpr="id"
          [allowReordering]="true"
          [height]="260"
          (reordered)="route.set($event.items)"
        />
        <p class="mt-3 text-sm">
          Order:
          <code data-testid="list-box-route">{{ routeNames() }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsListBoxPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_LIST_BOX_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly multipleSnippet = MULTIPLE_SNIPPET;
  protected readonly groupsSnippet = GROUPS_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;
  protected readonly reorderSnippet = REORDER_SNIPPET;
  protected readonly route = signal<readonly DemoCity[]>(
    DEMO_CITIES.slice(0, 5),
  );
  protected readonly routeNames = computed(() =>
    this.route()
      .map((city) => city.name)
      .join(' → '),
  );

  protected readonly cities = DEMO_CITIES;
  protected readonly city = signal<unknown>(3);
  protected readonly picked = signal<unknown>([2, 6]);
  protected readonly office = signal<unknown>(null);
  protected readonly templated = signal<unknown>([1]);
  protected readonly destinations = new FormControl<number[]>(
    [],
    Validators.required,
  );

  protected show(value: unknown): string {
    return JSON.stringify(value ?? null);
  }
}

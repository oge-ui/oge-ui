import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  OgePivotCellTemplate,
  OgePivotField,
  OgePivotGrid,
  type OgePivotCellTemplateContext,
  type OgePivotRowHeaderLayout,
} from '@oge-ui/pivot';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { ReactPivotCalculatedDemos } from '../react-pivot/calculated-fields';
import {
  CALCULATED_FIELDS,
  FILTER_PRESETS,
  filterFields,
  type PivotFilterPreset,
} from './calculated-fields-model';
import {
  CALCULATED_SNIPPET,
  FILTERS_SNIPPET,
} from './calculated-fields-snippets';
import { makeOverviewSales, money, type Sale } from './pivot-demo-data';
import { loadDocsPdfFont } from '../../shared/pdf-font';

@Component({
  selector: 'app-pivot-calculated-fields',
  imports: [
    OgePivotGrid,
    OgePivotField,
    OgePivotCellTemplate,
    DemoCard,
    DocHeader,
    ReactPivotCalculatedDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Calculated Fields & Filters"
      category="Pivot Grid"
      [chips]="[
        'calculatedFields',
        'topN',
        'labelFilter',
        'valueFilter',
        'rowHeaderLayout',
        'templates',
        'export-pdf',
      ]"
    >
      <p>
        <code>calculatedFields</code> compute a measure from the other measures
        of each cell — totals included, so a ratio stays a ratio of the totals —
        and take the display modes of regular measures: percent of a total, the
        difference from the previous column, a running total. Row and column
        fields filter their members by label, by a measure’s total or to the Top
        N; the row headers lay out compact, outline or tabular.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-pivot-calculated-demos />
    } @else {
      <app-demo-card
        [chips]="[
          'ratio of totals',
          '% of total',
          'Δ previous',
          'running',
          'cell template',
        ]"
        [code]="calculatedSnippet"
        language="ts"
      >
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Four calculated measures beside Amount and Units; a cell template
            colours falling years red.
          </span>
          <button
            type="button"
            class="oge-tool-btn oge-tool-text-btn oge-btn-accent"
            data-testid="pivot-export-pdf"
            (click)="pdf()"
          >
            PDF
          </button>
        </div>
        <oge-pivot-grid
          #calcPivot
          [data]="sales"
          [fieldPanel]="false"
          [calculatedFields]="calculated"
          style="max-height: 420px"
        >
          <oge-pivot-field dataField="region" area="row" />
          <oge-pivot-field
            dataField="date"
            caption="Year"
            area="column"
            groupInterval="year"
          />
          <oge-pivot-field
            dataField="amount"
            caption="Amount"
            area="data"
            summaryType="sum"
            [format]="money"
          />
          <oge-pivot-field
            dataField="units"
            caption="Units"
            area="data"
            summaryType="sum"
          />
          <span
            *ogePivotCellTemplate="let cell"
            [class.oge-demo-negative]="negative(cell)"
            >{{ cell.text }}</span
          >
        </oge-pivot-grid>
      </app-demo-card>

      <h3>Member filters &amp; row-header layouts</h3>
      <p>
        <code>topN</code>, <code>labelFilter</code> and
        <code>valueFilter</code> on a row or column field keep whole members
        before aggregation, so totals follow what is shown.
        <code>rowHeaderLayout</code> gives each row field its own label column
        (<code>outline</code>) or repeats the ancestors on every line
        (<code>tabular</code>).
      </p>
      <app-demo-card
        [chips]="[
          'topN',
          'labelFilter',
          'valueFilter',
          'compact / outline / tabular',
        ]"
        [code]="filtersSnippet"
        language="ts"
      >
        <div class="mb-2 flex flex-wrap items-center gap-1.5">
          @for (preset of presets; track preset.id) {
            <button
              type="button"
              class="oge-tool-btn oge-tool-text-btn"
              [class.oge-btn-accent]="filter() === preset.id"
              [attr.aria-pressed]="filter() === preset.id"
              (click)="filter.set(preset.id)"
            >
              {{ preset.label }}
            </button>
          }
          <span class="mx-2 text-gray-300" aria-hidden="true">|</span>
          @for (mode of layouts; track mode) {
            <button
              type="button"
              class="oge-tool-btn oge-tool-text-btn"
              [class.oge-btn-accent]="layout() === mode"
              [attr.aria-pressed]="layout() === mode"
              (click)="layout.set(mode)"
            >
              {{ mode }}
            </button>
          }
        </div>
        <oge-pivot-grid
          data-testid="pivot-filters"
          [data]="sales"
          [fieldPanel]="false"
          [fields]="fields()"
          [rowHeaderLayout]="layout()"
          style="max-height: 420px"
        />
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          An <code>expression</code> receives the cell’s measure values keyed by
          measure id (as displayed) plus where it runs (<code>rowPath</code>,
          <code>columnPath</code>, total flags); non-finite results become an
          empty cell.
        </li>
        <li>
          Value and Top-N filters compare a member’s grand total (over all other
          fields), in area order; member filters apply to local data.
        </li>
        <li>
          <code>*ogePivotCellTemplate</code>,
          <code>*ogePivotRowHeaderTemplate</code> and
          <code>*ogePivotColumnHeaderTemplate</code> replace the content only —
          expanders, roles and keyboard navigation stay the grid’s.
        </li>
        <li>
          <code>&#64;oge-ui/pivot/export-pdf</code> writes the grid’s own cell
          text, its row-header layout and the field captions, with the column
          headers repeated on every page.
        </li>
      </ul>
    }
  `,
  styles: `
    .oge-demo-negative {
      color: var(--oge-danger);
    }
  `,
})
export class PivotCalculatedFieldsPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sales = makeOverviewSales(400);
  protected readonly money = money;
  protected readonly calculated = CALCULATED_FIELDS;
  protected readonly calculatedSnippet = CALCULATED_SNIPPET;
  protected readonly filtersSnippet = FILTERS_SNIPPET;
  protected readonly presets = FILTER_PRESETS;
  protected readonly layouts: readonly OgePivotRowHeaderLayout[] = [
    'compact',
    'outline',
    'tabular',
  ];
  protected readonly filter = signal<PivotFilterPreset>('top3');
  protected readonly layout = signal<OgePivotRowHeaderLayout>('tabular');
  protected readonly fields = computed(() => filterFields(this.filter()));

  // optional: the React view renders no Angular pivot
  private readonly calcPivot = viewChild<OgePivotGrid<Sale>>('calcPivot');

  protected negative(cell: OgePivotCellTemplateContext): boolean {
    return cell.measureId === 'delta' && Number(cell.value) < 0;
  }

  protected async pdf(): Promise<void> {
    const pivot = this.calcPivot();
    if (!pivot) return;
    const { exportPivotToPdf } = await import('@oge-ui/pivot/export-pdf');
    await loadDocsPdfFont(); // Unicode font: Turkish ğ ş ı İ
    await exportPivotToPdf(pivot, {
      filename: 'sales.pdf',
      title: 'Sales with calculated measures',
      pageNumbers: true,
    });
  }
}

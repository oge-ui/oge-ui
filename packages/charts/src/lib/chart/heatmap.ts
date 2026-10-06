import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  buildHeatmapScene,
  chartGridKeyCommand,
  formatOgeChartMessage,
  heatmapAnnouncement,
  heatmapCell,
  heatmapSrTable,
  heatmapTooltip,
  type OgeChartColorScale,
  type OgeChartHeatmapCellEvent,
  type OgeChartLegendOptions,
  type OgeHeatmapCellVm,
} from '@oge-ui/charts-engine';
import { OgeChartColorLegend } from './color-legend';
import { OgeChartVisualRtlBase } from './visual-base';

/** A cell position in the heatmap's selection. */
export interface OgeChartCellRef {
  readonly row: number;
  readonly column: number;
}

/**
 * `<oge-heatmap>` — a category × category grid coloured through a colour
 * scale (linear blends between any CSS colours or theme tokens, or
 * segmented bands), with the colour-scale legend, optional cell labels,
 * tooltips, selection and APG-grid-style keyboard cell navigation
 * (arrows, Home/End, Ctrl+Home/End, PageUp/PageDown). Screen readers get a
 * real two-dimensional table. Commercial.
 *
 * ```html
 * <oge-heatmap [dataSource]="load" xField="hour" yField="day" valueField="tickets" />
 * ```
 */
@Component({
  selector: 'oge-heatmap',
  imports: [OgeChartColorLegend],
  styleUrls: ['./chart.scss', './visuals.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-heatmap',
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
    '[attr.dir]': 'hostDir()',
    '[style]': 'animationVars()',
  },
  template: `
    @if (title()) {
      <div class="oge-chart-title">{{ title() }}</div>
    }
    <div
      class="oge-chart-layout"
      [class.oge-chart-legend-start]="legendPosition() === 'start'"
      [class.oge-chart-legend-end]="legendPosition() === 'end'"
      [class.oge-chart-legend-top]="legendPosition() === 'top'"
    >
      @if (legendVisible() && scene().cells.length > 0) {
        <oge-chart-color-legend
          [legend]="scene().legend"
          [label]="msg().visuals.colorScaleLabel"
          [rtl]="rtl()"
        />
      }
      <div
        #plotWrap
        class="oge-chart-plot-wrap"
        tabindex="0"
        role="group"
        [attr.aria-label]="scene().ariaLabel"
        (keydown)="onKeydown($event)"
      >
        <svg
          #svgEl
          class="oge-chart-svg"
          role="img"
          [attr.aria-label]="scene().ariaLabel"
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
        >
          <g [class.oge-chart-visual-enter]="drawingIn()">
            @for (cell of scene().cells; track cell.key) {
              <rect
                class="oge-heatmap-cell"
                [class.oge-heatmap-cell-empty]="cell.empty"
                [class.oge-chart-point-selected]="isSelected(cell)"
                [class.oge-chart-item-active]="activeKey() === cell.key"
                [attr.x]="cell.x"
                [attr.y]="cell.y"
                [attr.width]="cell.width"
                [attr.height]="cell.height"
                [style.fill]="cell.fill"
                (click)="onCellClick(cell)"
                (mouseenter)="hoverKey.set(cell.key)"
                (mouseleave)="hoverKey.set(null)"
              />
            }
            @for (cell of scene().cells; track cell.key) {
              @if (cell.labelText !== null) {
                <text
                  class="oge-chart-point-label"
                  [attr.x]="cell.x + cell.width / 2"
                  [attr.y]="cell.y + cell.height / 2 + 4"
                  text-anchor="middle"
                >
                  {{ cell.labelText }}
                </text>
              }
            }
          </g>
          @for (label of scene().xLabels; track label.index) {
            <text
              class="oge-chart-axis-label"
              [attr.x]="label.x"
              [attr.y]="label.y"
              [attr.text-anchor]="label.anchor"
            >
              {{ label.text }}
            </text>
          }
          @for (label of scene().yLabels; track label.index) {
            <text
              class="oge-chart-axis-label"
              [attr.x]="label.x"
              [attr.y]="label.y"
              [attr.text-anchor]="label.anchor"
            >
              {{ label.text }}
            </text>
          }
          @if (scene().cells.length === 0) {
            <text
              class="oge-chart-no-data"
              [attr.x]="width() / 2"
              [attr.y]="height() / 2"
              text-anchor="middle"
            >
              {{ msg().noData }}
            </text>
          }
        </svg>
        @if (tooltipVm(); as tip) {
          <div
            class="oge-chart-tooltip"
            [class.oge-chart-tooltip-end-x]="tip.flipX"
            [style.left.px]="tip.x"
            [style.top.px]="tip.y"
            aria-hidden="true"
          >
            <span class="oge-chart-tooltip-arg">{{ tip.label }}</span>
            <span class="oge-chart-tooltip-row">{{ tip.valueText }}</span>
          </div>
        }
      </div>
    </div>
    <table class="oge-chart-sr-table">
      <caption>
        {{
          msg().aria.tableCaption
        }}
      </caption>
      <thead>
        <tr>
          @for (header of srTable().headers; track $index) {
            <th scope="col">{{ header }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of srTable().rows; track $index) {
          <tr>
            <th scope="row">{{ row.argText }}</th>
            @for (cell of row.cells; track $index) {
              <td>{{ cell }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
    <div class="oge-chart-live" aria-live="polite">{{ announcement() }}</div>
  `,
})
export class OgeHeatmap<
  T extends object = Record<string, unknown>,
> extends OgeChartVisualRtlBase {
  readonly dataSource = input<readonly T[]>([]);
  /** Column category. Default `'x'`. */
  readonly xField = input<string | ((item: T) => unknown)>('x');
  /** Row category. Default `'y'`. */
  readonly yField = input<string | ((item: T) => unknown)>('y');
  readonly valueField = input<string | ((item: T) => unknown)>('value');
  /** Column order; default the order of first appearance. */
  readonly xCategories = input<readonly unknown[] | undefined>(undefined);
  /** Row order, top to bottom; default the order of first appearance. */
  readonly yCategories = input<readonly unknown[] | undefined>(undefined);
  /** `{ type?, min?, max?, colors?, ranges?, emptyColor?, labelFormat? }`. */
  readonly colorScale = input<OgeChartColorScale | undefined>(undefined);
  /** Values printed in the cells where they fit. Default true. */
  readonly showLabels = input(true);
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** Gap between cells, px. Default 2. */
  readonly cellGap = input(2);
  /** Column labels above or below the grid. Default `'bottom'`. */
  readonly xAxisPosition = input<'top' | 'bottom'>('bottom');
  /** The colour-scale legend: `visible`, `position`. */
  readonly legend = input<OgeChartLegendOptions>({});
  readonly tooltipEnabled = input(true);
  /** Selected cells (Enter / click toggles). Two-way. */
  readonly selectedCells = model<readonly OgeChartCellRef[]>([]);

  readonly cellClick = output<OgeChartHeatmapCellEvent<T>>();

  protected readonly hoverKey = signal<string | null>(null);
  protected readonly activeKey = signal<string | null>(null);
  protected readonly announcement = signal('');

  protected initialSize(): { width: number; height: number } {
    return { width: 480, height: 320 };
  }

  protected hasData(): boolean {
    return this.dataSource().length > 0;
  }

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildHeatmapScene<T>({
      dataSource: this.dataSource(),
      xField: this.xField(),
      yField: this.yField(),
      valueField: this.valueField(),
      xCategories: this.xCategories(),
      yCategories: this.yCategories(),
      colorScale: this.colorScale(),
      showLabels: this.showLabels(),
      valueFormat: this.valueFormat(),
      cellGap: this.cellGap(),
      xAxisPosition: this.xAxisPosition(),
      rtl: this.rtl(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );

  protected readonly legendVisible = computed(
    () => this.legend().visible !== false,
  );
  protected readonly legendPosition = computed(
    () => this.legend().position ?? 'bottom',
  );
  protected readonly srTable = computed(() =>
    heatmapSrTable(this.scene(), this.msg(), this.tableLimit()),
  );
  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled()
      ? heatmapTooltip(
          this.scene(),
          this.hoverKey() ?? this.activeKey(),
          this.width(),
        )
      : null,
  );

  protected isSelected(cell: OgeHeatmapCellVm<T>): boolean {
    return this.selectedCells().some(
      (ref) => ref.row === cell.row && ref.column === cell.column,
    );
  }

  protected onCellClick(cell: OgeHeatmapCellVm<T>): void {
    this.cellClick.emit(cell.payload);
    const current = untracked(this.selectedCells);
    const selected = current.some(
      (ref) => ref.row === cell.row && ref.column === cell.column,
    );
    this.selectedCells.set(
      selected
        ? current.filter(
            (ref) => ref.row !== cell.row || ref.column !== cell.column,
          )
        : [...current, { row: cell.row, column: cell.column }],
    );
    if (!selected) {
      const scene = untracked(this.scene);
      this.announcement.set(
        formatOgeChartMessage(this.msg().announcements.selected, {
          series: scene.yCategories[cell.row] ?? '',
          argument: formatOgeChartMessage(this.msg().visuals.item, {
            name: scene.xCategories[cell.column] ?? '',
            value: cell.valueText,
          }),
        }),
      );
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const scene = untracked(this.scene);
    const key = untracked(this.activeKey);
    const [row, column] =
      key === null ? [null, null] : key.split(':').map(Number);
    const command = chartGridKeyCommand(event.key, {
      rows: scene.rows,
      columns: scene.columns,
      row,
      column,
      ctrl: event.ctrlKey || event.metaKey,
      rtl: untracked(this.rtl),
    });
    if (command === null) return;
    event.preventDefault();
    if (command.type === 'move') {
      const cell = heatmapCell(scene, command.row, command.column);
      if (cell === undefined) return;
      this.activeKey.set(cell.key);
      this.announcement.set(heatmapAnnouncement(scene, cell, this.msg()));
      return;
    }
    const cell =
      row === null || column === null
        ? undefined
        : heatmapCell(scene, row, column);
    if (cell !== undefined) this.onCellClick(cell);
  }

  /** Moves the keyboard focus to the grid. */
  focus(): void {
    this.plotWrapEl().nativeElement.focus();
  }
}

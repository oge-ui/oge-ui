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
  buildChartHierarchy,
  buildTreemapScene,
  chartHierarchyDrillFocus,
  chartHierarchyKeyCommand,
  chartHierarchySrTable,
  chartHierarchyValueText,
  formatOgeChartMessage,
  treemapTooltip,
  type OgeChartColorScale,
  type OgeChartHierarchyNode,
  type OgeChartHierarchyNodeEvent,
  type OgeTreemapLayoutAlgorithm,
} from '@oge-ui/charts-engine';
import { OgeChartBreadcrumb } from './chart-breadcrumb';
import { OgeChartColorLegend } from './color-legend';
import { OgeChartVisualRtlBase } from './visual-base';

/**
 * `<oge-treemap>` — nested rectangles sized by value: squarified (or
 * slice-and-dice) tiling, group headers, fitted labels, palette colours
 * per top-level group (lightened by depth) or a value colour scale, and
 * drill-down — click a group or press Enter to make it the root, the
 * breadcrumb or Escape goes back up. Arrow keys walk siblings (Left/Right),
 * children (Down) and parents (Up). Nested or flat (`parentField`) data.
 * Commercial.
 *
 * ```html
 * <oge-treemap [dataSource]="regions" labelField="name" valueField="sales" />
 * ```
 */
@Component({
  selector: 'oge-treemap',
  imports: [OgeChartBreadcrumb, OgeChartColorLegend],
  styleUrls: ['./chart.scss', './visuals.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-treemap',
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
    '[attr.dir]': 'hostDir()',
    '[style]': 'animationVars()',
  },
  template: `
    @if (title()) {
      <div class="oge-chart-title">{{ title() }}</div>
    }
    @if (drillDown() && scene().breadcrumb.length > 1) {
      <oge-chart-breadcrumb
        [crumbs]="scene().breadcrumb"
        [label]="msg().visuals.breadcrumbLabel"
        (crumbClick)="drillTo($event)"
      />
    }
    <div class="oge-chart-layout">
      @if (scene().legend; as colorLegend) {
        <oge-chart-color-legend
          [legend]="colorLegend"
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
        [attr.aria-describedby]="uid + '-hint'"
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
            @for (tile of scene().tiles; track tile.key) {
              <rect
                class="oge-treemap-tile"
                [class.oge-treemap-group]="tile.nested"
                [class.oge-chart-item-active]="activeKey() === tile.key"
                [attr.x]="tile.x"
                [attr.y]="tile.y"
                [attr.width]="tile.width"
                [attr.height]="tile.height"
                [style.fill]="tile.fill"
                (click)="onTileClick(tile.node, $event)"
                (mouseenter)="hoverKey.set(tile.key)"
                (mouseleave)="hoverKey.set(null)"
              />
              @for (label of tile.labels; track $index) {
                <text
                  class="oge-chart-point-label oge-treemap-label"
                  [class.oge-treemap-label-strong]="label.strong"
                  [attr.x]="label.x"
                  [attr.y]="label.y"
                  [attr.text-anchor]="rtl() ? 'end' : 'start'"
                >
                  {{ label.text }}
                </text>
              }
            }
          </g>
          @if (scene().tiles.length === 0) {
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
    <div class="oge-chart-live" [id]="uid + '-hint'">
      {{ msg().visuals.drillHint }}
    </div>
    <div class="oge-chart-live" aria-live="polite">{{ announcement() }}</div>
  `,
})
export class OgeTreemap<
  T extends object = Record<string, unknown>,
> extends OgeChartVisualRtlBase {
  /** Nested items (`childrenField`) or a flat list (`idField` + `parentField`). */
  readonly dataSource = input<readonly T[]>([]);
  /** Default `'items'`. */
  readonly childrenField = input<string | ((item: T) => unknown)>('items');
  /** Flat data: an item's id. Default `'id'`. */
  readonly idField = input<string | ((item: T) => unknown)>('id');
  /** Flat data: the parent id — setting it switches to flat mode. */
  readonly parentField = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );
  readonly labelField = input<string | ((item: T) => unknown)>('name');
  /** Leaf value; groups sum their children. */
  readonly valueField = input<string | ((item: T) => unknown)>('value');
  readonly colorField = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );
  readonly layoutAlgorithm = input<OgeTreemapLayoutAlgorithm>('squarified');
  /** Levels drawn below the current root; unset = all. */
  readonly maxDepth = input<number | undefined>(undefined);
  /** Colour leaves by value through a colour scale (adds the legend). */
  readonly colorScale = input<OgeChartColorScale | undefined>(undefined);
  readonly palette = input<readonly string[] | undefined>(undefined);
  readonly showLabels = input(true);
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** Clicking / Enter on a group makes it the root. Default true. */
  readonly drillDown = input(true);
  readonly tooltipEnabled = input(true);
  /** The drill-down root's key (`''` = the whole tree). Two-way. */
  readonly rootKey = model('');

  readonly tileClick = output<OgeChartHierarchyNodeEvent<T>>();

  protected readonly hoverKey = signal<string | null>(null);
  protected readonly activeKey = signal<string | null>(null);
  protected readonly announcement = signal('');

  protected initialSize(): { width: number; height: number } {
    return { width: 520, height: 340 };
  }

  protected hasData(): boolean {
    return this.dataSource().length > 0;
  }

  private readonly hierarchy = computed(() =>
    buildChartHierarchy<T>({
      dataSource: this.dataSource(),
      childrenField: this.childrenField(),
      idField: this.idField(),
      parentField: this.parentField(),
      labelField: this.labelField(),
      valueField: this.valueField(),
      colorField: this.colorField(),
      rootLabel: this.msg().visuals.root,
    }),
  );

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildTreemapScene<T>({
      hierarchy: this.hierarchy(),
      rootKey: this.rootKey(),
      layoutAlgorithm: this.layoutAlgorithm(),
      maxDepth: this.maxDepth() ?? Infinity,
      colorScale: this.colorScale(),
      palette: this.palette(),
      showLabels: this.showLabels(),
      valueFormat: this.valueFormat(),
      rtl: this.rtl(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );

  protected readonly srTable = computed(() =>
    chartHierarchySrTable(
      this.scene().tiles.map((tile) => tile.node),
      this.scene().root,
      this.msg(),
      this.effectiveLocale(),
      this.tableLimit(),
      this.valueFormat(),
    ),
  );
  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled()
      ? treemapTooltip(
          this.scene(),
          this.hoverKey() ?? this.activeKey(),
          this.width(),
          this.effectiveLocale(),
        )
      : null,
  );

  protected onTileClick(
    node: OgeChartHierarchyNode<T>,
    event: MouseEvent,
  ): void {
    void event;
    this.activate(node);
  }

  private activate(node: OgeChartHierarchyNode<T>): void {
    const tile = untracked(this.scene).tiles.find((t) => t.key === node.key);
    if (tile !== undefined) this.tileClick.emit(tile.payload);
    if (untracked(this.drillDown) && node.children.length > 0) {
      this.drillTo(node.key);
      return;
    }
    this.announcement.set(
      chartHierarchyValueText(
        node,
        this.msg(),
        this.effectiveLocale(),
        this.valueFormat(),
      ),
    );
  }

  protected onKeydown(event: KeyboardEvent): void {
    const hierarchy = untracked(this.hierarchy);
    const scene = untracked(this.scene);
    const activeKey = untracked(this.activeKey);
    const command = chartHierarchyKeyCommand(event.key, {
      root: scene.root,
      active:
        activeKey === null ? null : (hierarchy.byKey.get(activeKey) ?? null),
      drillDown: untracked(this.drillDown),
      maxDepth: untracked(this.maxDepth) ?? Infinity,
      rtl: untracked(this.rtl),
    });
    if (command === null) return;
    event.preventDefault();
    switch (command.type) {
      case 'focus': {
        const node = hierarchy.byKey.get(command.key);
        if (node === undefined) return;
        this.activeKey.set(node.key);
        this.announcement.set(
          chartHierarchyValueText(
            node,
            this.msg(),
            this.effectiveLocale(),
            this.valueFormat(),
          ),
        );
        return;
      }
      case 'drill': {
        const node = hierarchy.byKey.get(command.key);
        if (node !== undefined) this.activate(node);
        return;
      }
      case 'up':
        this.drillUp();
        return;
      case 'activate': {
        const node = hierarchy.byKey.get(command.key);
        if (node !== undefined) this.activate(node);
        return;
      }
    }
  }

  /** Makes the node with `key` the root (`''` = the whole tree). */
  drillTo(key: string): void {
    const node = untracked(this.hierarchy).byKey.get(key);
    if (node === undefined) return;
    const previous = untracked(this.rootKey);
    if (previous === key) return;
    this.rootKey.set(key);
    const focus = chartHierarchyDrillFocus(previous, node);
    this.activeKey.set(focus.activeKey);
    this.announcement.set(
      formatOgeChartMessage(
        focus.up
          ? this.msg().visuals.drilledUp
          : this.msg().visuals.drilledDown,
        { name: node.name },
      ),
    );
  }

  /** Drills one level up (no-op at the top). */
  drillUp(): void {
    const root = untracked(this.scene).root;
    if (root.parent !== null) this.drillTo(root.parent.key);
  }

  /** Moves the keyboard focus to the plot. */
  focus(): void {
    this.plotWrapEl().nativeElement.focus();
  }
}

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
  buildSunburstScene,
  chartHierarchyDrillFocus,
  chartHierarchyKeyCommand,
  chartHierarchySrTable,
  chartHierarchyValueText,
  formatOgeChartMessage,
  sunburstTooltip,
  type OgeChartHierarchyNode,
  type OgeChartHierarchyNodeEvent,
} from '@oge-ui/charts-engine';
import { OgeChartBreadcrumb } from './chart-breadcrumb';
import { OgeChartVisualBase } from './visual-base';

/**
 * `<oge-sunburst-chart>` — a hierarchy as rings around a centre: one ring
 * per level, segments sized by value inside their parent's angle, radial
 * labels where they fit, palette colours per top-level branch (lightened
 * by depth) and drill-down — click a segment (or Enter) to re-root on it,
 * the centre, the breadcrumb or Escape goes back up. Arrow keys walk
 * siblings, children and parents. Commercial.
 *
 * ```html
 * <oge-sunburst-chart [dataSource]="org" labelField="name" valueField="headcount" />
 * ```
 */
@Component({
  selector: 'oge-sunburst-chart',
  imports: [OgeChartBreadcrumb],
  styleUrls: ['./chart.scss', './visuals.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-sunburst-chart',
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
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
            @for (segment of scene().segments; track segment.key) {
              <path
                class="oge-sunburst-segment"
                [class.oge-chart-item-active]="activeKey() === segment.key"
                [attr.d]="segment.path"
                [style.fill]="segment.fill"
                (click)="activate(segment.node)"
                (mouseenter)="hoverKey.set(segment.key)"
                (mouseleave)="hoverKey.set(null)"
              />
            }
            @for (segment of scene().segments; track segment.key) {
              @if (segment.label; as label) {
                <text
                  class="oge-chart-point-label oge-treemap-label"
                  [attr.x]="label.x"
                  [attr.y]="label.y + 4"
                  text-anchor="middle"
                  [attr.transform]="
                    'rotate(' +
                    label.rotate +
                    ' ' +
                    label.x +
                    ' ' +
                    label.y +
                    ')'
                  "
                >
                  {{ label.text }}
                </text>
              }
            }
          </g>
          @if (scene().holeRadius > 0 && scene().segments.length > 0) {
            <circle
              class="oge-sunburst-center"
              [class.oge-sunburst-center-up]="scene().root.parent !== null"
              [attr.cx]="scene().cx"
              [attr.cy]="scene().cy"
              [attr.r]="scene().holeRadius - 2"
              (click)="drillUp()"
            />
            @if (scene().center.name; as name) {
              <text
                class="oge-sunburst-center-name"
                [attr.x]="scene().cx"
                [attr.y]="scene().cy"
                text-anchor="middle"
              >
                {{ name }}
              </text>
            }
            @if (scene().center.value; as value) {
              <text
                class="oge-sunburst-center-value"
                [attr.x]="scene().cx"
                [attr.y]="scene().cy + 15"
                text-anchor="middle"
              >
                {{ value }}
              </text>
            }
          }
          @if (scene().segments.length === 0) {
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
export class OgeSunburstChart<
  T extends object = Record<string, unknown>,
> extends OgeChartVisualBase {
  /** Nested items (`childrenField`) or a flat list (`idField` + `parentField`). */
  readonly dataSource = input<readonly T[]>([]);
  readonly childrenField = input<string | ((item: T) => unknown)>('items');
  readonly idField = input<string | ((item: T) => unknown)>('id');
  readonly parentField = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );
  readonly labelField = input<string | ((item: T) => unknown)>('name');
  readonly valueField = input<string | ((item: T) => unknown)>('value');
  readonly colorField = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );
  /** Rings drawn below the current root; unset = all. */
  readonly maxDepth = input<number | undefined>(undefined);
  /** Centre hole as a fraction of the radius. Default 0.25. */
  readonly innerRadius = input(0.25);
  /** Radians; 0 = 12 o'clock, clockwise. */
  readonly startAngle = input(0);
  readonly palette = input<readonly string[] | undefined>(undefined);
  readonly showLabels = input(true);
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** Clicking / Enter on a branch re-roots on it. Default true. */
  readonly drillDown = input(true);
  readonly tooltipEnabled = input(true);
  /** The drill-down root's key (`''` = the whole tree). Two-way. */
  readonly rootKey = model('');

  readonly segmentClick = output<OgeChartHierarchyNodeEvent<T>>();

  protected readonly hoverKey = signal<string | null>(null);
  protected readonly activeKey = signal<string | null>(null);
  protected readonly announcement = signal('');

  protected initialSize(): { width: number; height: number } {
    return { width: 400, height: 400 };
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
    buildSunburstScene<T>({
      hierarchy: this.hierarchy(),
      rootKey: this.rootKey(),
      maxDepth: this.maxDepth() ?? Infinity,
      innerRadius: this.innerRadius(),
      startAngle: this.startAngle(),
      palette: this.palette(),
      showLabels: this.showLabels(),
      valueFormat: this.valueFormat(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );

  protected readonly srTable = computed(() =>
    chartHierarchySrTable(
      this.scene().segments.map((segment) => segment.node),
      this.scene().root,
      this.msg(),
      this.effectiveLocale(),
      this.tableLimit(),
      this.valueFormat(),
    ),
  );
  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled()
      ? sunburstTooltip(
          this.scene(),
          this.hoverKey() ?? this.activeKey(),
          this.effectiveLocale(),
        )
      : null,
  );

  protected activate(node: OgeChartHierarchyNode<T>): void {
    const segment = untracked(this.scene).segments.find(
      (entry) => entry.key === node.key,
    );
    if (segment !== undefined) this.segmentClick.emit(segment.payload);
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
    const activeKey = untracked(this.activeKey);
    const command = chartHierarchyKeyCommand(event.key, {
      root: untracked(this.scene).root,
      active:
        activeKey === null ? null : (hierarchy.byKey.get(activeKey) ?? null),
      drillDown: untracked(this.drillDown),
      maxDepth: untracked(this.maxDepth) ?? Infinity,
    });
    if (command === null) return;
    event.preventDefault();
    if (command.type === 'up') {
      this.drillUp();
      return;
    }
    const node = hierarchy.byKey.get(command.key);
    if (node === undefined) return;
    if (command.type === 'focus') {
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
    this.activate(node);
  }

  /** Re-roots on the node with `key` (`''` = the whole tree). */
  drillTo(key: string): void {
    const node = untracked(this.hierarchy).byKey.get(key);
    const previous = untracked(this.rootKey);
    if (node === undefined || previous === key) return;
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

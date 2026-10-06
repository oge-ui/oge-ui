import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  buildSankeyScene,
  chartColumnsKeyCommand,
  sankeyHighlight,
  sankeyNodeText,
  sankeySrTable,
  sankeyTooltip,
  type OgeChartSankeyLinkEvent,
  type OgeChartSankeyNodeEvent,
  type OgeSankeyLinkColor,
  type OgeSankeyLinkVm,
  type OgeSankeyNode,
  type OgeSankeyNodeAlign,
  type OgeSankeyNodeVm,
} from '@oge-ui/charts-engine';
import { OgeChartVisualRtlBase } from './visual-base';

type SankeyHover = { readonly kind: 'node' | 'link'; readonly index: number };

/**
 * `<oge-sankey-chart>` — flows between nodes: columns from the longest
 * path, node heights proportional to throughput, relaxed positions, link
 * bands coloured by their source (or target), hover highlighting (a node
 * lights its links, a link its two nodes), cycles tolerated and the flow
 * mirrored in RTL. Keyboard: Up/Down within a column, Left/Right across
 * columns, Enter activates; the screen-reader table lists every flow.
 * Commercial.
 *
 * ```html
 * <oge-sankey-chart [dataSource]="flows" sourceField="from" targetField="to" valueField="amount" />
 * ```
 */
@Component({
  selector: 'oge-sankey-chart',
  styleUrls: ['./chart.scss', './visuals.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-sankey-chart',
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
    '[attr.dir]': 'hostDir()',
    '[style]': 'animationVars()',
  },
  template: `
    @if (title()) {
      <div class="oge-chart-title">{{ title() }}</div>
    }
    <div class="oge-chart-layout">
      <div
        #plotWrap
        class="oge-chart-plot-wrap"
        tabindex="0"
        role="group"
        [attr.aria-label]="scene().ariaLabel"
        (keydown)="onKeydown($event)"
        (pointerleave)="hover.set(null)"
      >
        <svg
          #svgEl
          class="oge-chart-svg"
          role="img"
          [attr.aria-label]="scene().ariaLabel"
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
          (pointermove)="onPointerMove($event)"
        >
          <g [class.oge-chart-visual-enter]="drawingIn()">
            @for (link of scene().links; track link.key) {
              <path
                class="oge-sankey-link"
                [class.oge-sankey-link-lit]="isLinkLit(link)"
                [class.oge-sankey-dim]="isLinkDim(link)"
                [attr.d]="link.path"
                [style.fill]="link.color"
                (click)="onLinkClick(link)"
                (mouseenter)="hover.set({ kind: 'link', index: link.index })"
              />
            }
            @for (node of scene().nodes; track node.index) {
              <rect
                class="oge-sankey-node"
                [class.oge-sankey-dim]="isNodeDim(node)"
                [class.oge-chart-item-active]="activeIndex() === node.index"
                [attr.x]="node.x"
                [attr.y]="node.y"
                [attr.width]="node.width"
                [attr.height]="node.height"
                [style.fill]="node.color"
                (click)="onNodeClick(node)"
                (mouseenter)="hover.set({ kind: 'node', index: node.index })"
              />
            }
          </g>
          @for (node of scene().nodes; track node.index) {
            @if (node.labelVm; as label) {
              <text
                class="oge-chart-point-label"
                [attr.x]="label.x"
                [attr.y]="label.y"
                [attr.text-anchor]="label.anchor"
              >
                {{ label.text }}
              </text>
            }
          }
          @if (scene().nodes.length === 0) {
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
export class OgeSankeyChart<
  T extends object = Record<string, unknown>,
> extends OgeChartVisualRtlBase {
  /** One item per link. */
  readonly dataSource = input<readonly T[]>([]);
  readonly sourceField = input<string | ((item: T) => unknown)>('source');
  readonly targetField = input<string | ((item: T) => unknown)>('target');
  readonly valueField = input<string | ((item: T) => unknown)>('value');
  /** Optional per-node `{ id, label?, color? }` (also fixes the node order). */
  readonly nodes = input<readonly OgeSankeyNode[]>([]);
  /** Node bar width, px. Default 14. */
  readonly nodeWidth = input(14);
  /** Vertical gap between the nodes of a column, px. Default 12. */
  readonly nodePadding = input(12);
  /** `'justify'` (sinks in the last column), `'left'`, `'right'`, `'center'`. */
  readonly nodeAlign = input<OgeSankeyNodeAlign>('justify');
  /** Link bands take the `'source'` (default) or `'target'` colour, or a `'neutral'` grey. */
  readonly linkColor = input<OgeSankeyLinkColor>('source');
  readonly showLabels = input(true);
  readonly palette = input<readonly string[] | undefined>(undefined);
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  readonly tooltipEnabled = input(true);

  readonly nodeClick = output<OgeChartSankeyNodeEvent>();
  readonly linkClick = output<OgeChartSankeyLinkEvent<T>>();

  protected readonly hover = signal<SankeyHover | null>(null);
  protected readonly activeIndex = signal<number | null>(null);
  protected readonly announcement = signal('');
  private readonly pointer = signal<{ x: number; y: number } | null>(null);

  protected initialSize(): { width: number; height: number } {
    return { width: 560, height: 340 };
  }

  protected hasData(): boolean {
    return this.dataSource().length > 0;
  }

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildSankeyScene<T>({
      dataSource: this.dataSource(),
      sourceField: this.sourceField(),
      targetField: this.targetField(),
      valueField: this.valueField(),
      nodes: this.nodes(),
      nodeWidth: this.nodeWidth(),
      nodePadding: this.nodePadding(),
      nodeAlign: this.nodeAlign(),
      linkColor: this.linkColor(),
      showLabels: this.showLabels(),
      palette: this.palette(),
      rtl: this.rtl(),
      valueFormat: this.valueFormat(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );

  /** The keyboard's active node counts as a hover for the highlight. */
  private readonly highlightTarget = computed<SankeyHover | null>(() => {
    const hover = this.hover();
    if (hover !== null) return hover;
    const active = this.activeIndex();
    return active === null ? null : { kind: 'node', index: active };
  });
  private readonly highlight = computed(() =>
    sankeyHighlight(this.scene(), this.highlightTarget()),
  );
  protected readonly srTable = computed(() =>
    sankeySrTable(this.scene(), this.msg(), this.tableLimit()),
  );
  protected readonly tooltipVm = computed(() =>
    this.tooltipEnabled()
      ? sankeyTooltip(
          this.scene(),
          this.highlightTarget(),
          this.msg(),
          this.width(),
          this.effectiveLocale(),
          this.hover()?.kind === 'link'
            ? (this.pointer() ?? undefined)
            : undefined,
        )
      : null,
  );

  protected isLinkLit(link: OgeSankeyLinkVm<T>): boolean {
    return this.highlight()?.links.has(link.index) === true;
  }

  protected isLinkDim(link: OgeSankeyLinkVm<T>): boolean {
    const lit = this.highlight();
    return lit !== null && !lit.links.has(link.index);
  }

  protected isNodeDim(node: OgeSankeyNodeVm): boolean {
    const lit = this.highlight();
    return lit !== null && !lit.nodes.has(node.index);
  }

  protected onPointerMove(event: PointerEvent): void {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    this.pointer.set({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  protected onNodeClick(node: OgeSankeyNodeVm): void {
    this.nodeClick.emit(node.payload);
    this.announcement.set(this.nodeText(node));
  }

  protected onLinkClick(link: OgeSankeyLinkVm<T>): void {
    this.linkClick.emit(link.payload);
  }

  private nodeText(node: OgeSankeyNodeVm): string {
    return sankeyNodeText(
      node,
      this.msg(),
      this.effectiveLocale(),
      this.valueFormat(),
    );
  }

  protected onKeydown(event: KeyboardEvent): void {
    const scene = untracked(this.scene);
    const command = chartColumnsKeyCommand(event.key, {
      columns: scene.columns,
      index: untracked(this.activeIndex),
      rtl: untracked(this.rtl),
    });
    if (command === null) return;
    event.preventDefault();
    if (command.type === 'move') {
      const node = scene.nodes.find((entry) => entry.index === command.index);
      if (node === undefined) return;
      this.activeIndex.set(node.index);
      this.announcement.set(this.nodeText(node));
      return;
    }
    const node = scene.nodes.find(
      (entry) => entry.index === untracked(this.activeIndex),
    );
    if (node !== undefined) this.onNodeClick(node);
  }

  /** Moves the keyboard focus to the plot. */
  focus(): void {
    this.plotWrapEl().nativeElement.focus();
  }
}

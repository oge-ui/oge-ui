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
  viewChild,
  type ElementRef,
} from '@angular/core';
import {
  OGE_MAP_HOME_VIEW,
  beginChartGesture,
  buildMapScene,
  chartMapKeyCommand,
  createChartPinchTracker,
  formatOgeChartMessage,
  mapEnsureVisible,
  mapPanBy,
  mapRegionLabel,
  mapSrTable,
  mapViewTransform,
  mapZoomAt,
  type OgeChartColorScale,
  type OgeChartLegendOptions,
  type OgeChartMapRegionEvent,
  type OgeGeoJsonFeature,
  type OgeGeoJsonFeatureCollection,
  type OgeMapProjection,
  type OgeMapRegionVm,
  type OgeMapView,
} from '@oge-ui/charts-engine';
import { OgeChartColorLegend } from './color-legend';
import { OgeChartVisualBase } from './visual-base';

/**
 * `<oge-vector-map>` — a choropleth over GeoJSON polygons: equirectangular
 * or Mercator projection fitted to the box, region fills from a colour
 * scale joined to your data by key, region labels where they fit, wheel /
 * button / pinch zoom and drag pan on the shared chart gesture machine,
 * and keyboard region navigation (arrows move to the nearest region in
 * that direction, `+`/`-` zoom, Shift+arrows pan, `0` resets, Enter
 * selects). No tiles and no projection library. Commercial.
 *
 * ```html
 * <oge-vector-map [geoJson]="regions" [dataSource]="sales" keyField="region" valueField="total" />
 * ```
 */
@Component({
  selector: 'oge-vector-map',
  imports: [OgeChartColorLegend],
  styleUrls: ['./chart.scss', './visuals.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chart oge-vector-map',
    '[class.oge-chart-static]': '!resolvedAnimation().transitions',
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
      @if (legendVisible() && scene().regions.length > 0) {
        <oge-chart-color-legend
          [legend]="scene().legend"
          [label]="msg().visuals.colorScaleLabel"
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
        (pointerleave)="hoverIndex.set(null)"
      >
        @if (zoomEnabled()) {
          <div class="oge-map-controls">
            <button
              type="button"
              class="oge-map-control"
              [attr.aria-label]="msg().visuals.zoomIn"
              [disabled]="view().zoom >= maxZoom()"
              (click)="zoomIn()"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  stroke-width="1.6"
                  fill="none"
                />
              </svg>
            </button>
            <button
              type="button"
              class="oge-map-control"
              [attr.aria-label]="msg().visuals.zoomOut"
              [disabled]="view().zoom <= 1"
              (click)="zoomOut()"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M3 8h10"
                  stroke="currentColor"
                  stroke-width="1.6"
                  fill="none"
                />
              </svg>
            </button>
            <button
              type="button"
              class="oge-map-control"
              [attr.aria-label]="msg().visuals.resetZoom"
              [disabled]="view().zoom === 1"
              (click)="resetZoom()"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2M3.5 2.5v2.6h2.6"
                  stroke="currentColor"
                  stroke-width="1.5"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        }
        <svg
          #svgEl
          class="oge-chart-svg oge-map-svg"
          [class.oge-map-dragging]="dragging()"
          role="img"
          [attr.aria-label]="scene().ariaLabel"
          [attr.width]="width()"
          [attr.height]="height()"
          [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
          (pointerdown)="onPointerDown($event)"
        >
          <g
            [attr.transform]="transform()"
            [class.oge-chart-visual-enter]="drawingIn()"
          >
            @for (region of scene().regions; track region.key) {
              <path
                class="oge-map-region"
                [class.oge-map-region-empty]="region.empty"
                [class.oge-chart-point-selected]="isSelected(region)"
                [class.oge-chart-item-active]="activeIndex() === region.index"
                [attr.d]="region.path"
                [style.fill]="region.fill"
                (click)="onRegionClick(region)"
                (mouseenter)="hoverIndex.set(region.index)"
              />
            }
            @if (showLabels()) {
              @for (label of labels(); track label.key) {
                <text
                  class="oge-map-label"
                  [attr.x]="label.x"
                  [attr.y]="label.y"
                  text-anchor="middle"
                  [style.font-size.px]="11 / view().zoom"
                  [style.stroke-width.px]="3 / view().zoom"
                >
                  {{ label.text }}
                </text>
              }
            }
          </g>
          @if (scene().regions.length === 0) {
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
      {{ msg().visuals.mapHint }}
    </div>
    <div class="oge-chart-live" aria-live="polite">{{ announcement() }}</div>
  `,
})
export class OgeVectorMap<
  T extends object = Record<string, unknown>,
> extends OgeChartVisualBase {
  /** A GeoJSON `FeatureCollection`; `Polygon` and `MultiPolygon` features are drawn. */
  readonly geoJson = input<OgeGeoJsonFeatureCollection | null>(null);
  /** `'mercator'` (default) or `'equirectangular'`. */
  readonly projection = input<OgeMapProjection>('mercator');
  /** A feature's key; default `feature.id`, then `properties.name`. */
  readonly regionKey = input<
    ((feature: OgeGeoJsonFeature) => string) | undefined
  >(undefined);
  /** Feature property holding the region name. Default `'name'`. */
  readonly nameField = input('name');
  /** The values, joined to the regions by `keyField`. */
  readonly dataSource = input<readonly T[]>([]);
  readonly keyField = input<string | ((item: T) => unknown)>('key');
  readonly valueField = input<string | ((item: T) => unknown)>('value');
  readonly colorScale = input<OgeChartColorScale | undefined>(undefined);
  readonly showLabels = input(true);
  readonly valueFormat = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** The colour-scale legend: `visible`, `position`. */
  readonly legend = input<OgeChartLegendOptions>({});
  readonly tooltipEnabled = input(true);
  /** Wheel, pinch, button and keyboard zoom plus drag pan. Default true. */
  readonly zoomEnabled = input(true);
  /** Default 8. */
  readonly maxZoom = input(8);
  /** Selected region keys. Two-way. */
  readonly selectedRegions = model<readonly string[]>([]);

  readonly regionClick = output<OgeChartMapRegionEvent<T>>();

  private readonly svgRef =
    viewChild.required<ElementRef<SVGSVGElement>>('svgEl');
  protected readonly view = signal<OgeMapView>(OGE_MAP_HOME_VIEW);
  protected readonly hoverIndex = signal<number | null>(null);
  protected readonly activeIndex = signal<number | null>(null);
  protected readonly announcement = signal('');
  protected readonly dragging = signal(false);
  private suppressClick = false;
  private readonly pinch = createChartPinchTracker({
    onPinchStart: () => {
      this.pinchStartView = untracked(this.view);
    },
    onPinch: (startA, startB, a, b) => {
      const rect = this.svgRef().nativeElement.getBoundingClientRect();
      const d0 = Math.hypot(
        startB.clientX - startA.clientX,
        startB.clientY - startA.clientY,
      );
      const d1 = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const start = this.pinchStartView;
      if (d0 <= 0 || start === null) return;
      const cx = (a.clientX + b.clientX) / 2 - rect.left;
      const cy = (a.clientY + b.clientY) / 2 - rect.top;
      const scx = (startA.clientX + startB.clientX) / 2 - rect.left;
      const scy = (startA.clientY + startB.clientY) / 2 - rect.top;
      const zoomed = mapZoomAt(
        start,
        d1 / d0,
        scx,
        scy,
        untracked(this.width),
        untracked(this.height),
        untracked(this.maxZoom),
      );
      this.view.set(
        mapPanBy(
          zoomed,
          cx - scx,
          cy - scy,
          untracked(this.width),
          untracked(this.height),
          untracked(this.maxZoom),
        ),
      );
    },
    onPinchEnd: () => {
      this.pinchStartView = null;
    },
  });
  private pinchStartView: OgeMapView | null = null;

  protected initialSize(): { width: number; height: number } {
    return { width: 560, height: 340 };
  }

  protected hasData(): boolean {
    return (this.geoJson()?.features.length ?? 0) > 0;
  }

  protected override afterFirstRender(): void {
    const svg = this.svgRef().nativeElement;
    // React's onWheel is passive — and so is Angular's (wheel) here: a zoom
    // that must preventDefault needs a native non-passive listener
    const onWheel = (event: WheelEvent): void => {
      if (!untracked(this.zoomEnabled)) return;
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      this.view.set(
        mapZoomAt(
          untracked(this.view),
          event.deltaY < 0 ? 1.25 : 1 / 1.25,
          event.clientX - rect.left,
          event.clientY - rect.top,
          untracked(this.width),
          untracked(this.height),
          untracked(this.maxZoom),
        ),
      );
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    this.destroyRef.onDestroy(() => {
      svg.removeEventListener('wheel', onWheel);
      this.pinch.dispose();
    });
  }

  /** The engine's view model (ADR 0003). */
  protected readonly scene = computed(() =>
    buildMapScene<T>({
      geoJson: this.geoJson(),
      projection: this.projection(),
      regionKey: this.regionKey(),
      nameField: this.nameField(),
      dataSource: this.dataSource(),
      keyField: this.keyField(),
      valueField: this.valueField(),
      colorScale: this.colorScale(),
      showLabels: this.showLabels(),
      valueFormat: this.valueFormat(),
      title: this.title(),
      width: this.width(),
      height: this.height(),
      locale: this.effectiveLocale(),
      messages: this.msg(),
    }),
  );

  protected readonly transform = computed(() => mapViewTransform(this.view()));
  protected readonly labels = computed(() => {
    const zoom = this.view().zoom;
    return this.scene().regions.flatMap((region) => {
      const label = mapRegionLabel(region, zoom);
      return label === null ? [] : [{ ...label, key: region.key }];
    });
  });
  protected readonly legendVisible = computed(
    () => this.legend().visible !== false,
  );
  protected readonly legendPosition = computed(
    () => this.legend().position ?? 'bottom',
  );
  protected readonly srTable = computed(() =>
    mapSrTable(this.scene(), this.msg(), this.tableLimit()),
  );
  protected readonly tooltipVm = computed(() => {
    if (!this.tooltipEnabled()) return null;
    const index = this.hoverIndex() ?? this.activeIndex();
    const region = index === null ? undefined : this.scene().regions[index];
    if (region === undefined) return null;
    const view = this.view();
    const x = view.x + region.centroid.x * view.zoom;
    const flipX = x > this.width() / 2;
    return {
      x: flipX ? x - 10 : x + 10,
      y: view.y + region.centroid.y * view.zoom,
      label: region.name,
      valueText: region.valueText,
      flipX,
    };
  });

  protected isSelected(region: OgeMapRegionVm<T>): boolean {
    return this.selectedRegions().includes(region.key);
  }

  protected onRegionClick(region: OgeMapRegionVm<T>): void {
    if (this.suppressClick) return;
    this.regionClick.emit(region.payload);
    const current = untracked(this.selectedRegions);
    const selected = current.includes(region.key);
    this.selectedRegions.set(
      selected
        ? current.filter((key) => key !== region.key)
        : [...current, region.key],
    );
    if (!selected) {
      this.announcement.set(
        formatOgeChartMessage(this.msg().announcements.selected, {
          series: region.name,
          argument: region.valueText,
        }),
      );
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!untracked(this.zoomEnabled)) return;
    if (this.pinch.pointerDown(event)) return;
    if (event.button !== 0 || this.pinch.active) return;
    const start = untracked(this.view);
    if (start.zoom <= 1) return;
    beginChartGesture(event, {
      onMove: (dx, dy) => {
        this.dragging.set(true);
        this.view.set(
          mapPanBy(
            start,
            dx,
            dy,
            untracked(this.width),
            untracked(this.height),
            untracked(this.maxZoom),
          ),
        );
      },
      onFinish: (commit, cancelled) => {
        this.dragging.set(false);
        if (cancelled) this.view.set(start);
        if (commit) {
          // the click that ends a drag is not a region click
          this.suppressClick = true;
          setTimeout(() => (this.suppressClick = false));
        }
      },
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const scene = untracked(this.scene);
    const width = untracked(this.width);
    const height = untracked(this.height);
    const maxZoom = untracked(this.maxZoom);
    const command = chartMapKeyCommand(event.key, {
      centroids: scene.regions.map((region) => region.centroid),
      index: untracked(this.activeIndex),
      shift: event.shiftKey,
      panStep: width * 0.1,
    });
    if (command === null) return;
    const zooming =
      command.type === 'zoom' ||
      command.type === 'pan' ||
      command.type === 'reset';
    if (zooming && !untracked(this.zoomEnabled)) return;
    event.preventDefault();
    switch (command.type) {
      case 'move': {
        const region = scene.regions[command.index];
        if (region === undefined) return;
        this.activeIndex.set(region.index);
        this.view.set(
          mapEnsureVisible(
            untracked(this.view),
            region.centroid,
            width,
            height,
            maxZoom,
          ),
        );
        this.announcement.set(
          formatOgeChartMessage(this.msg().visuals.item, {
            name: region.name,
            value: region.valueText,
          }),
        );
        return;
      }
      case 'zoom':
        this.view.set(
          mapZoomAt(
            untracked(this.view),
            command.factor,
            width / 2,
            height / 2,
            width,
            height,
            maxZoom,
          ),
        );
        return;
      case 'pan':
        this.view.set(
          mapPanBy(
            untracked(this.view),
            command.dx,
            command.dy,
            width,
            height,
            maxZoom,
          ),
        );
        return;
      case 'reset':
        this.view.set(OGE_MAP_HOME_VIEW);
        return;
      case 'activate': {
        const index = untracked(this.activeIndex);
        const region = index === null ? undefined : scene.regions[index];
        if (region !== undefined) this.onRegionClick(region);
        return;
      }
    }
  }

  /** Zooms in about the centre. */
  zoomIn(): void {
    const width = untracked(this.width);
    const height = untracked(this.height);
    this.view.set(
      mapZoomAt(
        untracked(this.view),
        1.5,
        width / 2,
        height / 2,
        width,
        height,
        untracked(this.maxZoom),
      ),
    );
  }

  /** Zooms out about the centre. */
  zoomOut(): void {
    const width = untracked(this.width);
    const height = untracked(this.height);
    this.view.set(
      mapZoomAt(
        untracked(this.view),
        1 / 1.5,
        width / 2,
        height / 2,
        width,
        height,
        untracked(this.maxZoom),
      ),
    );
  }

  /** Back to the fitted view. */
  resetZoom(): void {
    this.view.set(OGE_MAP_HOME_VIEW);
  }

  /** Moves the keyboard focus to the map. */
  focus(): void {
    this.plotWrapEl().nativeElement.focus();
  }
}

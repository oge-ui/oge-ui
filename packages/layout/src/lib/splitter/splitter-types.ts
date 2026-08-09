/** Axis the panes are laid out along. */
export type OgeSplitterOrientation = 'horizontal' | 'vertical';

/**
 * Which neighbour a separator's collapse grip acts on: `'start'` is the pane
 * before it (the APG primary pane), `'end'` the one after.
 */
export type OgeSplitterGripSide = 'start' | 'end';

/**
 * A pane size, minimum, maximum or collapsed size.
 *
 * A **number** is a share of the space the flexible panes divide between them —
 * a ratio, not a percentage, so `[30, 30]` lays out exactly like `[50, 50]`. A
 * **`'<n>%'` string** means the same thing. A **`'<n>px'` string** pins the pane
 * to that width (or height) and takes it out of the share pool. Any other
 * string is ignored with a dev-mode warning.
 */
export type OgeSplitterSize = number | string;

/** Data-driven counterpart of a declarative `<oge-splitter-pane>`. */
export interface OgeSplitterPaneData {
  /** Stable identity used by DOM ids and the collapse API. */
  key?: string;
  /** Initial size — a share number, `'40%'` or `'240px'`. */
  size?: OgeSplitterSize;
  /** Smallest size a resize may leave this pane at. */
  minSize?: OgeSplitterSize;
  /** Largest size a resize may grow this pane to. */
  maxSize?: OgeSplitterSize;
  /** Allows the pane to be collapsed from its separator (Enter or the grip). */
  collapsible?: boolean;
  /** Initial collapsed state. */
  collapsed?: boolean;
  /** Size the pane keeps while collapsed. Defaults to `0`. */
  collapsedSize?: OgeSplitterSize;
  /** `false` pins the pane — its separators cannot be dragged. */
  resizable?: boolean;
  /** `false` clips overflowing content instead of scrolling it. */
  scrollable?: boolean;
  /** `false` removes the pane entirely. */
  visible?: boolean;
  /** Plain-text body, rendered when the pane has no content template. */
  text?: string;
  /** Extra class on the pane element. */
  cssClass?: string;
  /**
   * Extra attributes on the pane element (`data-*`, `title`, …). Keys removed
   * from the bag are removed from the DOM, so clearing it clears the element.
   */
  htmlAttributes?: Readonly<Record<string, string>>;
  /** Nested splitter inside this pane. */
  panes?: readonly OgeSplitterPaneData[];
  /** Axis of the nested splitter — defaults to the opposite of the parent's. */
  orientation?: OgeSplitterOrientation;
}

/** Context of `[ogeSplitterPaneTemplate]`. */
export interface OgeSplitterPaneTemplateContext {
  /** The `panes` entry being rendered. */
  $implicit: OgeSplitterPaneData;
  index: number;
  collapsed: boolean;
}

/** Emitted when a resize gesture starts. */
export interface OgeSplitterResizeStartEvent {
  /** Index of the separator being dragged — it sits after pane `separatorIndex`. */
  readonly separatorIndex: number;
  /** Pane sizes at the moment the gesture started. */
  readonly sizes: readonly OgeSplitterSize[];
  /** The originating event, absent for a keyboard resize. */
  readonly event?: Event;
}

/** Emitted continuously during a resize, and once more when it ends. */
export interface OgeSplitterResizeEvent {
  readonly separatorIndex: number;
  /** Current pane sizes. */
  readonly sizes: readonly OgeSplitterSize[];
  /** Sizes at the start of the gesture. */
  readonly previousSizes: readonly OgeSplitterSize[];
  readonly event?: Event;
}

/** Cancelable pre-event of a pane collapsing or expanding. */
export interface OgeSplitterPaneCollapsingEvent {
  readonly index: number;
  readonly key?: string;
  /** The source `panes` entry — `undefined` for a declarative pane. */
  readonly item?: OgeSplitterPaneData;
  readonly event?: Event;
  /** Set to `true` to block the change. */
  cancel: boolean;
}

/** Emitted after a pane collapsed or expanded. */
export interface OgeSplitterPaneCollapsedEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeSplitterPaneData;
  readonly event?: Event;
}

/** Emitted when a pane is clicked. */
/** A pane was held (long press) or right-clicked. */
export interface OgeSplitterPaneHoldEvent {
  index: number;
  key?: string;
  item?: OgeSplitterPaneData;
  event: Event;
}

export interface OgeSplitterPaneClickEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeSplitterPaneData;
  readonly event: MouseEvent;
}

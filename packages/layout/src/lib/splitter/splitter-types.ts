// The splitter's vocabulary and event payloads live framework-free in
// `@oge-ui/behavior` (`splitter-core`), shared with the React render layer;
// this file re-exports them under the package's public names and adds the one
// Angular-only shape (the template context).
export type {
  OgeSplitterOrientation,
  OgeSplitterGripSide,
  OgeSplitterSize,
  OgeSplitterPaneData,
  OgeSplitterResizeStartEvent,
  OgeSplitterResizeEvent,
  OgeSplitterPaneCollapsingEvent,
  OgeSplitterPaneCollapsedEvent,
  OgeSplitterPaneHoldEvent,
  OgeSplitterPaneClickEvent,
} from '@oge-ui/behavior';

import type { OgeSplitterPaneData } from '@oge-ui/behavior';

/** Context of `[ogeSplitterPaneTemplate]`. */
export interface OgeSplitterPaneTemplateContext {
  /** The `panes` entry being rendered. */
  $implicit: OgeSplitterPaneData;
  index: number;
  collapsed: boolean;
}

import type { TemplateRef } from '@angular/core';
import type { OgeSplitterDescriptorCore } from '@oge-ui/behavior';
import type { OgeSplitterPane } from './splitter-pane';

/**
 * Normalized view of one pane — declarative children and `panes` entries are
 * merged into this shape before rendering. Module-internal (not exported from
 * the package barrel).
 *
 * The render-layer-agnostic half is `OgeSplitterDescriptorCore` in
 * `@oge-ui/behavior`; this adds the two Angular-only slots.
 */
export interface OgeSplitterDescriptor extends OgeSplitterDescriptorCore {
  /** The declarative child — `undefined` for `panes` entries. Two-way target. */
  readonly source?: OgeSplitterPane;
  readonly contentTemplate?: TemplateRef<unknown>;
}

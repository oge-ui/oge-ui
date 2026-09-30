// `@oge-ui/react-grid/foundation` — the React counterpart of Angular's
// `@oge-ui/grid/foundation`: the render-layer building blocks another
// grid-like React family composes (today `@oge-ui/react-tree-list`, exactly
// as the Angular tree list builds on `@oge-ui/grid/foundation`).
//
// Shared with sibling packages rather than part of the grid's own public API:
// apps use `<OgeGrid>` and never need these, which is why they live in a
// secondary entry instead of the primary barrel. The engine itself is in
// `@oge-ui/behavior`; what is here is only the React half of it.
export {
  OgeGridEditingModel,
  type OgeGridEditingModelDeps,
  type OgeGridEditorEntry,
} from './lib/grid-editing';
export { createGridRxAdapter, type OgeGridRxAdapter } from './lib/rx-adapter';
export {
  OgeFilterBuilderGroup,
  type OgeFilterBuilderGroupProps,
} from './lib/filter-builder';

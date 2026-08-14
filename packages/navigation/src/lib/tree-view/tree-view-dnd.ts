// The drag geometry — the movement threshold, the hover-to-expand delay and
// the three-zone drop resolution — lives framework-free in `@oge-ui/behavior`
// (`tree-view-core`), shared with the React render layer. This file is only
// the Angular-side naming of it.
export {
  OGE_TREE_DRAG_THRESHOLD as TREE_DRAG_THRESHOLD,
  OGE_TREE_DRAG_HOVER_EXPAND_MS as TREE_DRAG_HOVER_EXPAND_MS,
  resolveTreeDropPosition as resolveDropPosition,
  exceedsTreeDragThreshold as exceedsDragThreshold,
} from '@oge-ui/behavior';

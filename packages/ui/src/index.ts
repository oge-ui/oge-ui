/**
 * Umbrella entry for the OGE Angular UI suite: one install, one import path.
 *
 * ```sh
 * npm install oge-ui
 * ```
 *
 * ```ts
 * import { OgeGrid, OgeColumn, OgeSelectBox, OgeButton } from 'oge-ui';
 * ```
 *
 * Star re-exports are the deliberate exception to the house "named exports
 * only" barrel rule — this package mirrors six APIs verbatim and must never
 * drift from them. `@oge-ui/tree-list` re-exports the grid's column API, so
 * its unique symbols are re-exported by name to avoid ambiguous star exports
 * (ESM silently drops names exported by two stars). The scoped packages
 * remain the canonical import paths for size-conscious apps.
 *
 * The commercial `@oge-ui/pivot` package is deliberately NOT part of this
 * MIT umbrella — install and import it separately.
 */
export * from '@oge-ui/core';
export * from '@oge-ui/grid';
export * from '@oge-ui/overlay';
export * from '@oge-ui/buttons';
export * from '@oge-ui/inputs';
// both grid (legacy context-menu shape) and overlay export an `OgeMenuItem`;
// the overlay one is the canonical shape — an explicit re-export wins the tie
export { type OgeMenuItem } from '@oge-ui/overlay';
export {
  OgeTreeList,
  type OgeTreeDropPosition,
  type OgeTreeExportData,
  type OgeTreeInitNewRowEvent,
  type OgeTreeRowReparentEvent,
  type OgeTreeRowToggleEvent,
  type OgeTreeRowTogglingEvent,
} from '@oge-ui/tree-list';

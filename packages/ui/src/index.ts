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
 * only" barrel rule — this package mirrors ten APIs verbatim and must never
 * drift from them. `@oge-ui/tree-list` re-exports the grid's column API, so
 * its unique symbols are re-exported by name to avoid ambiguous star exports
 * (ESM silently drops names exported by two stars). The scoped packages
 * remain the canonical import paths for size-conscious apps.
 *
 * The commercial packages (`@oge-ui/pivot`, `@oge-ui/bpmn`) are deliberately
 * NOT part of this MIT umbrella — install and import them separately.
 */
export * from '@oge-ui/core';
export * from '@oge-ui/grid';
export * from '@oge-ui/overlay';
export * from '@oge-ui/buttons';
export * from '@oge-ui/inputs';
export * from '@oge-ui/tabs';
export * from '@oge-ui/layout';
export * from '@oge-ui/navigation';
export * from '@oge-ui/forms';
export * from '@oge-ui/upload';
// both grid (legacy context-menu shape) and overlay export an `OgeMenuItem`;
// the overlay one is the canonical shape — an explicit re-export wins the tie
export { type OgeMenuItem } from '@oge-ui/overlay';
// grid's toolbar projection directive is `OgeGridToolbarItem` precisely so it
// cannot collide here; the explicit re-export keeps that intent visible and
// survives a future rename on either side
export { OgeToolbarItem } from '@oge-ui/layout';
export {
  OgeTreeList,
  type OgeTreeDropPosition,
  type OgeTreeExportData,
  type OgeTreeInitNewRowEvent,
  type OgeTreeRowReparentEvent,
  type OgeTreeRowToggleEvent,
  type OgeTreeRowTogglingEvent,
} from '@oge-ui/tree-list';

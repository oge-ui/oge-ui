// The rendered row model is framework-free (`@oge-ui/behavior`'s
// `OgeTreeViewNode`) — both render layers build the same list from the same
// pipeline. Module-internal on the Angular side (not exported from the
// barrel), so the alias stays local.
export type { OgeTreeViewNode as OgeTreeNode } from '@oge-ui/behavior';

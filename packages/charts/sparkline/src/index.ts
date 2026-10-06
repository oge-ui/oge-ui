/**
 * `@oge-ui/charts/sparkline` — the word-sized chart on its own entry point:
 * it reads the shared charts config and the engine's lean sparkline model,
 * and never loads the cartesian chart. The primary `@oge-ui/charts` entry
 * re-exports it.
 *
 * ```ts
 * import { OgeSparkline } from '@oge-ui/charts/sparkline';
 * ```
 */
export { OgeSparkline } from './sparkline';
export type {
  OgeSparklineMarkers,
  OgeSparklineType,
} from '@oge-ui/charts-engine';

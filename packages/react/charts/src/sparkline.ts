// `@oge-ui/react-charts/sparkline` — the word-sized chart on its own entry:
// it reads the charts config and the engine's lean sparkline model, and never
// loads the cartesian chart. The main entry re-exports it.
export {
  OgeSparkline,
  type OgeSparklineHandle,
  type OgeSparklineProps,
} from './lib/sparkline';
export type {
  OgeSparklineMarkers,
  OgeSparklineType,
} from '@oge-ui/charts-engine';

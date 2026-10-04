// The date box vocabulary lives framework-free in `@oge-ui/behavior`
// (`calendar-core`), shared with the React render layer; re-exported here so
// existing imports keep working.
export type {
  OgeDateBoxType,
  OgeDateBoxApplyValueMode,
  OgeDateBoxDisplayFormat,
  OgeDateBoxTimeView,
} from '@oge-ui/behavior';
export {
  ogeDateRangePresets,
  type OgeDateRangeBoxType,
  type OgeDateRangePreset,
  type OgeDateRangePresetId,
  type OgeDateRangePresetOptions,
  type OgeDateRangeWeekPresetOptions,
} from '@oge-ui/behavior';

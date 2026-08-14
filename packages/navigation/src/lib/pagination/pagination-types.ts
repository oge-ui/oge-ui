// The pagination vocabulary and its event payloads are framework-free and
// live in `@oge-ui/behavior` (ADR 0001) — re-exported so Angular consumers
// keep importing them from this package.
export type {
  OgePaginationDisplayMode,
  OgePaginationSize,
  OgePaginationPageChangedEvent,
  OgePaginationPageSizeChangedEvent,
} from '@oge-ui/behavior';

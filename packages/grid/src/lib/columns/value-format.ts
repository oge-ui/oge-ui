// The default cell formatter is framework-free and lives in
// `@oge-ui/behavior` (ADR 0001) — the React grid renders the same text from
// the same function. Re-exported here because `formatCellValue` is public API
// of `@oge-ui/grid`.
export { formatCellValue } from '@oge-ui/behavior';

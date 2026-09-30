// The locale-aware date parser lives framework-free in `@oge-ui/behavior`
// (`date-parse`), shared with the React render layer; re-exported here so
// date-box-internal imports stay unchanged.
export {
  datePartOrder,
  parseDateText,
  type DateParseKind,
} from '@oge-ui/behavior';

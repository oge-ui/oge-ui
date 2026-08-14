// Moved to `@oge-ui/behavior` (ADR 0001 — the React number box parses and
// steps the same way); re-exported so package-internal paths stay unchanged.
export {
  createNumberFormatter,
  clampNumber,
  offsetByStep,
  type OgeNumberFormatter,
} from '@oge-ui/behavior';

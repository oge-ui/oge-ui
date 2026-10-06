// @oge-ui/inputs/signature-pad — secondary entry point. Importing a single
// editor from its own entry lets a bundler split the family per component;
// the primary '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeSignaturePad } from './signature-pad';
export {
  type OgeSignatureFormat,
  type OgeSignatureMode,
  type OgeSignaturePoint,
  type OgeSignatureStroke,
  type OgeSignatureStrokeEvent,
} from '@oge-ui/behavior';

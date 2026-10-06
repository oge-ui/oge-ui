// @oge-ui/inputs/otp-input — secondary entry point. Importing a single editor from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/inputs' entry re-exports every public symbol unchanged.
export { OgeOtpInput, type OgeOtpCompletedEvent } from './otp-input';
export type { OgeOtpInputType, OgeOtpInputCase } from '@oge-ui/behavior';

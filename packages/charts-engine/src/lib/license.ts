import { ogeCheckLicense } from '@oge-ui/core';

/**
 * Registers a charts component with the OGE UI Pro license check. The Angular
 * and React components of the family call it once when they start; without
 * a valid key (`ogeSetLicenseKey`) on a production host the page gets a
 * console warning and a small corner notice — the component keeps working.
 * Server rendering is a no-op.
 */
export function ogeCheckChartsLicense(): void {
  ogeCheckLicense('charts');
}

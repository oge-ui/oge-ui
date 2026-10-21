import { ogeCheckLicense } from '@oge-ui/core';

/**
 * Registers a spreadsheet component with the OGE UI Pro license check. The
 * Angular and React spreadsheets call it once when they start; without a
 * valid key (`ogeSetLicenseKey`) on a production host the page gets a console
 * warning and a small corner notice — the component keeps working. Server
 * rendering is a no-op, and the engine's own functions never call it.
 */
export function ogeCheckSpreadsheetLicense(): void {
  ogeCheckLicense('spreadsheet');
}

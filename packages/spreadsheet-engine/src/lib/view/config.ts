/**
 * The spreadsheet's configuration shape and its defaults — single-sourced
 * here so the Angular `provideOgeSpreadsheetConfig()` and the React
 * `<OgeSpreadsheetConfigProvider>` resolve exactly the same object (ADR 0003).
 */
import {
  OGE_DEFAULT_SPREADSHEET_MESSAGES,
  type OgeSpreadsheetMessages,
} from './messages';

/** App-wide spreadsheet settings. */
export interface OgeSpreadsheetConfig {
  readonly messages: OgeSpreadsheetMessages;
  /**
   * BCP 47 locale for the built-in number formats, separators and month
   * names — Excel takes them from the reader's region. Unset = the browser's.
   */
  readonly locale?: string;
}

export const OGE_DEFAULT_SPREADSHEET_CONFIG: OgeSpreadsheetConfig = {
  messages: OGE_DEFAULT_SPREADSHEET_MESSAGES,
};

/** What a provider accepts: every field optional, `messages` partially. */
export type OgeSpreadsheetConfigInput = Partial<
  Omit<OgeSpreadsheetConfig, 'messages'>
> & {
  messages?: Partial<OgeSpreadsheetMessages>;
};

/** Merges a config input over `base` (the defaults, or an enclosing provider's config). */
export function resolveOgeSpreadsheetConfig(
  config: OgeSpreadsheetConfigInput | undefined,
  base: OgeSpreadsheetConfig = OGE_DEFAULT_SPREADSHEET_CONFIG,
): OgeSpreadsheetConfig {
  if (config === undefined) return base;
  const { messages, ...rest } = config;
  return { ...base, ...rest, messages: { ...base.messages, ...messages } };
}

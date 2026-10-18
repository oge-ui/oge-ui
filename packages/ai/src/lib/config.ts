import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_AI_CONFIG,
  ogeLiveConfig,
  resolveOgeAiConfig,
  type OgeAiConfig,
  type OgeAiConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the config shape, its defaults and every transport are
// single-sourced in `@oge-ui/behavior` so the React AI components ship the
// exact same strings, defaults and wire format (ADR 0001); re-exported so
// `@oge-ui/ai` is the Angular import path.
export {
  createOgeAiColumn,
  createOgeAiHttpTransport,
  OgeAiColumn,
  createOgeAnthropicTransport,
  createOgeOpenAiTransport,
  OGE_DEFAULT_AI_CONFIG,
  OGE_DEFAULT_AI_MESSAGES,
  OGE_GRID_AI_ALL_CAPABILITIES,
  OgeAiError,
  type OgeAiAnthropicTransportOptions,
  type OgeAiCallOptions,
  type OgeAiConfig,
  type OgeAiConfigInput,
  type OgeAiErrorCode,
  type OgeAiFetch,
  type OgeAiGridColumn,
  type OgeAiGridColumnValue,
  type OgeAiHttpTransportOptions,
  type OgeAiJsonSchema,
  type OgeAiMessage,
  type OgeAiMessages,
  type OgeAiMessagesInput,
  type OgeAiOpenAiTransportOptions,
  type OgeAiRequest,
  type OgeAiResponse,
  type OgeAiRole,
  type OgeAiTransport,
  type OgeAiTransportBaseOptions,
  type OgeAiUsage,
  type OgeGridAiCapabilities,
  type OgeGridAiSlice,
  type OgeGridAiWarning,
  type OgeGridAiWarningKind,
  type OgeGridAssistantAppliedEvent,
  type OgeGridAssistantApplyingEvent,
  type OgeGridAssistantConfig,
  type OgeGridAssistantErrorEvent,
  type OgeGridAssistantMessages,
  type OgeGridAssistantMessagesInput,
  type OgeGridAssistantMode,
  type OgeGridAssistantProposal,
  type OgeGridAssistantStatus,
  type OgeGridAssistantTarget,
  type OgeGridAssistantUndoneEvent,
  type OgeAiFormField,
  type OgeSmartPasteAppliedEvent,
  type OgeSmartPasteApplyingEvent,
  type OgeSmartPasteChange,
  type OgeSmartPasteConfig,
  type OgeSmartPasteErrorEvent,
  type OgeSmartPasteField,
  type OgeSmartPasteMessages,
  type OgeSmartPasteProposal,
  type OgeSmartPasteStatus,
  type OgeSmartPasteTarget,
  type OgeSmartPasteUndoneEvent,
  type OgeSmartPasteWarning,
  type OgeSmartPasteWarningKind,
  type OgeAiCellMessages,
  type OgeAiCellState,
  type OgeAiCellStatus,
  type OgeAiColumnOptions,
} from '@oge-ui/behavior';

/** Injection token every AI component reads its defaults from. */
export const OGE_AI_CONFIG = new InjectionToken<OgeAiConfig>('OGE_AI_CONFIG', {
  factory: () => OGE_DEFAULT_AI_CONFIG,
});

/**
 * Configures the AI components for an application or a route — above all the
 * transport, which decides where requests go:
 *
 * ```ts
 * provideOgeAiConfig({
 *   transport: createOgeAiHttpTransport({ url: '/api/ai' }),
 *   gridAssistant: { mode: 'apply' },
 *   messages: { gridAssistant: { submit: 'Sor' } },
 * })
 * ```
 */
export function provideOgeAiConfig(
  config: OgeAiConfigInput | (() => OgeAiConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_AI_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeAiConfig(config()), computed),
      }
    : { provide: OGE_AI_CONFIG, useValue: resolveOgeAiConfig(config) };
}

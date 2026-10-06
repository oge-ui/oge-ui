import type { TemplateRef } from '@angular/core';
import type {
  OgeAlertBaseOptions,
  OgeConfirmBaseOptions,
  OgePromptBaseOptions,
} from '@oge-ui/behavior';

// The helper vocabulary lives in `@oge-ui/behavior` (ADR 0001) so the React
// `useOgeModals()` helpers resolve options identically; re-exported so
// `@oge-ui/overlay` remains the Angular import path.
export type {
  OgeDialogSeverity,
  OgePromptInputType,
  OgePromptValidator,
} from '@oge-ui/behavior';

/** Options of `OgeModalService.confirm()`; a custom `icon` is a `TemplateRef`. */
export type OgeConfirmOptions = OgeConfirmBaseOptions<TemplateRef<unknown>>;

/** Options of `OgeModalService.alert()`; a custom `icon` is a `TemplateRef`. */
export type OgeAlertOptions = OgeAlertBaseOptions<TemplateRef<unknown>>;

/** Options of `OgeModalService.prompt()`; a custom `icon` is a `TemplateRef`. */
export type OgePromptOptions = OgePromptBaseOptions<TemplateRef<unknown>>;

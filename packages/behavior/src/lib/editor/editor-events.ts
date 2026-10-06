/**
 * Event payloads of the rich-text editor, shared by both render layers
 * (Angular outputs, React `on…` callbacks) so they carry the same fields.
 */
import type { OgeEditorCommand } from './editor-actions';
import type { OgeEditorLink } from './editor-model';
import type { OgeEditorActiveState } from './editor-queries';

/** A committed value change. `event` is `undefined` for programmatic writes. */
export interface OgeEditorValueCommittedEvent {
  readonly value: string;
  readonly previousValue: string;
  readonly event: Event | undefined;
}

/** The selection moved or its formats changed. */
export interface OgeEditorSelectionChangedEvent {
  readonly active: OgeEditorActiveState;
}

/** A command ran (keyboard, toolbar or `exec`). */
export interface OgeEditorCommandExecutedEvent {
  readonly command: OgeEditorCommand;
  readonly event: Event | undefined;
}

/** A toolbar tool was activated. */
export interface OgeEditorToolClickEvent {
  /** Tool name or custom tool key. */
  readonly key: string;
  /** `true` when it was activated from the toolbar's overflow menu. */
  readonly inMenu: boolean;
  readonly event: Event | undefined;
}

/** Which built-in dialog is about to open. */
export type OgeEditorDialogKind = 'link' | 'image';

/**
 * The link or image dialog is about to open. Set `cancel` to show your own
 * dialog instead, then call `insertLink()` / `insertImage()`.
 */
export interface OgeEditorDialogOpeningEvent {
  readonly kind: OgeEditorDialogKind;
  /** The link under the selection, for the link dialog. */
  readonly link: OgeEditorLink | null;
  cancel: boolean;
  readonly event: Event | undefined;
}

/** Focus entered or left the editor. */
export interface OgeEditorFocusEvent {
  readonly event: FocusEvent;
}

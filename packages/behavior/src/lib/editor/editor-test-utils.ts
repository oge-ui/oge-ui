// Spec helpers for the editor engine — not exported from the barrel.
import type { OgeEditorState } from './editor-commands';
import { ogeEditorFromHtml, ogeEditorToHtml } from './editor-html';
import type { OgeEditorDoc, OgeEditorPoint } from './editor-model';

/** A state from HTML with the selection `[block, offset]` → `[block, offset]`. */
export function stateOf(
  html: string,
  anchor: [number, number] = [0, 0],
  focus: [number, number] = anchor,
): OgeEditorState {
  const doc = ogeEditorFromHtml(html);
  const point = ([block, offset]: [number, number]): OgeEditorPoint => ({
    block,
    offset,
  });
  return {
    doc,
    selection: { anchor: point(anchor), focus: point(focus) },
    storedMarks: null,
  };
}

/** The HTML of a state or document. */
export function htmlOf(value: OgeEditorState | OgeEditorDoc | null): string {
  if (value === null) return '<null>';
  return ogeEditorToHtml('doc' in value ? value.doc : value);
}

/** The caret / focus of a state as `[block, offset]`. */
export function caretOf(state: OgeEditorState | null): [number, number] | null {
  if (!state) return null;
  return [state.selection.focus.block, state.selection.focus.offset];
}

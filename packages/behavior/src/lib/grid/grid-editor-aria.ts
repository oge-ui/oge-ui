/** Marks the error id this helper appended, so it can take exactly that back out. */
const ERROR_REF_ATTR = 'data-oge-error-ref';
/** Marks an `aria-invalid` this helper set (the editor had not set it itself). */
const INVALID_SET_ATTR = 'data-oge-invalid-set';

/** The native controls of an editor that carry its validity state. */
const CONTROL_SELECTOR =
  'input:not([type="hidden"]), select, textarea, [role="combobox"]';

/**
 * Points every native control inside a grid editor `host` at its rendered
 * error element: `aria-invalid="true"`, `aria-errormessage` and an
 * `aria-describedby` entry naming `errorId`. Pass `null` once the editor is
 * valid again to take back exactly what this added — ids the editor itself
 * put into `aria-describedby` (a hint, a counter) are left alone.
 *
 * Shared by the Angular and React `OgeCellEditor` (grid and tree list): the
 * compact cell editors render without a subscript, so the input components'
 * own error wiring has no element to point at.
 */
export function syncOgeEditorErrorAria(
  host: HTMLElement,
  errorId: string | null,
): void {
  for (const control of Array.from(
    host.querySelectorAll<HTMLElement>(CONTROL_SELECTOR),
  )) {
    const previous = control.getAttribute(ERROR_REF_ATTR);
    const ids = (control.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== previous);
    if (errorId) {
      ids.push(errorId);
      control.setAttribute(ERROR_REF_ATTR, errorId);
      control.setAttribute('aria-errormessage', errorId);
      if (control.getAttribute('aria-invalid') !== 'true') {
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute(INVALID_SET_ATTR, '');
      }
    } else if (previous !== null) {
      control.removeAttribute(ERROR_REF_ATTR);
      control.removeAttribute('aria-errormessage');
      if (control.hasAttribute(INVALID_SET_ATTR)) {
        control.removeAttribute(INVALID_SET_ATTR);
        control.removeAttribute('aria-invalid');
      }
    } else {
      continue;
    }
    if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
    else control.removeAttribute('aria-describedby');
  }
}

/**
 * `print()` for both render layers: the scheduler's current view, cloned
 * into a hidden iframe together with the page's stylesheets and a print
 * sheet that lets the scroll areas grow to their content, then the
 * browser's print dialog. Nodes are cloned with `importNode` — no
 * `document.write`, no string-built DOM (security rules). SSR-safe: a call
 * without a document resolves at once.
 *
 * Strict CSP: the frame is `about:blank`, so it inherits the page's policy.
 * Cloned page `<style>` elements keep their nonce (cloning copies it); the
 * print sheet this module adds is stamped with {@link
 * OgeSchedulerPrintOptions.nonce}, else the nonce of the page's own
 * nonce'd `<style>` / `<link>` / `<script>`, so a nonce-only `style-src`
 * admits it.
 */

/** Options of {@link printOgeScheduler}. */
export interface OgeSchedulerPrintOptions {
  /** The print document's title (the browser's default file name). */
  readonly title?: string;
  /**
   * The CSP nonce stamped on the print sheet `<style>`. Defaults to Angular's
   * `CSP_NONCE` (the Angular layer passes it), else the nonce of the first
   * nonce'd style or script element on the page.
   */
  readonly nonce?: string | null;
}

/**
 * The nonce the page's own elements carry — a server that sends a nonce-only
 * `style-src` stamps it on the styles and scripts it emits. Browsers hide the
 * `nonce` attribute after parsing (it reads `""`), so the `.nonce` property is
 * what is read.
 */
export function ogePageCspNonce(doc: Document): string | null {
  for (const element of Array.from(
    doc.querySelectorAll<HTMLElement>(
      'style[nonce], link[rel="stylesheet"][nonce], script[nonce]',
    ),
  )) {
    const nonce = element.nonce || element.getAttribute('nonce');
    if (nonce) return nonce;
  }
  return null;
}

/** The print sheet: every scroll container expands, the toolbar stays. */
const PRINT_CSS = `
@page { margin: 12mm; }
html, body { margin: 0; background: #fff; }
.oge-scheduler { height: auto !important; max-height: none !important; overflow: visible !important; }
.oge-scheduler-body, .oge-scheduler-timeline-scroll, .oge-scheduler-agenda,
.oge-scheduler-year, .oge-scheduler-allday { overflow: visible !important; max-height: none !important; height: auto !important; }
.oge-scheduler-views, .oge-scheduler-btn, .oge-scheduler-menu, .oge-scheduler-notice { display: none !important; }
.oge-scheduler-chip, .oge-scheduler-timeline-bar { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
`;

/** Prints the scheduler rendered at `host` (its `.oge-scheduler` element). */
export function printOgeScheduler(
  host: HTMLElement,
  options: OgeSchedulerPrintOptions = {},
): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const view = frame.contentWindow;
  if (doc === null || view === null) {
    frame.remove();
    return Promise.resolve();
  }
  doc.title = options.title ?? document.title;
  // the page's own styles: <link rel=stylesheet> and <style> elements
  for (const node of Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  )) {
    doc.head.appendChild(doc.importNode(node, true));
  }
  const sheet = doc.createElement('style');
  const nonce = options.nonce || ogePageCspNonce(document);
  if (nonce) {
    sheet.setAttribute('nonce', nonce);
    sheet.nonce = nonce;
  }
  sheet.textContent = PRINT_CSS;
  doc.head.appendChild(sheet);
  // the theme scope the host sits in (dark / high-contrast classes)
  doc.documentElement.className = document.documentElement.className;
  const dir = document.documentElement.getAttribute('dir');
  if (dir !== null) doc.documentElement.setAttribute('dir', dir);
  doc.body.appendChild(doc.importNode(host, true));
  return new Promise<void>((resolve) => {
    // let the frame load the cloned stylesheets and lay out first
    setTimeout(() => {
      try {
        view.focus();
        view.print();
      } catch {
        // an environment without a print dialog (jsdom, some webviews)
      } finally {
        setTimeout(() => frame.remove(), 1000);
        resolve();
      }
    }, 250);
  });
}

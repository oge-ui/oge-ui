import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ogePageCspNonce, printOgeScheduler } from './print';

/** The print sheet is the `<style>` the module adds last to the frame head. */
function printSheet(): HTMLStyleElement | null {
  const frame = document.querySelector('iframe');
  const styles = frame?.contentDocument?.head.querySelectorAll('style');
  return styles && styles.length > 0 ? styles[styles.length - 1] : null;
}

describe('printOgeScheduler under a nonce-only style-src', () => {
  let host: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    host.className = 'oge-scheduler';
    document.body.appendChild(host);
  });

  afterEach(() => {
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
    host.remove();
    document.head
      .querySelectorAll('[data-spec-nonce]')
      .forEach((node) => node.remove());
  });

  it('stamps the nonce it is given on the print sheet', () => {
    void printOgeScheduler(host, { nonce: 'abc123' });
    const sheet = printSheet();
    expect(sheet?.textContent).toContain('@page');
    expect(sheet?.nonce || sheet?.getAttribute('nonce')).toBe('abc123');
  });

  it("falls back to the nonce of the page's own nonce'd style", () => {
    const pageStyle = document.createElement('style');
    pageStyle.setAttribute('data-spec-nonce', '');
    pageStyle.setAttribute('nonce', 'from-page');
    document.head.appendChild(pageStyle);
    expect(ogePageCspNonce(document)).toBe('from-page');
    void printOgeScheduler(host);
    const sheet = printSheet();
    expect(sheet?.nonce || sheet?.getAttribute('nonce')).toBe('from-page');
  });

  it('adds no nonce when neither the caller nor the page has one', () => {
    expect(ogePageCspNonce(document)).toBeNull();
    void printOgeScheduler(host);
    expect(printSheet()?.hasAttribute('nonce')).toBe(false);
  });

  it('prefers the explicit nonce over the page one', () => {
    const pageScript = document.createElement('script');
    pageScript.setAttribute('data-spec-nonce', '');
    pageScript.setAttribute('type', 'application/json');
    pageScript.setAttribute('nonce', 'page');
    document.head.appendChild(pageScript);
    void printOgeScheduler(host, { nonce: 'explicit' });
    const sheet = printSheet();
    expect(sheet?.nonce || sheet?.getAttribute('nonce')).toBe('explicit');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { bpmnIsRtl, observeBpmnDirection } from './direction';

describe('bpmn chrome direction (local twin of behavior ogeIsRtl)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reads the nearest dir and a computed direction, false without an element', () => {
    expect(bpmnIsRtl(null)).toBe(false);
    const host = document.createElement('div');
    const el = document.createElement('span');
    host.append(el);
    document.body.append(host);
    expect(bpmnIsRtl(el)).toBe(false);
    host.setAttribute('dir', 'rtl');
    expect(bpmnIsRtl(el)).toBe(true);
    const css = document.createElement('div');
    css.style.direction = 'rtl';
    document.body.append(css);
    expect(bpmnIsRtl(css)).toBe(true);
  });

  it('observes dir changes on ancestors until disconnected', async () => {
    const host = document.createElement('div');
    const el = document.createElement('span');
    host.append(el);
    document.body.append(host);
    const seen = vi.fn();
    const stop = observeBpmnDirection(el, seen);
    host.setAttribute('dir', 'rtl');
    await Promise.resolve();
    expect(seen).toHaveBeenLastCalledWith(true);
    stop();
    host.setAttribute('dir', 'ltr');
    await Promise.resolve();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('does not observe an element of a windowless (server) document', () => {
    const inert = document.implementation.createHTMLDocument('server');
    const el = inert.createElement('div');
    inert.body.append(el);
    const created = vi.fn();
    vi.stubGlobal(
      'MutationObserver',
      class {
        constructor() {
          created();
        }
        observe(): void {
          /* the global observer must not be reached for */
        }
        disconnect(): void {
          /* nothing observed */
        }
      },
    );
    try {
      const stop = observeBpmnDirection(el, vi.fn());
      expect(created).not.toHaveBeenCalled();
      expect(() => stop()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

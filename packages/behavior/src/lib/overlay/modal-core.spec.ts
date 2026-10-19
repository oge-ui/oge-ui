import { afterEach, describe, expect, it } from 'vitest';
import { ogeModalExitGhost } from './modal-core';

/** jsdom has no Web Animations API — a stub turns motion "on". */
function stubAnimate(): { calls: Keyframe[][]; restore(): void } {
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const original = proto.animate;
  const calls: Keyframe[][] = [];
  proto.animate = (keyframes: Keyframe[]) => {
    calls.push(keyframes);
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  return {
    calls,
    restore() {
      if (original === undefined) delete proto.animate;
      else proto.animate = original;
    },
  };
}

function layerIn(parent: HTMLElement): HTMLElement {
  const layer = document.createElement('div');
  layer.className = 'oge-modal-layer oge-modal-layer-ready';
  layer.innerHTML = '<div class="oge-modal" id="dlg">Hi</div>';
  layer.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 800, height: 600 }) as DOMRect;
  parent.appendChild(layer);
  return layer;
}

describe('ogeModalExitGhost', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is off without the Web Animations API (jsdom)', () => {
    const layer = layerIn(document.body);
    ogeModalExitGhost(layer);
    expect(document.querySelector('.oge-exit-ghost')).toBeNull();
  });

  it('fades an inert, id-free ghost of the layer in its parent', async () => {
    const stub = stubAnimate();
    try {
      const host = document.createElement('oge-modal');
      document.body.appendChild(host);
      const layer = layerIn(host);
      ogeModalExitGhost(layer, document.body);
      layer.remove();
      await Promise.resolve();
      const ghost = document.body.querySelector<HTMLElement>(
        ':scope > .oge-exit-ghost',
      );
      expect(ghost?.classList.contains('oge-modal-layer')).toBe(true);
      expect(ghost?.getAttribute('aria-hidden')).toBe('true');
      expect(ghost?.hasAttribute('inert')).toBe(true);
      expect(ghost?.querySelector('[id]')).toBeNull();
      expect(stub.calls).toEqual([[{ opacity: 1 }, { opacity: 0 }]]);
    } finally {
      stub.restore();
    }
  });

  it('takes the viewport box for a layer already rendered away', () => {
    const stub = stubAnimate();
    try {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const layer = layerIn(container);
      layer.remove();
      ogeModalExitGhost(layer, container);
      const ghost = container.querySelector<HTMLElement>('.oge-exit-ghost');
      expect(ghost?.style.width).toBe(`${window.innerWidth}px`);
      expect(ghost?.style.height).toBe(`${window.innerHeight}px`);
    } finally {
      stub.restore();
    }
  });

  it('skips a layer whose entrance never ran (still transparent)', () => {
    const stub = stubAnimate();
    try {
      const layer = layerIn(document.body);
      layer.classList.remove('oge-modal-layer-ready');
      ogeModalExitGhost(layer);
      expect(stub.calls).toHaveLength(0);
    } finally {
      stub.restore();
    }
  });

  it('ignores a missing layer', () => {
    expect(() => ogeModalExitGhost(null)).not.toThrow();
  });
});

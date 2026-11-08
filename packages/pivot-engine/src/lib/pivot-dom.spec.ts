import {
  fitPivotPopup,
  focusPivotChip,
  pivotIsMenuKey,
  pivotIsRtl,
} from './pivot-dom';

function panel(): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = `
    <div class="oge-pivot-field-panel">
      <button class="oge-pivot-panel-toggle"></button>
      <div data-area="row">
        <span class="oge-pivot-field-chip" tabindex="0" data-field-id="region"></span>
        <span class="oge-pivot-field-chip" tabindex="0" data-field-id="city"></span>
      </div>
      <div data-area="column">
        <span class="oge-pivot-field-chip" tabindex="0" data-field-id="year"></span>
      </div>
    </div>
    <div class="oge-pivot-chooser">
      <div class="oge-pivot-chooser-all">
        <span class="oge-pivot-field-chip" tabindex="0" data-field-id="year"></span>
      </div>
      <div data-area="column">
        <span class="oge-pivot-field-chip" tabindex="0" data-field-id="year"></span>
      </div>
    </div>`;
  document.body.appendChild(host);
  return host;
}

describe('pivot DOM readers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the chip of a field in its new zone', () => {
    const host = panel();
    focusPivotChip(host, 'city', 'row', false, 'row');
    expect(document.activeElement?.getAttribute('data-field-id')).toBe('city');
    focusPivotChip(host, 'year', 'column', true, null);
    expect(
      document.activeElement?.closest('[data-area]')?.getAttribute('data-area'),
    ).toBe('column');
    expect(
      document.activeElement?.closest('.oge-pivot-chooser'),
    ).not.toBeNull();
  });

  it('falls back when the field left the layout', () => {
    const host = panel();
    focusPivotChip(host, 'year', null, true, 'column');
    expect(
      document.activeElement?.closest('.oge-pivot-chooser-all'),
    ).not.toBeNull();
    focusPivotChip(host, 'gone', null, false, 'column');
    expect(document.activeElement?.getAttribute('data-field-id')).toBe('year');
    host
      .querySelectorAll('.oge-pivot-field-panel [data-field-id]')
      .forEach((chip) => chip.remove());
    focusPivotChip(host, 'gone', null, false, 'column');
    expect(document.activeElement?.className).toBe('oge-pivot-panel-toggle');
  });

  it('reads direction and the keyboard menu keys', () => {
    const host = panel();
    expect(pivotIsRtl(host)).toBe(false);
    host.style.direction = 'rtl';
    expect(pivotIsRtl(host)).toBe(true);
    expect(pivotIsRtl(host, false)).toBe(false);
    host.style.direction = '';
    expect(pivotIsRtl(host, true)).toBe(true);
    expect(pivotIsMenuKey({ key: 'ContextMenu' })).toBe(true);
    expect(pivotIsMenuKey({ key: 'F10', shiftKey: true })).toBe(true);
    expect(pivotIsMenuKey({ key: 'F10' })).toBe(false);
  });
});

describe('fitPivotPopup', () => {
  const viewport = { width: 1000, height: 600 };
  let popup: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('innerWidth', viewport.width);
    vi.stubGlobal('innerHeight', viewport.height);
    popup = document.createElement('div');
    popup.getBoundingClientRect = () =>
      ({ width: 180, height: 200 }) as DOMRect;
    document.body.appendChild(popup);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('dir');
  });

  it('keeps a popup that fits at its anchor point', () => {
    fitPivotPopup(popup, { x: 100, y: 50 });
    expect(popup.style.top).toBe('50px');
    expect(popup.style.left).toBe('100px');
  });

  it('opens above an anchor near the bottom edge so every item stays reachable', () => {
    fitPivotPopup(popup, { x: 100, y: 550 });
    expect(popup.style.top).toBe('350px');
  });

  it('pulls a popup opened near the inline-end edge back into the viewport', () => {
    fitPivotPopup(popup, { x: 950, y: 50 });
    expect(popup.style.left).toBe('770px');
  });

  it('opens towards the inline start in RTL and drops the stylesheet translate', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    fitPivotPopup(popup, { x: 500, y: 50 });
    expect(popup.style.left).toBe('320px');
    expect(popup.style.translate).toBe('none');
  });
});

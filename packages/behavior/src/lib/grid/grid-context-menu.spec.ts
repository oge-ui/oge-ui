import {
  OgeContextMenuEcho,
  isOgeContextMenuKey,
  ogeContextMenuKeyTarget,
} from './grid-context-menu';

function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

describe('grid context menu keyboard helpers', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('recognises the Menu key and Shift+F10 only', () => {
    expect(isOgeContextMenuKey({ key: 'ContextMenu', shiftKey: false })).toBe(
      true,
    );
    expect(isOgeContextMenuKey({ key: 'F10', shiftKey: true })).toBe(true);
    expect(isOgeContextMenuKey({ key: 'F10', shiftKey: false })).toBe(false);
    expect(isOgeContextMenuKey({ key: 'Enter', shiftKey: true })).toBe(false);
  });

  it('resolves a body cell to its row index and its start/bottom corner', () => {
    const host = mount(
      `<div class="oge-row" data-rowindex="7"><div role="gridcell"><span id="t">x</span></div></div>`,
    );
    const cell = host.querySelector('[role="gridcell"]') as HTMLElement;
    cell.getBoundingClientRect = () =>
      ({ left: 10, right: 90, top: 20, bottom: 44 }) as DOMRect;
    expect(ogeContextMenuKeyTarget(host.querySelector('#t'))).toEqual({
      x: 10,
      y: 44,
      headerColumnId: null,
      rowIndex: 7,
    });
  });

  it('anchors at the inline-start edge in RTL', () => {
    const host = mount(
      `<div dir="rtl" style="direction: rtl"><div class="oge-row" data-rowindex="0"><div role="gridcell">x</div></div></div>`,
    );
    const cell = host.querySelector('[role="gridcell"]') as HTMLElement;
    cell.getBoundingClientRect = () =>
      ({ left: 10, right: 90, top: 20, bottom: 44 }) as DOMRect;
    expect(ogeContextMenuKeyTarget(cell)?.x).toBe(90);
  });

  it('resolves a header cell by data-colid, and ignores leading cells', () => {
    const host = mount(
      `<div class="oge-header-cell" data-colid="city">City</div><div class="oge-header-cell oge-checkbox-cell">☐</div>`,
    );
    const [city, leading] = host.querySelectorAll('.oge-header-cell');
    expect(ogeContextMenuKeyTarget(city)).toMatchObject({
      headerColumnId: 'city',
      rowIndex: null,
    });
    expect(ogeContextMenuKeyTarget(leading)).toBeNull();
  });

  it('returns null outside any cell', () => {
    const host = mount(`<button>toolbar</button>`);
    expect(ogeContextMenuKeyTarget(host.querySelector('button'))).toBeNull();
    expect(ogeContextMenuKeyTarget(null)).toBeNull();
  });

  it('swallows one echo inside the window, never a right-click', () => {
    const echo = new OgeContextMenuEcho();
    const event = (button: number, timeStamp: number) => {
      let prevented = false;
      return {
        button,
        timeStamp,
        preventDefault: () => (prevented = true),
        get prevented() {
          return prevented;
        },
      };
    };
    expect(echo.swallow(event(0, 100))).toBe(false); // nothing marked yet
    echo.mark(1000);
    const rightClick = event(2, 1010);
    expect(echo.swallow(rightClick)).toBe(false);
    expect(rightClick.prevented).toBe(false);
    const native = event(0, 1050);
    expect(echo.swallow(native)).toBe(true);
    expect(native.prevented).toBe(true);
    // one echo per keyboard open
    expect(echo.swallow(event(0, 1060))).toBe(false);
    echo.mark(2000);
    expect(echo.swallow(event(0, 3000))).toBe(false); // too late
  });
});

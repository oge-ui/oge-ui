import { getTabbableElements, trapTabKey } from './focus-trap';

function tabEvent(shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    cancelable: true,
  });
}

describe('getTabbableElements', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns focusable elements in DOM order', () => {
    root.innerHTML = `
      <a href="#" id="a">link</a>
      <button id="b">b</button>
      <input id="c" />
    `;
    expect(getTabbableElements(root).map((el) => el.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('filters disabled, hidden and negative-tabindex elements', () => {
    root.innerHTML = `
      <button id="ok">ok</button>
      <button disabled id="off">off</button>
      <button tabindex="-1" id="neg">neg</button>
      <div hidden><button id="hidden">hidden</button></div>
      <button style="display: none" id="none">none</button>
      <button style="visibility: hidden" id="invis">invis</button>
    `;
    expect(getTabbableElements(root).map((el) => el.id)).toEqual(['ok']);
  });
});

describe('trapTabKey', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    root.tabIndex = -1;
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('wraps forward from the last tabbable to the first', () => {
    root.innerHTML = `<button id="first">1</button><button id="last">2</button>`;
    const last = root.querySelector<HTMLElement>('#last');
    last?.focus();
    const event = tabEvent();
    trapTabKey(event, root, root);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('first');
  });

  it('wraps backward from the first tabbable to the last', () => {
    root.innerHTML = `<button id="first">1</button><button id="last">2</button>`;
    root.querySelector<HTMLElement>('#first')?.focus();
    const event = tabEvent(true);
    trapTabKey(event, root, root);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('last');
  });

  it('lets Tab through between interior tabbables', () => {
    root.innerHTML = `<button id="first">1</button><button id="mid">2</button><button id="last">3</button>`;
    root.querySelector<HTMLElement>('#mid')?.focus();
    const event = tabEvent();
    trapTabKey(event, root, root);
    expect(event.defaultPrevented).toBe(false);
  });

  it('pulls focus back in when it sits on the panel itself', () => {
    root.innerHTML = `<button id="first">1</button><button id="last">2</button>`;
    root.focus();
    const event = tabEvent();
    trapTabKey(event, root, root);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('first');
  });

  it('focuses the fallback when nothing is tabbable', () => {
    root.innerHTML = `<p>plain text</p>`;
    const event = tabEvent();
    trapTabKey(event, root, root);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(root);
  });
});

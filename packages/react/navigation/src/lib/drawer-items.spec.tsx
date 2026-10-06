import { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeDrawerClosingEvent,
  OgeDrawerItem,
  OgeDrawerSelectionChangedEvent,
} from '@oge-ui/behavior';
import { OgeDrawer, type OgeDrawerProps } from './drawer';

const ITEMS: OgeDrawerItem[] = [
  { key: 'inbox', text: 'Inbox', icon: 'M4 4h16v16H4z', badge: 3 },
  { key: 'sent', text: 'Sent', icon: 'M4 12h16' },
  { separator: true },
  { key: 'trash', text: 'Trash', disabled: true },
  { key: 'help', text: 'Help', url: '#help' },
];

const entries = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-drawer-item'));

function drawer(props: Partial<OgeDrawerProps> = {}) {
  return render(
    <OgeDrawer
      defaultOpened
      mode="side"
      items={ITEMS}
      defaultSelectedKey="inbox"
      {...props}
    >
      <main>content</main>
    </OgeDrawer>,
  );
}

function touch(
  target: Element,
  type: string,
  x: number,
  y: number,
  pointerType = 'touch',
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: 7 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(target, event);
}

function stubHost(): HTMLElement {
  const host = document.querySelector<HTMLElement>(
    '.oge-drawer',
  ) as HTMLElement;
  host.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return host;
}

describe('OgeDrawer items', () => {
  it('renders links and buttons with aria-current on the active entry', () => {
    drawer();
    expect(entries().map((e) => e.tagName)).toEqual([
      'BUTTON',
      'BUTTON',
      'BUTTON',
      'A',
    ]);
    expect(entries()[0].getAttribute('aria-current')).toBe('page');
    expect((entries()[2] as HTMLButtonElement).disabled).toBe(true);
    expect(entries()[3].getAttribute('href')).toBe('#help');
    expect(document.querySelector('.oge-drawer-item-badge')?.textContent).toBe(
      '3',
    );
    expect(
      document
        .querySelector('.oge-drawer-separator')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('selects on click (uncontrolled) and reports the events', () => {
    const changes: OgeDrawerSelectionChangedEvent[] = [];
    const clicks: unknown[] = [];
    const keys: string[] = [];
    drawer({
      onItemClick: (e) => clicks.push(e),
      onSelectionChanged: (e) => changes.push(e),
      onSelectedKeyChange: (k) => keys.push(k),
    });
    fireEvent.click(entries()[1]);
    expect(clicks).toHaveLength(1);
    expect(changes[0]).toMatchObject({ key: 'sent', previousKey: 'inbox' });
    expect(keys).toEqual(['sent']);
    expect(entries()[1].getAttribute('aria-current')).toBe('page');
  });

  it('moves focus with the arrows', () => {
    drawer();
    act(() => entries()[1].focus());
    fireEvent.keyDown(entries()[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(entries()[3]);
    fireEvent.keyDown(entries()[3], { key: 'End' });
    expect(document.activeElement).toBe(entries()[3]);
    fireEvent.keyDown(entries()[3], { key: 'Home' });
    expect(document.activeElement).toBe(entries()[0]);
  });

  it('collapses to the mini rail and renders custom entries', () => {
    drawer({
      defaultOpened: false,
      minSize: 56,
      renderItem: ({ item, rail }) => (
        <em className="custom">
          {item.text}
          {rail ? '·' : ''}
        </em>
      ),
    });
    expect(
      document
        .querySelector('.oge-drawer')
        ?.classList.contains('oge-drawer-rail'),
    ).toBe(true);
    expect(entries()[0].querySelector('.custom')?.textContent).toBe('Inbox·');
  });

  it('survives a StrictMode double-mount', () => {
    render(
      <StrictMode>
        <OgeDrawer defaultOpened mode="side" items={ITEMS}>
          <main>content</main>
        </OgeDrawer>
      </StrictMode>,
    );
    fireEvent.click(entries()[1]);
    expect(entries()[1].getAttribute('aria-current')).toBe('page');
  });
});

describe('OgeDrawer swipe', () => {
  it('opens on a touch edge swipe', () => {
    const opened: boolean[] = [];
    drawer({
      defaultOpened: false,
      mode: 'overlay',
      swipeEnabled: true,
      onOpenedChange: (o) => opened.push(o),
    });
    const host = stubHost();
    expect(document.querySelector('.oge-drawer-swipe-zone')).not.toBeNull();
    touch(host, 'pointerdown', 4, 100);
    touch(host, 'pointermove', 60, 102);
    touch(host, 'pointermove', 140, 104);
    touch(host, 'pointerup', 140, 104);
    expect(opened).toEqual([true]);
  });

  it('closes on a swipe toward the edge with reason "swipe"', async () => {
    const closings: OgeDrawerClosingEvent[] = [];
    drawer({
      mode: 'overlay',
      swipeEnabled: true,
      onClosing: (e) => closings.push(e),
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    const host = stubHost();
    touch(host, 'pointerdown', 200, 100);
    touch(host, 'pointermove', 150, 100);
    touch(host, 'pointermove', 60, 100);
    touch(host, 'pointerup', 60, 100);
    expect(closings[0]).toMatchObject({ reason: 'swipe' });
  });

  it('ignores mouse swipes and is off by default', () => {
    const opened: boolean[] = [];
    drawer({
      defaultOpened: false,
      mode: 'overlay',
      onOpenedChange: (o) => opened.push(o),
    });
    const host = stubHost();
    touch(host, 'pointerdown', 4, 100);
    touch(host, 'pointermove', 140, 100);
    touch(host, 'pointerup', 140, 100);
    expect(opened).toEqual([]);
  });
});

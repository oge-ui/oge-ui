import { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeMenubarItemClickEvent,
  OgeMenubarItemData,
} from '@oge-ui/behavior';
import { OgeMenubar } from './menubar';

/**
 * jsdom performs no layout. The harness gives the bar a width and every bar
 * entry a fixed natural width (80px, separators 1px) plus a fan-out
 * `ResizeObserver` stand-in; the fit arithmetic itself is covered DOM-free in
 * behavior's `menubar-core.spec.ts`.
 */
function installHarness(container: { size: number }) {
  const proto = HTMLElement.prototype;
  const saved = {
    clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
    offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
  };
  const width = (el: HTMLElement): number => {
    if (el.classList.contains('oge-menubar')) return container.size;
    if (el.classList.contains('oge-menubar-bar')) return container.size;
    if (el.classList.contains('oge-menubar-separator')) return 1;
    if (el.classList.contains('oge-menubar-item')) return 80;
    return 0;
  };
  for (const name of ['clientWidth', 'offsetWidth']) {
    Object.defineProperty(proto, name, {
      configurable: true,
      get(this: HTMLElement) {
        return width(this);
      },
    });
  }
  const callbacks: (() => void)[] = [];
  const previous = (globalThis as Record<string, unknown>).ResizeObserver;
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    constructor(cb: () => void) {
      callbacks.push(cb);
    }
    observe(): void {
      /* driven by the spec */
    }
    disconnect(): void {
      /* nothing to release */
    }
  };
  return {
    resize: () => act(() => [...callbacks].forEach((cb) => cb())),
    restore: () => {
      for (const [name, descriptor] of Object.entries(saved)) {
        if (descriptor) Object.defineProperty(proto, name, descriptor);
      }
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    },
  };
}

const MENU: readonly OgeMenubarItemData[] = [
  { text: 'File', key: 'file', items: [{ text: 'New', key: 'new' }] },
  { text: 'Edit', key: 'edit' },
  { text: 'View', key: 'view' },
  {
    text: 'Tools',
    key: 'tools',
    items: [{ text: 'Options', key: 'options' }],
  },
  { text: 'Help', key: 'help', overflow: 'never' },
];

function settle(): void {
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

const entries = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '.oge-menubar-bar > .oge-menubar-item',
    ),
  );
const entry = (text: string) =>
  entries().find((e) => e.textContent?.trim() === text)!;
const visible = () =>
  entries()
    .filter((e) => !e.classList.contains('oge-menubar-item-overflowed'))
    .map((e) => e.textContent?.trim());
const more = () => document.querySelector<HTMLElement>('.oge-menubar-more');

describe('<OgeMenubar> — overflowMode "more"', () => {
  let harness: ReturnType<typeof installHarness> | undefined;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date'],
    });
  });
  afterEach(() => {
    harness?.restore();
    harness = undefined;
    vi.useRealTimers();
  });

  it('keeps every item and hides the More item while everything fits', () => {
    harness = installHarness({ size: 1000 });
    render(<OgeMenubar items={MENU} overflowMode="more" />);
    settle();
    expect(visible()).toEqual(['File', 'Edit', 'View', 'Tools', 'Help']);
    expect(more()?.classList.contains('oge-menubar-item-overflowed')).toBe(
      true,
    );
    expect(more()?.getAttribute('tabindex')).toBe('-1');
  });

  it('moves the trailing auto items into More, keeping "never" items', () => {
    harness = installHarness({ size: 300 });
    render(<OgeMenubar items={MENU} overflowMode="more" />);
    settle();
    expect(visible()).toEqual(['File', 'Help', 'More']);
    expect(more()?.getAttribute('aria-haspopup')).toBe('menu');
    expect(more()?.getAttribute('aria-expanded')).toBe('false');
  });

  it('the More item joins the roving tabindex', () => {
    harness = installHarness({ size: 300 });
    render(<OgeMenubar items={MENU} overflowMode="more" />);
    settle();
    act(() => entry('File').focus());
    fireEvent.keyDown(entry('File'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(entry('Help'));
    fireEvent.keyDown(entry('Help'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(more());
    expect(more()?.getAttribute('tabindex')).toBe('0');
  });

  it('opens the overflowed items as a submenu and reports real paths', () => {
    harness = installHarness({ size: 300 });
    const clicks: OgeMenubarItemClickEvent[] = [];
    render(
      <OgeMenubar
        items={MENU}
        overflowMode="more"
        onItemClick={(e) => clicks.push(e)}
      />,
    );
    settle();
    fireEvent.click(more()!, { detail: 1 });
    settle();
    expect(more()?.getAttribute('aria-expanded')).toBe('true');
    const list = document.querySelector('.oge-menu-list') as HTMLElement;
    expect(list.getAttribute('aria-label')).toBe('More');
    const rows = Array.from(
      list.querySelectorAll<HTMLElement>('.oge-menu-item'),
    );
    expect(rows.map((r) => r.textContent?.trim())).toEqual([
      'Edit',
      'View',
      'Tools',
    ]);
    expect(rows[2].getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.click(rows[1]);
    expect(clicks.at(-1)).toMatchObject({ key: 'view', path: [2] });
  });

  it('marks More current when the active item moved into it', () => {
    harness = installHarness({ size: 300 });
    render(<OgeMenubar items={MENU} overflowMode="more" activeKey="view" />);
    settle();
    expect(more()?.getAttribute('aria-current')).toBe('page');
  });

  it('recovers when the container grows', () => {
    const container = { size: 300 };
    harness = installHarness(container);
    render(<OgeMenubar items={MENU} overflowMode="more" />);
    settle();
    container.size = 1000;
    harness.resize();
    settle();
    expect(visible()).toEqual(['File', 'Edit', 'View', 'Tools', 'Help']);
  });

  it('renders no More item in the default hamburger mode', () => {
    harness = installHarness({ size: 300 });
    render(<OgeMenubar items={MENU} />);
    settle();
    expect(more()).toBeNull();
    expect(visible()).toEqual(['File', 'Edit', 'View', 'Tools', 'Help']);
  });

  it('works under StrictMode', () => {
    harness = installHarness({ size: 300 });
    render(
      <StrictMode>
        <OgeMenubar items={MENU} overflowMode="more" />
      </StrictMode>,
    );
    settle();
    expect(visible()).toEqual(['File', 'Help', 'More']);
    fireEvent.click(more()!, { detail: 1 });
    settle();
    expect(more()?.getAttribute('aria-expanded')).toBe('true');
  });
});

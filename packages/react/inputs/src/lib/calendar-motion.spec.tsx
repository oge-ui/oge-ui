import { act, fireEvent, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { OgeCalendar } from './calendar';

const pane = (): HTMLElement =>
  document.querySelector('.oge-calendar-pane') as HTMLElement;

const navs = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('.oge-calendar-nav'));

const live = (): string =>
  document.querySelector('[aria-live="polite"]')?.textContent?.trim() ?? '';

function press(key: string): void {
  fireEvent.keyDown(
    document.querySelector('.oge-calendar-grid') as HTMLElement,
    { key },
  );
}

function mount(): void {
  render(
    <StrictMode>
      <OgeCalendar defaultValue={new Date(2026, 7, 15)} locale="en-US" />
    </StrictMode>,
  );
}

describe('OgeCalendar view motion', () => {
  it('never animates the first view', () => {
    mount();
    expect(pane().hasAttribute('data-oge-view-motion')).toBe(false);
  });

  it('re-creates the pane with the direction of travel when paging', () => {
    mount();
    const first = pane();
    fireEvent.click(navs()[1]);
    expect(pane()).not.toBe(first);
    expect(pane().getAttribute('data-oge-view-motion')).toBe('next');
    expect(live()).toBe('September 2026');
    fireEvent.click(navs()[0]);
    fireEvent.click(navs()[0]);
    expect(pane().getAttribute('data-oge-view-motion')).toBe('prev');
    expect(live()).toBe('July 2026');
  });

  it('zooms out on the view label and in on a drill-down', () => {
    mount();
    fireEvent.click(
      document.querySelector('.oge-calendar-view-label') as HTMLElement,
    );
    expect(pane().getAttribute('data-oge-view-motion')).toBe('zoom-out');
    expect(live()).toBe('2026');
    fireEvent.click(
      document.querySelector('.oge-calendar-cell') as HTMLElement,
    );
    expect(pane().getAttribute('data-oge-view-motion')).toBe('zoom-in');
  });

  it('keeps the pane while the focus moves inside the visible month', () => {
    mount();
    const first = pane();
    press('ArrowRight');
    expect(pane()).toBe(first);
    expect(first.hasAttribute('data-oge-view-motion')).toBe(false);
  });

  it('slides on a keyboard page and still lands the focus on the new month', async () => {
    mount();
    press('PageDown');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(pane().getAttribute('data-oge-view-motion')).toBe('next');
    expect(
      (document.activeElement as HTMLElement | null)?.getAttribute(
        'aria-label',
      ),
    ).toContain('September 15');
  });
});

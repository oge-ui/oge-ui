import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { OgeBadge } from './badge';
import { OgeBadgeConfigProvider } from './layout-config';

describe('<OgeBadge>', () => {
  it('overlay: aria-hidden glyph, description on the wrapped control', () => {
    render(
      <>
        <span id="hint">Opens your mail</span>
        <OgeBadge value={5} position="bottom-start" severity="accent">
          <button type="button" aria-describedby="hint">
            Inbox
          </button>
        </OgeBadge>
      </>,
    );
    const button = screen.getByRole('button', { name: 'Inbox' });
    expect(button).toHaveAccessibleDescription('Opens your mail 5 new items');
    const badge = document.querySelector('.oge-badge') as HTMLElement;
    expect(badge.className).toContain('oge-badge-overlay');
    expect(badge.className).toContain('oge-badge-bottom-start');
    expect(badge.className).toContain('oge-badge-accent');
    const glyph = badge.querySelector('.oge-badge-indicator') as HTMLElement;
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    expect(glyph.textContent).toBe('5');
    expect(badge.querySelector('.oge-badge-sr')).toBeNull();
  });

  it('standalone: visually hidden description inline; dot reads New', () => {
    render(
      <>
        <OgeBadge value={120} />
        <OgeBadge dot />
      </>,
    );
    const [count, dot] = Array.from(document.querySelectorAll('.oge-badge'));
    expect(count.querySelector('.oge-badge-indicator')?.textContent).toBe(
      '99+',
    );
    expect(count.querySelector('.oge-badge-sr')?.textContent).toBe(
      'More than 99 new items',
    );
    expect(dot.querySelector('.oge-badge-sr')?.textContent).toBe('New');
  });

  it('a hidden badge renders nothing and detaches its description', () => {
    const { rerender } = render(
      <OgeBadge value={3}>
        <button type="button">Inbox</button>
      </OgeBadge>,
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-describedby')).toMatch(/^oge-badge-/);
    rerender(
      <OgeBadge value={0}>
        <button type="button">Inbox</button>
      </OgeBadge>,
    );
    expect(document.querySelector('.oge-badge-indicator')).toBeNull();
    expect(button.hasAttribute('aria-describedby')).toBe(false);
  });

  it('announce speaks later changes only', () => {
    const { rerender } = render(<OgeBadge value={5} announce />);
    const live = () => document.querySelector('[aria-live]') as HTMLElement;
    expect(live().textContent).toBe('');
    rerender(<OgeBadge value={6} announce />);
    expect(live().textContent).toBe('6 new items');
  });

  it('reads max, severity and messages from the provider', () => {
    render(
      <OgeBadgeConfigProvider config={{ max: 9, severity: 'success' }}>
        <OgeBadge value={12} />
      </OgeBadgeConfigProvider>,
    );
    const badge = document.querySelector('.oge-badge') as HTMLElement;
    expect(badge.className).toContain('oge-badge-success');
    expect(badge.querySelector('.oge-badge-indicator')?.textContent).toBe('9+');
  });

  it('cleans up on unmount and survives StrictMode', () => {
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    const { unmount } = render(
      <StrictMode>
        <OgeBadge value={2}>
          <button type="button">Inbox</button>
        </OgeBadge>
      </StrictMode>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleDescription('2 new items');
    unmount();
    outside.remove();
  });
});

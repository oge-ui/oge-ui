import { StrictMode, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { act, render, renderHook } from '@testing-library/react';
import { OGE_LIVE_ANNOUNCER_ATTR, getOgeLiveAnnouncer } from '@oge-ui/behavior';
import { useOgeLiveAnnouncer } from './live-announcer';

const region = (mode: 'polite' | 'assertive') =>
  document.querySelector(`[${OGE_LIVE_ANNOUNCER_ATTR}="${mode}"]`);
const wait = (ms: number) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

afterEach(() => getOgeLiveAnnouncer().clear());

describe('useOgeLiveAnnouncer', () => {
  it('returns a handle that is stable across renders', () => {
    const { result, rerender } = renderHook(() => useOgeLiveAnnouncer());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('speaks through the shared regions from an effect (StrictMode)', async () => {
    function Saver() {
      const announcer = useOgeLiveAnnouncer();
      useEffect(() => {
        announcer.announce('Changes saved');
        announcer.announce('Upload failed', { politeness: 'assertive' });
      }, [announcer]);
      return null;
    }
    render(
      <StrictMode>
        <Saver />
      </StrictMode>,
    );
    await wait(150);
    expect(region('polite')?.textContent).toBe('Changes saved');
    expect(region('assertive')?.textContent).toBe('Upload failed');
    expect(
      document.querySelectorAll(`[${OGE_LIVE_ANNOUNCER_ATTR}]`),
    ).toHaveLength(2);
  });

  it('touches no DOM while rendering (SSR-safe)', () => {
    document.body.innerHTML = '';
    function Server() {
      useOgeLiveAnnouncer();
      return <p>ok</p>;
    }
    expect(renderToString(<Server />)).toContain('ok');
    expect(region('polite')).toBeNull();
  });
});

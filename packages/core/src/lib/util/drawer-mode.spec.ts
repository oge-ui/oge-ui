import { resolveDrawerMode, type OgeDrawerLayoutMode } from './drawer-mode';

function resolve(
  requestedMode: OgeDrawerLayoutMode,
  containerSize: number,
  compactBelow?: number,
) {
  return resolveDrawerMode({ requestedMode, containerSize, compactBelow });
}

describe('resolveDrawerMode', () => {
  it('keeps the requested mode when no threshold is configured', () => {
    expect(resolve('side', 320)).toEqual({ mode: 'side', compact: false });
    expect(resolve('push', 100)).toEqual({ mode: 'push', compact: false });
  });

  it('keeps the requested mode while the container is wide enough', () => {
    expect(resolve('side', 900, 720)).toEqual({ mode: 'side', compact: false });
  });

  it('treats the threshold as inclusive at the boundary', () => {
    // exactly at the threshold there is still room
    expect(resolve('side', 720, 720)).toEqual({ mode: 'side', compact: false });
    expect(resolve('side', 719, 720)).toEqual({
      mode: 'overlay',
      compact: true,
    });
  });

  it('downgrades both space-taking modes to overlay', () => {
    expect(resolve('side', 400, 720)).toEqual({
      mode: 'overlay',
      compact: true,
    });
    expect(resolve('push', 400, 720)).toEqual({
      mode: 'overlay',
      compact: true,
    });
  });

  it('never reports overlay as compact — it is already the compact shape', () => {
    expect(resolve('overlay', 100, 720)).toEqual({
      mode: 'overlay',
      compact: false,
    });
  });

  it('leaves an unmeasured container on the requested mode', () => {
    // jsdom and the first render before layout both report zero
    expect(resolve('side', 0, 720)).toEqual({ mode: 'side', compact: false });
    expect(resolve('side', -1, 720)).toEqual({ mode: 'side', compact: false });
  });
});

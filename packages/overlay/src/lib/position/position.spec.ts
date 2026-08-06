import { resolvePopupPosition, type OgePopupPositionRequest } from './position';

const VIEWPORT = { width: 1000, height: 800 };
const ANCHOR = { top: 100, left: 200, width: 120, height: 40 }; // bottom=140, right=320

function req(
  partial: Partial<OgePopupPositionRequest>,
): OgePopupPositionRequest {
  return {
    anchor: ANCHOR,
    panel: { width: 200, height: 150 },
    viewport: VIEWPORT,
    placement: 'bottom-start',
    ...partial,
  };
}

describe('resolvePopupPosition', () => {
  it('places bottom-start verbatim when everything fits', () => {
    const result = resolvePopupPosition(req({}));
    expect(result).toEqual({ top: 144, left: 200, placement: 'bottom-start' });
  });

  it('applies a custom offset on the main axis', () => {
    const result = resolvePopupPosition(req({ offset: 12 }));
    expect(result.top).toBe(152);
  });

  it('aligns the end edge for bottom-end', () => {
    const result = resolvePopupPosition(req({ placement: 'bottom-end' }));
    // anchor.right (320) - panel.width (200)
    expect(result).toEqual({ top: 144, left: 120, placement: 'bottom-end' });
  });

  it('places above the anchor for top-start when there is room', () => {
    const anchor = { top: 400, left: 200, width: 120, height: 40 };
    const result = resolvePopupPosition(
      req({ anchor, placement: 'top-start' }),
    );
    expect(result.placement).toBe('top-start');
    expect(result.top).toBe(400 - 4 - 150);
  });

  it('flips top → bottom when above has no room but below does', () => {
    const result = resolvePopupPosition(req({ placement: 'top-start' }));
    // only 88px above the anchor but plenty below → flip
    expect(result.placement).toBe('bottom-start');
    expect(result.top).toBe(144);
  });

  it('flips bottom → top when below has no room but above does', () => {
    const anchor = { top: 700, left: 200, width: 120, height: 40 }; // bottom=740, 60px below - offset - padding
    const result = resolvePopupPosition(req({ anchor }));
    expect(result.placement).toBe('top-start');
    expect(result.top).toBe(700 - 4 - 150);
  });

  it('keeps the preferred side when neither fits but it has more space', () => {
    // anchor in the vertical middle-lower area; panel taller than both spaces,
    // but below (392) > above (348) with preferred bottom.
    const anchor = { top: 360, left: 200, width: 120, height: 40 };
    const result = resolvePopupPosition(
      req({ anchor, panel: { width: 200, height: 700 } }),
    );
    expect(result.placement).toBe('bottom-start');
    // clamped: 800 - 700 - 8
    expect(result.top).toBe(92);
  });

  it('flips to the side with more space when neither fits', () => {
    // preferred bottom has less space than top → flip even though top cannot fully fit
    const anchor = { top: 600, left: 200, width: 120, height: 40 };
    const result = resolvePopupPosition(
      req({ anchor, panel: { width: 200, height: 700 } }),
    );
    expect(result.placement).toBe('top-start');
    expect(result.top).toBe(8); // clamped to padding
  });

  it('falls back to the other alignment when start overflows more', () => {
    const anchor = { top: 100, left: 900, width: 80, height: 40 }; // right=980
    const result = resolvePopupPosition(req({ anchor }));
    // start-left 900 overflows by 108; end-left 980-200=780 fits
    expect(result.placement).toBe('bottom-end');
    expect(result.left).toBe(780);
  });

  it('clamps into the viewport padding on both edges', () => {
    const anchor = { top: 100, left: -50, width: 60, height: 40 };
    const result = resolvePopupPosition(req({ anchor }));
    expect(result.left).toBe(8);

    const wide = resolvePopupPosition(
      req({ panel: { width: 2000, height: 100 } }),
    );
    expect(wide.left).toBe(8); // lower bound wins for oversized panels
  });

  it('RTL: start aligns to the anchor right edge on vertical sides', () => {
    const result = resolvePopupPosition(req({ rtl: true }));
    // physical end alignment: anchor.right (320) - width (200) = 120, placement stays logical
    expect(result.left).toBe(120);
    expect(result.placement).toBe('bottom-start');
  });

  it('RTL: left/right sides swap physically but report logical placement', () => {
    const result = resolvePopupPosition(
      req({
        placement: 'right-start',
        panel: { width: 100, height: 60 },
        rtl: true,
      }),
    );
    // logical right = physical left: anchor.left (200) - offset - width = 96
    expect(result.left).toBe(96);
    expect(result.top).toBe(100);
    expect(result.placement).toBe('right-start');
  });

  it('left-end aligns the panel bottom with the anchor bottom', () => {
    const result = resolvePopupPosition(
      req({ placement: 'left-end', panel: { width: 100, height: 60 } }),
    );
    expect(result.left).toBe(200 - 4 - 100);
    expect(result.top).toBe(140 - 60);
    expect(result.placement).toBe('left-end');
  });

  it('flips left → right when there is no room on the left', () => {
    const anchor = { top: 100, left: 30, width: 120, height: 40 };
    const result = resolvePopupPosition(
      req({
        anchor,
        placement: 'left-start',
        panel: { width: 100, height: 60 },
      }),
    );
    expect(result.placement).toBe('right-start');
    expect(result.left).toBe(30 + 120 + 4);
  });
});

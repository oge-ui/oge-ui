import { describe, expect, it } from 'vitest';
import { popupArrowInset, resolvePopupArrow } from './arrow';

const anchor = { top: 100, left: 100, width: 40, height: 20 };

describe('resolvePopupArrow', () => {
  it('sits on the panel edge facing the anchor', () => {
    const panel = { top: 130, left: 60, width: 120, height: 50 };
    expect(resolvePopupArrow({ anchor, panel, placement: 'bottom' }).side).toBe(
      'top',
    );
    expect(resolvePopupArrow({ anchor, panel, placement: 'top' }).side).toBe(
      'bottom',
    );
    expect(
      resolvePopupArrow({ anchor, panel, placement: 'right-start' }).side,
    ).toBe('left');
    expect(resolvePopupArrow({ anchor, panel, placement: 'left' }).side).toBe(
      'right',
    );
  });

  it('points at the anchor centre along the edge', () => {
    const panel = { top: 130, left: 60, width: 120, height: 50 };
    // anchor centre x = 120 → 60 px from the panel's left edge
    expect(resolvePopupArrow({ anchor, panel, placement: 'bottom' })).toEqual({
      side: 'top',
      offset: 60,
    });
    // horizontal: anchor centre y = 110 → panel top 90 → 20 px down its edge
    const side = { top: 90, left: 150, width: 120, height: 80 };
    expect(
      resolvePopupArrow({ anchor, panel: side, placement: 'right' }),
    ).toEqual({ side: 'left', offset: 20 });
  });

  it('clamps inside the edge so it never rides over a rounded corner', () => {
    // panel shifted far right by the viewport clamp
    const panel = { top: 130, left: 110, width: 200, height: 50 };
    expect(
      resolvePopupArrow({ anchor, panel, placement: 'bottom' }).offset,
    ).toBe(12);
    const left = { top: 130, left: -150, width: 200, height: 50 };
    expect(
      resolvePopupArrow({ anchor, panel: left, placement: 'bottom' }).offset,
    ).toBe(188);
    expect(
      resolvePopupArrow({
        anchor,
        panel: left,
        placement: 'bottom',
        edgePadding: 4,
      }).offset,
    ).toBe(196);
  });

  it('centres on a panel too small for both paddings', () => {
    const panel = { top: 130, left: 0, width: 16, height: 20 };
    expect(
      resolvePopupArrow({ anchor, panel, placement: 'bottom' }).offset,
    ).toBe(8);
  });

  it('mirrors left/right sides in RTL like the placement does', () => {
    const panel = { top: 90, left: 10, width: 80, height: 40 };
    expect(
      resolvePopupArrow({ anchor, panel, placement: 'right', rtl: true }).side,
    ).toBe('right');
    expect(
      resolvePopupArrow({ anchor, panel, placement: 'bottom', rtl: true }).side,
    ).toBe('top');
  });
});

describe('popupArrowInset', () => {
  it('maps the offset onto the axis along the edge', () => {
    expect(popupArrowInset({ side: 'top', offset: 20 })).toEqual({
      left: 20,
      top: null,
    });
    expect(popupArrowInset({ side: 'right', offset: 9 })).toEqual({
      left: null,
      top: 9,
    });
  });
});

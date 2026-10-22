import { ogeRichText } from '../model/cell';
import type { OgePicture } from '../model/sheet-features';
import { createOgeWorkbook } from '../model/workbook';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgePaintPicture } from '../paint/pictures';
import { OgeStyleResolver } from '../paint/resolve-style';
import { OgeSheetLayout } from '../paint/sheet-layout';
import {
  ogeGridView,
  ogeHeaderMarks,
  ogeHeaderStrips,
  ogeNoteBoxes,
  ogePanePictures,
  ogePaneStyle,
  ogePointerCell,
  ogeSliderToZoom,
  ogeTabKeyTarget,
  ogeZoomToSlider,
} from './grid-view';
import { ogeCellSelection } from './navigation';
import type { OgeRenderPane } from './render';
import { ogeViewportPanes, type OgeViewportInput } from './viewport';

// Calibri 11: a 26 px row-number column and a 20 px letter row, 64 × 20 px cells; the cell area is 640 × 400
function setup(build: (sheet: OgeWorksheet) => void = () => undefined) {
  const workbook = createOgeWorkbook();
  const sheet = workbook.sheets[0];
  build(sheet);
  const layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
  const panes = (input: Partial<OgeViewportInput> = {}) =>
    ogeViewportPanes(sheet, layout, {
      scrollTop: 0,
      scrollLeft: 0,
      width: 666,
      height: 420,
      zoom: 100,
      active: { row: 0, col: 0 },
      ...input,
    });
  return { sheet, layout, panes };
}

const frozen = (sheet: OgeWorksheet) => {
  sheet.view = { ...sheet.view, frozenRows: 2, frozenColumns: 1 };
};

function picture(
  x: number,
  y: number,
  extra: Partial<OgePicture> = {},
): OgePaintPicture {
  const corner = { row: 0, col: 0, rowOffset: 0, colOffset: 0 };
  return {
    picture: {
      anchor: { kind: 'oneCell', from: corner, width: 40, height: 30 },
      image: 'xl/media/image1.png',
      ...extra,
    },
    x,
    y,
    width: 40,
    height: 30,
  };
}

const rect = { left: 100, right: 766, top: 50 };

describe('ogePaneStyle', () => {
  it('puts each pane in its cell of the 3 × 3 grid, the frozen ones sticky under the headers', () => {
    const { panes } = setup(frozen);
    const p = panes();
    expect(ogePaneStyle('main', p)).toEqual({
      gridRow: '3',
      gridColumn: '3',
      width: `${p.scrollWidth}px`,
      height: `${p.scrollHeight}px`,
    });
    expect(ogePaneStyle('top', p)).toMatchObject({
      gridRow: '2 / 4',
      position: 'sticky',
      top: '20px',
      height: '40px',
      zIndex: '2',
    });
    expect(ogePaneStyle('left', p)).toMatchObject({
      gridColumn: '2 / 4',
      position: 'sticky',
      insetInlineStart: '26px',
      width: '64px',
    });
    expect(ogePaneStyle('corner', p)).toMatchObject({
      top: '20px',
      insetInlineStart: '26px',
      width: '64px',
      height: '40px',
      zIndex: '3',
    });
  });
});

describe('ogeHeaderStrips', () => {
  it('gives one strip per axis, and a frozen one over frozen panes', () => {
    const plain = setup();
    const one = ogeHeaderStrips(plain.panes(), ogeCellSelection(0, 0));
    expect(one.columns.map((s) => s.key)).toEqual(['scrolling']);
    expect(one.rows.map((s) => s.key)).toEqual(['scrolling']);
    expect(one.columns[0].cells[0]).toMatchObject({
      label: 'A',
      offset: 0,
      size: 64,
    });

    const split = setup(frozen);
    const two = ogeHeaderStrips(split.panes(), ogeCellSelection(0, 0));
    expect(two.columns.map((s) => [s.key, s.frozen])).toEqual([
      ['scrolling', false],
      ['frozen', true],
    ]);
    expect(two.rows[1].cells.map((c) => c.label)).toEqual(['1', '2']);
    expect(two.rows[1].style).toMatchObject({
      top: '20px',
      insetInlineStart: '0',
      zIndex: '5',
    });
  });

  it('draws none without headers', () => {
    const { panes } = setup(frozen);
    expect(
      ogeHeaderStrips(panes({ headers: false }), ogeCellSelection(0, 0)),
    ).toEqual({ columns: [], rows: [] });
  });

  it('marks the selection on both strips, as long as its frame', () => {
    const { panes } = setup();
    // C4:D5 — the frame below runs 126..256 × 58..100
    const strips = ogeHeaderStrips(panes(), {
      ranges: [{ top: 3, left: 2, bottom: 4, right: 3 }],
      active: { row: 3, col: 2 },
      anchor: { row: 3, col: 2 },
    });
    expect(strips.columns[0].marks).toEqual([
      {
        key: 'edge-2',
        kind: 'edge',
        style: { left: '126px', top: '18px', width: '131px', height: '2px' },
      },
      {
        key: 'separator-2',
        kind: 'separator',
        style: { left: '127px', top: '0', width: '1px', height: '18px' },
      },
    ]);
    expect(strips.rows[0].marks).toEqual([
      {
        key: 'edge-3',
        kind: 'edge',
        style: { left: '24px', top: '58px', width: '2px', height: '43px' },
      },
      {
        key: 'separator-3',
        kind: 'separator',
        style: { left: '0', top: '59px', width: '24px', height: '1px' },
      },
    ]);
  });
});

describe('ogeHeaderMarks', () => {
  const cell = (
    index: number,
    offset: number,
    state: 'none' | 'selected' | 'full',
    size = 64,
  ) => ({ index, label: String(index), offset, size, state });

  it('gives each run of selected headers its own edge and separator', () => {
    const marks = ogeHeaderMarks(
      'columns',
      [
        cell(0, 0, 'selected'),
        cell(1, 64, 'none'),
        cell(2, 128, 'selected'),
        cell(3, 192, 'selected'),
      ],
      20,
    );
    expect(
      marks.map((m) => [m.key, m.style['left'], m.style['width']]),
    ).toEqual([
      ['edge-0', '-2px', '67px'],
      ['separator-0', '-1px', '1px'],
      ['edge-2', '126px', '131px'],
      ['separator-2', '127px', '1px'],
    ]);
  });

  it('runs across a hidden header, and leaves whole rows and columns to their fill', () => {
    // column 1 hidden: 0 and 2 touch
    const across = ogeHeaderMarks(
      'columns',
      [cell(0, 0, 'selected'), cell(2, 64, 'selected')],
      20,
    );
    expect(across.filter((m) => m.kind === 'edge')).toHaveLength(1);
    expect(across[0].style['width']).toBe('131px');
    expect(
      ogeHeaderMarks(
        'rows',
        [cell(0, 0, 'full', 20), cell(1, 20, 'full', 20)],
        26,
      ),
    ).toEqual([]);
  });
});

describe('ogeGridView', () => {
  it('composes the panes, their selection and pictures, the sizer, the corner and the header font', () => {
    const { sheet, panes } = setup();
    const p = panes();
    const pane = {
      key: 'main',
      originX: 0,
      originY: 0,
      width: p.scrollWidth,
      height: p.scrollHeight,
    } as OgeRenderPane;
    const pictures = new Map([
      [
        'main' as const,
        [{ key: 'k', url: 'blob:x', alt: '', frame: {}, image: {} }],
      ],
    ]);
    const view = ogeGridView({
      panes: p,
      render: [pane],
      sheet,
      selection: ogeCellSelection(1, 1),
      spill: null,
      pictures,
      fontFamily: 'Calibri, Carlito, sans-serif',
    });
    expect(view.render).toHaveLength(1);
    expect(view.render[0].style).toEqual(ogePaneStyle('main', p));
    expect(view.render[0].selection.frame).toMatchObject({
      left: '62px',
      top: '18px',
    });
    expect(view.render[0].pictures).toHaveLength(1);
    expect(view.sizer).toMatchObject({
      gridTemplateColumns: `26px 0px ${p.scrollWidth}px`,
      gridTemplateRows: `20px 0px ${p.scrollHeight}px`,
    });
    expect(view.corner).toMatchObject({
      width: '26px',
      height: '20px',
      zIndex: '6',
    });
    expect(view.headerFont).toEqual({
      fontFamily: 'Calibri, Carlito, sans-serif',
      fontSize: '15px',
      lineHeight: '20px',
    });
    // a pane without pictures gets none
    const top = { ...pane, key: 'top' } as OgeRenderPane;
    expect(
      ogeGridView({
        panes: p,
        render: [top],
        sheet,
        selection: ogeCellSelection(0, 0),
        spill: null,
        pictures,
        fontFamily: 'x',
      }).render[0].pictures,
    ).toEqual([]);
  });
});

describe('ogePanePictures', () => {
  it('places a picture in the pane of its top-left corner, cropped, turned and flipped', () => {
    const { panes } = setup(frozen);
    const p = panes();
    const placed = ogePanePictures(
      [
        picture(10, 10, { name: 'Corner' }),
        picture(100, 10, { description: 'Top' }),
        picture(10, 100),
        picture(100, 100, {
          crop: { left: 0.1, top: 0.2, right: 0.1, bottom: 0 },
          rotation: 90,
          flipV: true,
        }),
      ],
      p,
      { rtl: false, url: () => 'blob:a' },
    );
    expect([...placed.keys()]).toEqual(['corner', 'top', 'left', 'main']);
    expect(placed.get('corner')?.[0]).toMatchObject({
      alt: 'Corner',
      frame: { left: '10px', top: '10px' },
    });
    expect(placed.get('top')?.[0]).toMatchObject({
      alt: 'Top',
      frame: { left: `${100 - p.originX}px`, top: '10px' },
    });
    expect(placed.get('left')?.[0].frame).toMatchObject({
      left: '10px',
      top: `${100 - p.originY}px`,
    });
    const main = placed.get('main')?.[0];
    expect(main?.frame['transform']).toBe('rotate(90deg) scaleY(-1)');
    // 40 px shown of 80% of the width: the image is 50 px wide, shifted by its left crop
    expect(main?.image).toMatchObject({
      width: '50px',
      left: '-5px',
      height: '37.5px',
      top: '-7.5px',
    });
  });

  it('mirrors pictures back in a right-to-left pane and leaves out those without an image', () => {
    const { panes } = setup();
    const p = panes();
    const rtl = ogePanePictures(
      [picture(0, 0), picture(0, 0, { flipH: true })],
      p,
      { rtl: true, url: () => 'blob:a' },
    );
    expect(rtl.get('main')?.map((m) => m.frame['transform'])).toEqual([
      'scaleX(-1)',
      undefined,
    ]);
    const ltr = ogePanePictures([picture(0, 0, { flipH: true })], p, {
      rtl: false,
      url: () => 'blob:a',
    });
    expect(ltr.get('main')?.[0].frame['transform']).toBe('scaleX(-1)');
    expect(
      ogePanePictures([picture(0, 0)], p, { rtl: false, url: () => null }).size,
    ).toBe(0);
  });
});

describe('ogeNoteBoxes', () => {
  it('shows pinned notes and the open ones beside the cell’s top-right corner', () => {
    const { sheet, panes } = setup((s) => {
      s.setNote(0, 0, { text: 'pinned', visible: true });
      s.setNote(3, 2, {
        text: ogeRichText([
          { text: 'Ada:', font: { bold: true } },
          { text: ' look', font: { italic: true } },
        ]),
      });
      s.setNote(5, 5, { text: 'hidden' });
    });
    const boxes = ogeNoteBoxes(
      sheet,
      panes(),
      [{ row: 3, col: 2 }, null, { row: 9, col: 9 }],
      { scrollTop: 0, scrollLeft: 0 },
    );
    expect(boxes.map((b) => b.key)).toEqual(['0:0', '3:2']);
    // past column A's right edge and the row header, 6 px above the row
    expect(boxes[0].style).toEqual({
      insetInlineStart: `${64 + 26 + 10}px`,
      top: '14px',
    });
    expect(boxes[1].runs).toEqual([
      { text: 'Ada:', bold: true, italic: false },
      { text: ' look', bold: false, italic: true },
    ]);
    expect(boxes[1].style).toEqual({
      insetInlineStart: `${3 * 64 + 26 + 10}px`,
      top: `${3 * 20 + 20 - 6}px`,
    });
    // the same cell open twice is one note
    expect(
      ogeNoteBoxes(sheet, panes(), [{ row: 0, col: 0 }], {
        scrollTop: 0,
        scrollLeft: 0,
      }),
    ).toHaveLength(1);
  });

  it('moves with the scroll unless the cell is frozen, and never past the grid’s edge', () => {
    const { sheet, panes } = setup((s) => {
      frozen(s);
      s.setNote(0, 0, { text: 'frozen' });
      s.setNote(5, 3, { text: 'scrolls' });
    });
    const p = panes({ scrollTop: 40, scrollLeft: -64 });
    const [fixed, moving] = ogeNoteBoxes(
      sheet,
      p,
      [
        { row: 0, col: 0 },
        { row: 5, col: 3 },
      ],
      { scrollTop: 40, scrollLeft: -64 },
    );
    expect(fixed.style).toEqual({
      insetInlineStart: `${64 + 26 + 10}px`,
      top: '14px',
    });
    const x = 4 * 64 - (p.originX + 64 - p.frozenWidth) + 26 + 10;
    const y = 5 * 20 - (p.originY + 40 - p.frozenHeight) + 20 - 6;
    expect(moving.style).toEqual({ insetInlineStart: `${x}px`, top: `${y}px` });
    const far = ogeNoteBoxes(sheet, p, [{ row: 5, col: 3 }], {
      scrollTop: 4000,
      scrollLeft: 4000,
    });
    expect(far[0].style).toEqual({ insetInlineStart: '0px', top: '0px' });
  });
});

describe('ogePointerCell', () => {
  it('finds the cell under the pointer, over neither header', () => {
    const { sheet, panes } = setup();
    const p = panes();
    const point = (
      x: number,
      y: number,
      scroll = { scrollTop: 0, scrollLeft: 0 },
    ) => ({ clientX: rect.left + x, clientY: rect.top + y, rect, ...scroll });
    expect(ogePointerCell(sheet, p, point(26 + 70, 20 + 25))).toEqual({
      row: 1,
      col: 1,
    });
    expect(ogePointerCell(sheet, p, point(10, 30))).toBeNull();
    expect(ogePointerCell(sheet, p, point(40, 10))).toBeNull();
    expect(ogePointerCell(sheet, p, point(26 + 640, 30))).toBeNull();
    // scrolled: the scroll offset adds in
    const scrolled = panes({ scrollTop: 200, scrollLeft: 128 });
    expect(
      ogePointerCell(
        sheet,
        scrolled,
        point(26 + 1, 20 + 1, { scrollTop: 200, scrollLeft: 128 }),
      ),
    ).toEqual({ row: 10, col: 2 });
  });

  it('starts a right-to-left grid at the right edge and keeps frozen panes still', () => {
    const rtl = setup((s) => {
      s.view = { ...s.view, rightToLeft: true };
    });
    const p = rtl.panes();
    expect(
      ogePointerCell(rtl.sheet, p, {
        clientX: rect.right - 26 - 70,
        clientY: rect.top + 30,
        rect,
        scrollTop: 0,
        scrollLeft: 0,
      }),
    ).toEqual({ row: 0, col: 1 });
    const split = setup(frozen);
    const scrolled = split.panes({ scrollTop: 100, scrollLeft: 0 });
    // inside the frozen rows the scroll does not count
    expect(
      ogePointerCell(split.sheet, scrolled, {
        clientX: rect.left + 30,
        clientY: rect.top + 20 + 25,
        rect,
        scrollTop: 100,
        scrollLeft: 0,
      }),
    ).toEqual({ row: 1, col: 0 });
  });

  it('snaps to the nearest cell for a drag, and finds none in a grid with no room', () => {
    const { sheet, panes } = setup();
    const p = panes();
    expect(
      ogePointerCell(
        sheet,
        p,
        {
          clientX: rect.left + 5,
          clientY: rect.top + 5,
          rect,
          scrollTop: 0,
          scrollLeft: 0,
        },
        true,
      ),
    ).toEqual({ row: 0, col: 0 });
    expect(
      ogePointerCell(
        sheet,
        p,
        {
          clientX: rect.left + 5000,
          clientY: rect.top + 5000,
          rect,
          scrollTop: 0,
          scrollLeft: 0,
        },
        true,
      ),
    ).toEqual({ row: 19, col: 9 });
    const none = panes({ width: 20, height: 10 });
    expect(
      ogePointerCell(
        sheet,
        none,
        {
          clientX: rect.left,
          clientY: rect.top,
          rect,
          scrollTop: 0,
          scrollLeft: 0,
        },
        true,
      ),
    ).toBeNull();
  });
});

describe('zoom slider', () => {
  it('puts 100% in the middle, 10% and 400% at the ends', () => {
    expect([10, 55, 100, 250, 400].map(ogeZoomToSlider)).toEqual([
      0, 50, 100, 150, 200,
    ]);
    expect([0, 50, 100, 150, 200].map(ogeSliderToZoom)).toEqual([
      10, 55, 100, 250, 400,
    ]);
  });
});

describe('ogeTabKeyTarget', () => {
  const tabs = [{ index: 0 }, { index: 2 }, { index: 3 }];

  it('steps with the arrows, mirrored on a right-to-left page, and jumps with Home and End', () => {
    expect(ogeTabKeyTarget(tabs, 2, 'ArrowRight', false)).toBe(3);
    expect(ogeTabKeyTarget(tabs, 2, 'ArrowLeft', false)).toBe(0);
    expect(ogeTabKeyTarget(tabs, 2, 'ArrowLeft', true)).toBe(3);
    expect(ogeTabKeyTarget(tabs, 3, 'ArrowRight', false)).toBe(3);
    expect(ogeTabKeyTarget(tabs, 0, 'ArrowLeft', false)).toBe(0);
    expect(ogeTabKeyTarget(tabs, 2, 'Home', false)).toBe(0);
    expect(ogeTabKeyTarget(tabs, 0, 'End', true)).toBe(3);
  });

  it('leaves other keys and an empty strip alone', () => {
    expect(ogeTabKeyTarget(tabs, 0, 'Enter', false)).toBeNull();
    expect(ogeTabKeyTarget([], 0, 'Home', false)).toBeNull();
  });
});

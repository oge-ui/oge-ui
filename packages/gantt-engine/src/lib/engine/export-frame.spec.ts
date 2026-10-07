import { ganttExportFrame } from './export-frame';

describe('ganttExportFrame', () => {
  it('LTR: title column on the left, time grows to the right', () => {
    const frame = ganttExportFrame(10, 410, 100, false);
    expect(frame).toMatchObject({
      titleLeft: 10,
      titleRight: 110,
      chartLeft: 110,
      chartRight: 410,
      chartWidth: 300,
      textAlign: 'left',
    });
    expect(frame.x(0)).toBe(110);
    expect(frame.x(1)).toBe(410);
    expect(frame.span(0.1, 0.2)).toEqual({ left: 140, width: 30 });
    expect(frame.titleX(6)).toBe(16);
    expect(frame.tickLabelX(0, 3)).toBe(113);
  });

  it('RTL: title column on the right, time grows to the left', () => {
    const frame = ganttExportFrame(10, 410, 100, true);
    expect(frame).toMatchObject({
      titleLeft: 310,
      titleRight: 410,
      chartLeft: 10,
      chartRight: 310,
      chartWidth: 300,
      textAlign: 'right',
    });
    expect(frame.x(0)).toBe(310);
    expect(frame.x(1)).toBe(10);
    // the same span, mirrored about the chart band
    expect(frame.span(0.1, 0.2)).toEqual({ left: 250, width: 30 });
    expect(frame.titleX(6)).toBe(404);
    expect(frame.tickLabelX(0, 3)).toBe(307);
  });

  it('a minimum width grows away from the start edge', () => {
    expect(ganttExportFrame(0, 100, 0, false).span(0.5, 0.5, 2)).toEqual({
      left: 50,
      width: 2,
    });
    expect(ganttExportFrame(0, 100, 0, true).span(0.5, 0.5, 2)).toEqual({
      left: 48,
      width: 2,
    });
  });

  it('fromStart fills from the start edge of a box', () => {
    const box = { left: 100, width: 40 };
    expect(ganttExportFrame(0, 400, 0, false).fromStart(box, 0.25)).toEqual({
      left: 100,
      width: 10,
    });
    expect(ganttExportFrame(0, 400, 0, true).fromStart(box, 0.25)).toEqual({
      left: 130,
      width: 10,
    });
  });
});

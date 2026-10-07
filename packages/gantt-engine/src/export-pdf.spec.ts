import type { OgeGanttExportData, OgeGanttTask } from './lib/gantt-types';
import type { jsPDF } from 'jspdf';
import { buildGanttPdfDocument } from './export-pdf';

// every document records its `text` / `roundedRect` calls (jsPDF defines its
// drawing methods per instance, so a prototype spy cannot see them)
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jspdf')>();
  class RecordingPdf extends actual.jsPDF {
    readonly __text: unknown[][] = [];
    readonly __rect: unknown[][] = [];
    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      const text = this.text.bind(this);
      const rect = this.roundedRect.bind(this);
      this.text = ((...call: Parameters<typeof text>) => {
        this.__text.push(call);
        return text(...call);
      }) as typeof text;
      this.roundedRect = ((...call: Parameters<typeof rect>) => {
        this.__rect.push(call);
        return rect(...call);
      }) as typeof rect;
    }
  }
  return { ...actual, jsPDF: RecordingPdf };
});

function task(
  key: number,
  title: string,
  start: Date,
  end: Date,
  overrides: Partial<OgeGanttTask> = {},
): OgeGanttTask {
  return {
    key,
    source: { key },
    parentKey: null,
    level: 0,
    title,
    start,
    end,
    progress: 50,
    color: undefined,
    baselineStart: undefined,
    baselineEnd: undefined,
    isMilestone: start.getTime() === end.getTime(),
    isSummary: false,
    expanded: true,
    hasChildren: false,
    resourceIds: [],
    wbs: '',
    manuallyScheduled: false,
    constraintType: 'ASAP',
    constraintDate: undefined,
    deadline: undefined,
    segments: [],
    baselines: [],
    units: [],
    effort: undefined,
    ...overrides,
  };
}

function data(tasks: OgeGanttTask[]): OgeGanttExportData {
  return {
    tasks,
    columns: [{ field: 'title', header: 'Task', text: (t) => t.title }],
    rangeStart: new Date(2026, 7, 1),
    rangeEnd: new Date(2026, 8, 1),
    critical: new Set([1]),
    resourceText: () => null,
  };
}

describe('buildGanttPdfDocument', () => {
  it('draws a landscape single-page document for a small plan', () => {
    const doc = buildGanttPdfDocument(
      data([
        task(1, 'Build', new Date(2026, 7, 3), new Date(2026, 7, 14)),
        task(2, 'Ship', new Date(2026, 7, 14), new Date(2026, 7, 14)),
      ]),
      { title: 'Plan' },
    );
    expect(doc.getNumberOfPages()).toBe(1);
    const { width, height } = doc.internal.pageSize;
    expect(width).toBeGreaterThan(height); // landscape default
  });

  it('paginates long plans and repeats the scale header', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      task(i + 1, `Task ${i + 1}`, new Date(2026, 7, 3), new Date(2026, 7, 5)),
    );
    const doc = buildGanttPdfDocument(data(many));
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('mirrors the layout for an RTL chart (snapshot rtl or the option)', () => {
    const plan = [
      task(1, 'Build', new Date(2026, 7, 3), new Date(2026, 7, 14)),
    ];
    const recorded = (doc: jsPDF) =>
      doc as unknown as {
        __text: unknown[][];
        __rect: unknown[][];
      };
    const titleCall = (doc: jsPDF) =>
      recorded(doc).__text.find((call) => call[0] === 'Build') as [
        string,
        number,
        number,
        { align?: string }?,
      ];

    const ltrDoc = buildGanttPdfDocument(data(plan));
    const pageW = ltrDoc.internal.pageSize.getWidth();
    expect(titleCall(ltrDoc)[1]).toBe(12);
    expect(titleCall(ltrDoc)[3]?.align).toBe('left');
    const ltrBar = recorded(ltrDoc).__rect[0] as number[];

    const rtlDoc = buildGanttPdfDocument({ ...data(plan), rtl: true });
    expect(titleCall(rtlDoc)[1]).toBe(pageW - 12);
    expect(titleCall(rtlDoc)[3]?.align).toBe('right');
    const rtlBar = recorded(rtlDoc).__rect[0] as number[];
    // the bar is the LTR bar mirrored about the page, less the title column
    const ltrStartOffset = ltrBar[0] - (12 + 60);
    expect(rtlBar[0] + rtlBar[2]).toBeCloseTo(pageW - 12 - 60 - ltrStartOffset);
    expect(rtlBar[2]).toBeCloseTo(ltrBar[2]);

    const forced = buildGanttPdfDocument(
      { ...data(plan), rtl: true },
      { rtl: false },
    );
    expect(titleCall(forced)[3]?.align).toBe('left');
  });

  it('honors portrait orientation', () => {
    const doc = buildGanttPdfDocument(
      data([task(1, 'Solo', new Date(2026, 7, 3), new Date(2026, 7, 5))]),
      { orientation: 'portrait' },
    );
    const { width, height } = doc.internal.pageSize;
    expect(height).toBeGreaterThan(width);
  });
});

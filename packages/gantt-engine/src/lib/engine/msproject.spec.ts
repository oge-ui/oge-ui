import {
  buildGanttDependencies,
  buildGanttTasks,
  resolveGanttFields,
} from './gantt-model';
import {
  buildMsProjectXml,
  parseMsProjectXml,
  parseMsXml,
  type MsProjectDependencyItem,
  type MsProjectTaskItem,
} from './msproject';

const fields = resolveGanttFields<MsProjectTaskItem>({
  keyExpr: 'id',
  parentKeyExpr: 'parentId',
  titleExpr: 'title',
  startExpr: 'start',
  endExpr: 'end',
  progressExpr: 'progress',
  colorExpr: 'color',
  baselineStartExpr: 'baselineStart',
  baselineEndExpr: 'baselineEnd',
  resourceIdExpr: 'resourceId',
});
const d = (day: number, hour = 0) => new Date(2026, 0, day, hour);

const ITEMS: MsProjectTaskItem[] = [
  {
    id: 1,
    parentId: null,
    title: 'Phase <A> & "B"',
    start: d(5),
    end: d(5),
    progress: 0,
  },
  {
    id: 2,
    parentId: 1,
    title: 'Design',
    start: d(5),
    end: d(8),
    progress: 50,
    constraintType: 'SNET',
    constraintDate: d(5),
    deadline: d(9),
    baselines: [{ start: d(5), end: d(7) }],
    resourceId: [7],
    units: [50],
    effort: 12,
  },
  {
    id: 3,
    parentId: 1,
    title: 'Build',
    start: d(9),
    end: d(13),
    progress: 0,
    manuallyScheduled: true,
  },
  {
    id: 4,
    parentId: null,
    title: 'Go live',
    start: d(14),
    end: d(14),
    progress: 0,
  },
];
const LINKS: MsProjectDependencyItem[] = [
  {
    id: '2-3',
    predecessorId: 2,
    successorId: 3,
    type: 'FS',
    lag: 1,
    lagUnit: 'days',
  },
  {
    id: '3-4',
    predecessorId: 3,
    successorId: 4,
    type: 'SS',
    lag: -4,
    lagUnit: 'hours',
  },
];

function exportSample(): string {
  const tasks = buildGanttTasks(ITEMS, fields, new Set());
  const dependencies = buildGanttDependencies(
    LINKS,
    {
      keyExpr: 'id',
      predecessorKeyExpr: 'predecessorId',
      successorKeyExpr: 'successorId',
      typeExpr: 'type',
    },
    new Set(tasks.map((task) => task.key)),
  );
  return buildMsProjectXml(
    {
      tasks,
      dependencies,
      resources: [{ id: 7, text: 'Ana', capacity: 80 }],
      workCalendar: { workingDays: [1, 2, 3, 4, 5], holidays: [d(1)] },
    },
    { title: 'Launch' },
  );
}

describe('MS Project XML', () => {
  it('writes the MSPDI structure with escaped names, links and assignments', () => {
    const xml = exportSample();
    expect(xml).toContain(
      '<Project xmlns="http://schemas.microsoft.com/project">',
    );
    expect(xml).toContain('<Name>Phase &lt;A&gt; &amp; &quot;B&quot;</Name>');
    expect(xml).toContain('<OutlineLevel>2</OutlineLevel>');
    expect(xml).toContain('<Start>2026-01-05T08:00:00</Start>');
    expect(xml).toContain('<Finish>2026-01-07T17:00:00</Finish>');
    expect(xml).toContain('<ConstraintType>4</ConstraintType>');
    expect(xml).toContain(
      '<PredecessorLink><PredecessorUID>2</PredecessorUID><Type>1</Type><CrossProject>0</CrossProject><LinkLag>4800</LinkLag><LagFormat>7</LagFormat></PredecessorLink>',
    );
    expect(xml).toContain('<LinkLag>-2400</LinkLag><LagFormat>5</LagFormat>');
    expect(xml).toContain('<MaxUnits>0.80</MaxUnits>');
    expect(xml).toContain('<Units>0.50</Units>');
    expect(xml).toContain('<Manual>1</Manual>');
  });

  it('round-trips tasks, links, resources and the calendar', () => {
    const result = parseMsProjectXml(exportSample());
    expect(result.title).toBe('Launch');
    expect(result.tasks.map((task) => [task.id, task.parentId])).toEqual([
      [1, null],
      [2, 1],
      [3, 1],
      [4, null],
    ]);
    const design = result.tasks[1];
    expect(design.start).toEqual(d(5));
    expect(design.end).toEqual(d(8));
    expect(design.progress).toBe(50);
    expect(design.constraintType).toBe('SNET');
    expect(design.constraintDate).toEqual(d(5));
    expect(design.deadline).toEqual(d(9));
    expect(design.baselines).toEqual([{ start: d(5), end: d(7) }]);
    // resources come back under their MSPDI UIDs
    expect(design.resourceId).toEqual([1]);
    expect(design.units).toEqual([50]);
    expect(design.effort).toBe(12);
    expect(result.tasks[2].manuallyScheduled).toBe(true);
    expect(result.tasks[3].start).toEqual(d(14));
    expect(result.tasks[3].end).toEqual(d(14));
    expect(result.dependencies).toEqual([
      {
        id: '2-3',
        predecessorId: 2,
        successorId: 3,
        type: 'FS',
        lag: 1,
        lagUnit: 'days',
      },
      {
        id: '3-4',
        predecessorId: 3,
        successorId: 4,
        type: 'SS',
        lag: -4,
        lagUnit: 'hours',
      },
    ]);
    expect(result.resources).toEqual([{ id: 1, text: 'Ana', capacity: 80 }]);
    expect(result.workCalendar).toEqual({
      workingDays: [1, 2, 3, 4, 5],
      holidays: [d(1)],
    });
  });

  it('reads a project-summary task, namespaces, CDATA and the newer Exceptions block', () => {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE Project>
<p:Project xmlns:p="http://schemas.microsoft.com/project">
  <p:Name><![CDATA[Plan & co]]></p:Name>
  <p:CalendarUID>3</p:CalendarUID>
  <p:Calendars>
    <p:Calendar><p:UID>3</p:UID>
      <p:WeekDays>
        <p:WeekDay><p:DayType>2</p:DayType><p:DayWorking>1</p:DayWorking></p:WeekDay>
        <p:WeekDay><p:DayType>7</p:DayType><p:DayWorking>1</p:DayWorking></p:WeekDay>
      </p:WeekDays>
      <p:Exceptions><p:Exception><p:DayWorking>0</p:DayWorking>
        <p:TimePeriod><p:FromDate>2026-05-01T00:00:00</p:FromDate><p:ToDate>2026-05-02T23:59:00</p:ToDate></p:TimePeriod>
      </p:Exception></p:Exceptions>
    </p:Calendar>
  </p:Calendars>
  <p:Tasks>
    <p:Task><p:UID>0</p:UID><p:OutlineLevel>0</p:OutlineLevel><p:Name>Project</p:Name><p:Start>2026-05-04T08:00:00</p:Start></p:Task>
    <p:Task><p:UID>5</p:UID><p:OutlineLevel>1</p:OutlineLevel><p:Name>Kick&#8209;off &#x26; more</p:Name>
      <p:Start>2026-05-04T09:30:00</p:Start><p:Finish>2026-05-04T12:00:00</p:Finish>
      <p:PredecessorLink><p:PredecessorUID>99</p:PredecessorUID></p:PredecessorLink>
    </p:Task>
  </p:Tasks>
</p:Project>`;
    const result = parseMsProjectXml(xml);
    expect(result.title).toBe('Plan & co');
    expect(result.tasks).toEqual([
      {
        id: 5,
        parentId: null,
        title: 'Kick‑off & more',
        start: new Date(2026, 4, 4, 9, 30),
        end: new Date(2026, 4, 4, 12),
        progress: 0,
      },
    ]);
    // the link to an unknown task is dropped
    expect(result.dependencies).toEqual([]);
    expect(result.workCalendar).toEqual({
      workingDays: [1, 6],
      holidays: [new Date(2026, 4, 1), new Date(2026, 4, 2)],
    });
  });

  it('rejects malformed or foreign documents', () => {
    expect(() => parseMsProjectXml('<Project><Tasks></Project>')).toThrow();
    expect(() => parseMsProjectXml('<html></html>')).toThrow(
      'Not an MS Project XML document',
    );
    expect(() => parseMsXml('just text')).toThrow('No root element');
    expect(() => parseMsXml('<a attr="x>')).toThrow();
  });

  it('never expands DTD entities (no entity bombs)', () => {
    const xml = `<!DOCTYPE x [<!ENTITY a "AAAA">]><Project><Name>&a;</Name></Project>`;
    // the internal subset ends the declaration early; the rest is text, and
    // the custom entity stays literal
    expect(() => parseMsProjectXml(xml)).not.toThrow(RangeError);
  });
});

/**
 * MS Project XML (MSPDI) read/write — dependency-free and DOM-free.
 *
 * The reader is a small tokenizer, not `DOMParser`: it needs no Trusted
 * Types policy (the suite's one `parseFromString` sink stays the BPMN
 * engine's), expands only the five predefined entities and numeric
 * references (no DTD, so no entity bombs), and works in Node. It reads
 * tasks (outline levels → parents, manual mode, constraints, deadlines,
 * baselines), links with lag, resources, assignments with units and the
 * project calendar's working weekdays + exception days.
 *
 * Dates are local wall time (house rule). The suite's tasks run midnight to
 * midnight (exclusive end), MS Project's 08:00–17:00: the writer moves a
 * midnight start to 08:00 and a midnight finish to 17:00 of the previous
 * day, the reader reverses exactly that, so a round trip is lossless.
 */
import type { RowKey } from '@oge-ui/core';
import type {
  GanttConstraintType,
  GanttDependency,
  GanttDependencyType,
  GanttLagUnit,
  GanttTask,
} from './gantt-model';
import { GANTT_CONSTRAINT_TYPES } from './gantt-model';
import {
  workingDaysBetween,
  type GanttWorkCalendar,
} from './work-calendar';

/* ---------------- a minimal XML tree ---------------- */

/** One parsed element (namespace prefixes stripped). */
export interface MsXmlElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: MsXmlElement[];
  text: string;
}

const ENTITIES: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : '';
    }
    return ENTITIES[body] ?? match;
  });
}

function localName(name: string): string {
  const colon = name.indexOf(':');
  return colon >= 0 ? name.slice(colon + 1) : name;
}

/**
 * Parses an XML document into a tree. Throws `Error` on malformed markup
 * (unclosed or mismatched tags, no root).
 */
export function parseMsXml(xml: string): MsXmlElement {
  const root: MsXmlElement = {
    name: '#document',
    attributes: {},
    children: [],
    text: '',
  };
  const stack: MsXmlElement[] = [root];
  let i = 0;
  const length = xml.length;
  while (i < length) {
    const lt = xml.indexOf('<', i);
    const textEnd = lt < 0 ? length : lt;
    if (textEnd > i) {
      stack[stack.length - 1].text += decodeEntities(xml.slice(i, textEnd));
    }
    if (lt < 0) break;
    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt + 4);
      if (end < 0) throw new Error('Unclosed comment');
      i = end + 3;
    } else if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt + 9);
      if (end < 0) throw new Error('Unclosed CDATA section');
      stack[stack.length - 1].text += xml.slice(lt + 9, end);
      i = end + 3;
    } else if (xml.startsWith('<?', lt)) {
      const end = xml.indexOf('?>', lt + 2);
      if (end < 0) throw new Error('Unclosed processing instruction');
      i = end + 2;
    } else if (xml.startsWith('<!', lt)) {
      // DOCTYPE and friends: skipped, never interpreted (no entity defs)
      const end = xml.indexOf('>', lt + 2);
      if (end < 0) throw new Error('Unclosed declaration');
      i = end + 1;
    } else if (xml[lt + 1] === '/') {
      const end = xml.indexOf('>', lt + 2);
      if (end < 0) throw new Error('Unclosed end tag');
      const name = localName(xml.slice(lt + 2, end).trim());
      const open = stack.pop();
      if (open === undefined || open === root || open.name !== name) {
        throw new Error(`Mismatched end tag </${name}>`);
      }
      i = end + 1;
    } else {
      // start tag: find its '>' outside attribute quotes
      let j = lt + 1;
      let quote: string | null = null;
      for (; j < length; j++) {
        const char = xml[j];
        if (quote !== null) {
          if (char === quote) quote = null;
        } else if (char === '"' || char === "'") {
          quote = char;
        } else if (char === '>') {
          break;
        }
      }
      if (j >= length) throw new Error('Unclosed start tag');
      let body = xml.slice(lt + 1, j);
      const selfClosing = body.endsWith('/');
      if (selfClosing) body = body.slice(0, -1);
      const nameMatch = /^\s*([^\s/>]+)/.exec(body);
      if (nameMatch === null) throw new Error('Malformed start tag');
      const attributes: Record<string, string> = {};
      const attrPattern = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      const rest = body.slice(nameMatch[0].length);
      let attr: RegExpExecArray | null;
      while ((attr = attrPattern.exec(rest)) !== null) {
        attributes[localName(attr[1])] = decodeEntities(attr[3] ?? attr[4] ?? '');
      }
      const element: MsXmlElement = {
        name: localName(nameMatch[1]),
        attributes,
        children: [],
        text: '',
      };
      stack[stack.length - 1].children.push(element);
      if (!selfClosing) stack.push(element);
      i = j + 1;
    }
  }
  if (stack.length !== 1) throw new Error('Unclosed element');
  const documentElement = root.children[0];
  if (documentElement === undefined) throw new Error('No root element');
  return documentElement;
}

function child(element: MsXmlElement, name: string): MsXmlElement | undefined {
  return element.children.find((entry) => entry.name === name);
}

function childrenNamed(element: MsXmlElement, name: string): MsXmlElement[] {
  return element.children.filter((entry) => entry.name === name);
}

function textOf(element: MsXmlElement, name: string): string | undefined {
  const found = child(element, name);
  return found === undefined ? undefined : found.text.trim();
}

function numberOf(element: MsXmlElement, name: string): number | undefined {
  const text = textOf(element, name);
  if (text === undefined || text === '') return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/* ---------------- dates ---------------- */

const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;
const MINUTES_PER_DAY = 480;

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function formatLocal(date: Date): string {
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function parseLocal(text: string | undefined): Date | null {
  if (text === undefined) return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (match === null) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] ?? 0),
    Number(match[5] ?? 0),
    Number(match[6] ?? 0),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

const atMidnight = (date: Date): boolean =>
  date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;

/** A suite start → MS Project start (midnight → 08:00). */
function exportStart(date: Date): Date {
  return atMidnight(date)
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), WORK_START_HOUR)
    : date;
}

/** A suite (exclusive) finish → MS Project finish (midnight → 17:00 the day before). */
function exportFinish(start: Date, end: Date): Date {
  if (end.getTime() === start.getTime()) return exportStart(start);
  return atMidnight(end)
    ? new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1, WORK_END_HOUR)
    : end;
}

function importStart(date: Date): Date {
  return date.getHours() === WORK_START_HOUR &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
    : date;
}

function importFinish(date: Date): Date {
  return date.getHours() === WORK_END_HOUR &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    : date;
}

/** `PT40H0M0S` → hours. */
function parseDuration(text: string | undefined): number | undefined {
  if (text === undefined) return undefined;
  const match =
    /^-?P(?:(\d+(?:\.\d+)?)D)?T?(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(
      text.trim(),
    );
  if (match === null) return undefined;
  return (
    Number(match[1] ?? 0) * 24 +
    Number(match[2] ?? 0) +
    Number(match[3] ?? 0) / 60 +
    Number(match[4] ?? 0) / 3600
  );
}

function formatDuration(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `PT${whole}H${minutes}M0S`;
}

/* ---------------- shared vocabularies ---------------- */

/** MSPDI link types: 0 FF, 1 FS, 2 SF, 3 SS. */
const LINK_TYPES: readonly GanttDependencyType[] = ['FF', 'FS', 'SF', 'SS'];

/** Lag formats: tenths of a minute per unit, and our unit. */
function lagFromMs(linkLag: number, format: number | undefined): {
  lag: number;
  lagUnit: GanttLagUnit;
} {
  switch (format) {
    case 3: // minutes
    case 4:
    case 5: // hours
    case 6:
      return { lag: Math.round((linkLag / 600) * 100) / 100, lagUnit: 'hours' };
    case 19: // percent — not representable
    case 20:
      return { lag: 0, lagUnit: 'days' };
    default: // days, weeks, months (in working days)
      return {
        lag: Math.round((linkLag / (MINUTES_PER_DAY * 10)) * 100) / 100,
        lagUnit: 'days',
      };
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .split('')
    // XML 1.0 forbids C0 controls other than tab / LF / CR, even escaped
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
    })
    .join('');
}

/* ---------------- write ---------------- */

/** One resource as the writer reads it. */
export interface MsProjectResource {
  readonly id: unknown;
  readonly text: string;
  /** Max units in % (100 = one full-time resource). */
  readonly capacity?: number;
}

/** Options of `buildMsProjectXml`. */
export interface MsProjectExportOptions {
  /** `<Title>` / `<Name>` of the project. Default `'Project'`. */
  readonly title?: string;
}

/** What `buildMsProjectXml` writes. */
export interface MsProjectExportInput {
  readonly tasks: readonly GanttTask[];
  readonly dependencies: readonly GanttDependency[];
  readonly resources: readonly MsProjectResource[];
  readonly workCalendar: GanttWorkCalendar | null;
}

function tag(name: string, value: string | number | undefined): string {
  return value === undefined || value === ''
    ? ''
    : `<${name}>${escapeXml(String(value))}</${name}>`;
}

/**
 * Writes MS Project XML: tasks in tree order with outline levels, WBS,
 * manual mode, constraints, deadlines, baselines and predecessor links
 * (lag as `LinkLag`), resources with max units, assignments with units and
 * work, and one base calendar (working weekdays + holiday exceptions).
 */
export function buildMsProjectXml(
  input: MsProjectExportInput,
  options: MsProjectExportOptions = {},
): string {
  const title = options.title ?? 'Project';
  const tasks = input.tasks;
  const uid = new Map<RowKey, number>();
  tasks.forEach((task, index) => uid.set(task.key, index + 1));
  const resourceUid = new Map<unknown, number>();
  input.resources.forEach((resource, index) =>
    resourceUid.set(resource.id, index + 1),
  );
  const calendar = input.workCalendar ?? undefined;
  const workingHours = (task: GanttTask): number => {
    if (task.isMilestone) return 0;
    const days =
      calendar !== undefined
        ? workingDaysBetween(task.start, task.end, calendar)
        : Math.max(
            1,
            Math.round((task.end.getTime() - task.start.getTime()) / 86_400_000),
          );
    return days * (MINUTES_PER_DAY / 60);
  };
  const incoming = new Map<RowKey, GanttDependency[]>();
  for (const dep of input.dependencies) {
    const bucket = incoming.get(dep.successorKey);
    if (bucket) bucket.push(dep);
    else incoming.set(dep.successorKey, [dep]);
  }
  const start =
    tasks.length > 0
      ? new Date(Math.min(...tasks.map((task) => task.start.getTime())))
      : new Date();
  const finish =
    tasks.length > 0
      ? new Date(Math.max(...tasks.map((task) => task.end.getTime())))
      : start;

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Project xmlns="http://schemas.microsoft.com/project">',
    tag('SaveVersion', 14),
    tag('Name', `${title}.xml`),
    tag('Title', title),
    tag('ScheduleFromStart', 1),
    tag('StartDate', formatLocal(exportStart(start))),
    tag('FinishDate', formatLocal(exportFinish(start, finish))),
    tag('MinutesPerDay', MINUTES_PER_DAY),
    tag('MinutesPerWeek', MINUTES_PER_DAY * 5),
    tag('CalendarUID', 1),
  ];

  // calendar: DayType 1 = Sunday … 7 = Saturday, DayType 0 = exception
  const workingDays = calendar?.workingDays ?? [1, 2, 3, 4, 5];
  lines.push(
    '<Calendars><Calendar>',
    tag('UID', 1),
    tag('Name', 'Standard'),
    tag('IsBaseCalendar', 1),
    '<WeekDays>',
  );
  for (let day = 0; day < 7; day++) {
    const working = workingDays.includes(day);
    lines.push(
      '<WeekDay>' +
        tag('DayType', day + 1) +
        tag('DayWorking', working ? 1 : 0) +
        (working
          ? '<WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime>' +
            '<WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes>'
          : '') +
        '</WeekDay>',
    );
  }
  for (const holiday of calendar?.holidays ?? []) {
    const from = new Date(holiday.getFullYear(), holiday.getMonth(), holiday.getDate());
    const to = new Date(
      holiday.getFullYear(),
      holiday.getMonth(),
      holiday.getDate(),
      23,
      59,
    );
    lines.push(
      '<WeekDay>' +
        tag('DayType', 0) +
        tag('DayWorking', 0) +
        `<TimePeriod>${tag('FromDate', formatLocal(from))}${tag('ToDate', formatLocal(to))}</TimePeriod>` +
        '</WeekDay>',
    );
  }
  lines.push('</WeekDays></Calendar></Calendars>', '<Tasks>');

  tasks.forEach((task, index) => {
    const parts = [
      tag('UID', index + 1),
      tag('ID', index + 1),
      tag('Name', task.title),
      tag('Manual', task.manuallyScheduled ? 1 : 0),
      tag('WBS', task.wbs),
      tag('OutlineNumber', task.wbs),
      tag('OutlineLevel', task.level + 1),
      tag('Start', formatLocal(exportStart(task.start))),
      tag('Finish', formatLocal(exportFinish(task.start, task.end))),
      tag('Duration', formatDuration(workingHours(task))),
      tag('DurationFormat', 7),
      task.effort !== undefined ? tag('Work', formatDuration(task.effort)) : '',
      tag('Milestone', task.isMilestone ? 1 : 0),
      tag('Summary', task.isSummary ? 1 : 0),
      tag('PercentComplete', Math.round(task.progress)),
      tag('ConstraintType', GANTT_CONSTRAINT_TYPES.indexOf(task.constraintType)),
      task.constraintDate !== undefined
        ? tag('ConstraintDate', formatLocal(exportStart(task.constraintDate)))
        : '',
      task.deadline !== undefined
        ? tag(
            'Deadline',
            formatLocal(
              atMidnight(task.deadline)
                ? new Date(
                    task.deadline.getFullYear(),
                    task.deadline.getMonth(),
                    task.deadline.getDate() - 1,
                    WORK_END_HOUR,
                  )
                : task.deadline,
            ),
          )
        : '',
    ];
    for (const link of incoming.get(task.key) ?? []) {
      const predecessor = uid.get(link.predecessorKey);
      if (predecessor === undefined) continue;
      const perUnit = link.lagUnit === 'hours' ? 600 : MINUTES_PER_DAY * 10;
      parts.push(
        '<PredecessorLink>' +
          tag('PredecessorUID', predecessor) +
          tag('Type', LINK_TYPES.indexOf(link.type)) +
          tag('CrossProject', 0) +
          tag('LinkLag', Math.round(link.lag * perUnit)) +
          tag('LagFormat', link.lagUnit === 'hours' ? 5 : 7) +
          '</PredecessorLink>',
      );
    }
    task.baselines.forEach((baseline, number) => {
      parts.push(
        '<Baseline>' +
          tag('Number', number) +
          tag('Start', formatLocal(exportStart(baseline.start))) +
          tag('Finish', formatLocal(exportFinish(baseline.start, baseline.end))) +
          '</Baseline>',
      );
    });
    lines.push(`<Task>${parts.join('')}</Task>`);
  });
  lines.push('</Tasks>', '<Resources>');
  input.resources.forEach((resource, index) => {
    lines.push(
      '<Resource>' +
        tag('UID', index + 1) +
        tag('ID', index + 1) +
        tag('Name', resource.text) +
        tag('Type', 1) +
        tag('MaxUnits', ((resource.capacity ?? 100) / 100).toFixed(2)) +
        '</Resource>',
    );
  });
  lines.push('</Resources>', '<Assignments>');
  let assignmentUid = 0;
  for (const task of tasks) {
    if (task.isSummary) continue;
    task.resourceIds.forEach((id, index) => {
      const resource = resourceUid.get(id);
      if (resource === undefined) return;
      const units = task.units[index] ?? 100;
      lines.push(
        '<Assignment>' +
          tag('UID', ++assignmentUid) +
          tag('TaskUID', uid.get(task.key)) +
          tag('ResourceUID', resource) +
          tag('Units', (units / 100).toFixed(2)) +
          tag('Work', formatDuration(workingHours(task) * (units / 100))) +
          '</Assignment>',
      );
    });
  }
  lines.push('</Assignments>', '</Project>');
  return lines.filter((line) => line !== '').join('\n');
}

/* ---------------- read ---------------- */

/** One imported task, in the Gantt's default field shape. */
export interface MsProjectTaskItem {
  id: number;
  parentId: number | null;
  title: string;
  start: Date;
  end: Date;
  progress: number;
  manuallyScheduled?: boolean;
  constraintType?: GanttConstraintType;
  constraintDate?: Date;
  deadline?: Date;
  baselines?: { start: Date; end: Date }[];
  /** Assigned resource ids (`resourceIdExpr` default `resourceId`). */
  resourceId?: number[];
  /** Assignment units in %, aligned with `resourceId`. */
  units?: number[];
  /** Work in hours. */
  effort?: number;
}

/** One imported link, in the Gantt's default dependency field shape. */
export interface MsProjectDependencyItem {
  id: string;
  predecessorId: number;
  successorId: number;
  type: GanttDependencyType;
  lag: number;
  lagUnit: GanttLagUnit;
}

/** One imported resource (`OgeGanttResource` shape plus capacity). */
export interface MsProjectResourceItem {
  id: number;
  text: string;
  capacity: number;
}

/** Everything `parseMsProjectXml` returns — bind it straight to a Gantt. */
export interface MsProjectImportResult {
  readonly title: string;
  readonly tasks: MsProjectTaskItem[];
  readonly dependencies: MsProjectDependencyItem[];
  readonly resources: MsProjectResourceItem[];
  /** The project calendar, or `null` when the file has none. */
  readonly workCalendar: GanttWorkCalendar | null;
}

function readCalendar(project: MsXmlElement): GanttWorkCalendar | null {
  const calendars = child(project, 'Calendars');
  if (calendars === undefined) return null;
  const all = childrenNamed(calendars, 'Calendar');
  const wanted = numberOf(project, 'CalendarUID');
  const calendar =
    all.find((entry) => numberOf(entry, 'UID') === wanted) ?? all[0];
  if (calendar === undefined) return null;
  const workingDays: number[] = [];
  const holidays: Date[] = [];
  const addRange = (from: Date | null, to: Date | null): void => {
    if (from === null) return;
    const last = to ?? from;
    let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let i = 0; i < 366 && cursor.getTime() <= last.getTime(); i++) {
      holidays.push(cursor);
      cursor = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() + 1,
      );
    }
  };
  const weekDays = child(calendar, 'WeekDays');
  for (const day of weekDays ? childrenNamed(weekDays, 'WeekDay') : []) {
    const type = numberOf(day, 'DayType');
    const working = numberOf(day, 'DayWorking') === 1;
    if (type !== undefined && type >= 1 && type <= 7) {
      if (working) workingDays.push(type - 1);
    } else if (type === 0 && !working) {
      const period = child(day, 'TimePeriod');
      if (period !== undefined) {
        addRange(
          parseLocal(textOf(period, 'FromDate')),
          parseLocal(textOf(period, 'ToDate')),
        );
      }
    }
  }
  const exceptions = child(calendar, 'Exceptions');
  for (const exception of exceptions
    ? childrenNamed(exceptions, 'Exception')
    : []) {
    if (numberOf(exception, 'DayWorking') === 1) continue;
    const period = child(exception, 'TimePeriod');
    if (period === undefined) continue;
    addRange(
      parseLocal(textOf(period, 'FromDate')),
      parseLocal(textOf(period, 'ToDate')),
    );
  }
  return {
    workingDays: workingDays.length > 0 ? workingDays.sort() : [1, 2, 3, 4, 5],
    holidays,
  };
}

/**
 * Reads MS Project XML into plain Gantt data (default field names). Throws
 * `Error` when the text is not an MS Project document. The file is
 * untrusted input: only the listed fields are read, every value is
 * type-checked, and names arrive as text (never markup).
 */
export function parseMsProjectXml(xml: string): MsProjectImportResult {
  const project = parseMsXml(xml);
  if (project.name !== 'Project') {
    throw new Error('Not an MS Project XML document');
  }
  const title = textOf(project, 'Title') ?? textOf(project, 'Name') ?? '';
  const tasks: MsProjectTaskItem[] = [];
  const dependencies: MsProjectDependencyItem[] = [];
  const parents: number[] = [];
  const known = new Set<number>();
  const taskList = child(project, 'Tasks');
  const pendingLinks: { successor: number; link: MsXmlElement }[] = [];
  for (const node of taskList ? childrenNamed(taskList, 'Task') : []) {
    const id = numberOf(node, 'UID');
    const level = numberOf(node, 'OutlineLevel') ?? 1;
    if (id === undefined || level < 1) continue; // UID 0: project summary
    if (numberOf(node, 'IsNull') === 1) continue;
    const start = parseLocal(textOf(node, 'Start'));
    const finish = parseLocal(textOf(node, 'Finish'));
    if (start === null) continue;
    const milestone = numberOf(node, 'Milestone') === 1;
    const itemStart = importStart(start);
    const itemEnd = milestone
      ? itemStart
      : finish !== null
        ? importFinish(finish)
        : itemStart;
    parents.length = level - 1;
    const parentId = level > 1 ? (parents[level - 2] ?? null) : null;
    parents[level - 1] = id;
    const item: MsProjectTaskItem = {
      id,
      parentId,
      title: textOf(node, 'Name') ?? '',
      start: itemStart,
      end: itemEnd.getTime() < itemStart.getTime() ? itemStart : itemEnd,
      progress: Math.min(100, Math.max(0, numberOf(node, 'PercentComplete') ?? 0)),
    };
    if (numberOf(node, 'Manual') === 1) item.manuallyScheduled = true;
    const constraint = numberOf(node, 'ConstraintType');
    if (constraint !== undefined && constraint > 0) {
      const type = GANTT_CONSTRAINT_TYPES[constraint];
      if (type !== undefined) {
        item.constraintType = type;
        const date = parseLocal(textOf(node, 'ConstraintDate'));
        if (date !== null) {
          item.constraintDate =
            type === 'MFO' || type === 'FNET' || type === 'FNLT'
              ? importFinish(date)
              : importStart(date);
        }
      }
    }
    const deadline = parseLocal(textOf(node, 'Deadline'));
    if (deadline !== null) item.deadline = importFinish(deadline);
    const work = parseDuration(textOf(node, 'Work'));
    if (work !== undefined && work > 0) item.effort = work;
    const baselines = childrenNamed(node, 'Baseline')
      .map((baseline) => ({
        number: numberOf(baseline, 'Number') ?? 0,
        start: parseLocal(textOf(baseline, 'Start')),
        finish: parseLocal(textOf(baseline, 'Finish')),
      }))
      .filter(
        (entry): entry is { number: number; start: Date; finish: Date } =>
          entry.start !== null && entry.finish !== null,
      )
      .sort((a, b) => a.number - b.number);
    if (baselines.length > 0) {
      item.baselines = baselines.map((entry) => {
        const baselineStart = importStart(entry.start);
        const baselineEnd = importFinish(entry.finish);
        return {
          start: baselineStart,
          end:
            entry.start.getTime() === entry.finish.getTime()
              ? baselineStart
              : baselineEnd,
        };
      });
    }
    for (const link of childrenNamed(node, 'PredecessorLink')) {
      pendingLinks.push({ successor: id, link });
    }
    known.add(id);
    tasks.push(item);
  }
  for (const { successor, link } of pendingLinks) {
    const predecessor = numberOf(link, 'PredecessorUID');
    if (predecessor === undefined || !known.has(predecessor)) continue;
    if (predecessor === successor) continue;
    const type = LINK_TYPES[numberOf(link, 'Type') ?? 1] ?? 'FS';
    const lag = lagFromMs(
      numberOf(link, 'LinkLag') ?? 0,
      numberOf(link, 'LagFormat'),
    );
    dependencies.push({
      id: `${predecessor}-${successor}`,
      predecessorId: predecessor,
      successorId: successor,
      type,
      ...lag,
    });
  }

  const resources: MsProjectResourceItem[] = [];
  const resourceList = child(project, 'Resources');
  for (const node of resourceList ? childrenNamed(resourceList, 'Resource') : []) {
    const id = numberOf(node, 'UID');
    if (id === undefined || id <= 0) continue;
    if (numberOf(node, 'IsNull') === 1) continue;
    resources.push({
      id,
      text: textOf(node, 'Name') ?? '',
      capacity: Math.round((numberOf(node, 'MaxUnits') ?? 1) * 100),
    });
  }
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const assignmentList = child(project, 'Assignments');
  for (const node of assignmentList
    ? childrenNamed(assignmentList, 'Assignment')
    : []) {
    const task = byId.get(numberOf(node, 'TaskUID') ?? -1);
    const resource = numberOf(node, 'ResourceUID');
    if (task === undefined || resource === undefined) continue;
    if (!resourceIds.has(resource)) continue;
    task.resourceId = [...(task.resourceId ?? []), resource];
    task.units = [
      ...(task.units ?? []),
      Math.round((numberOf(node, 'Units') ?? 1) * 100),
    ];
  }
  return {
    title,
    tasks,
    dependencies,
    resources,
    workCalendar: readCalendar(project),
  };
}

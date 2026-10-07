import type { GanttDependency, GanttTask } from './gantt-model';
import {
  applyGanttLag,
  detectGanttConflicts,
  scheduleGanttProject,
} from './schedule';
import {
  addWorkingDays,
  nextWorkingDay,
  type GanttWorkCalendar,
} from './work-calendar';

/**
 * Property-based checks of the CPM forward pass: for random acyclic plans
 * (FS / SS / FF / SF links, lags and leads in days or hours, with and
 * without a work calendar) the scheduled dates honour every link — no task
 * starts (or, for FF / SF, finishes) before its predecessor plus the lag
 * allows — no task changes length, a linked ASAP task sits exactly on its
 * binding link (as early as allowed, not merely late enough), and
 * scheduling is idempotent.
 *
 * Generated with a small seeded PRNG (deterministic: a failure prints the
 * seed and the plan; `OGE_PROPERTY_SEED=<n>` replays a run).
 */
type Rand = () => number;

function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rand: Rand, min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(rand: Rand, items: readonly T[]): T =>
  items[int(rand, 0, items.length - 1)];

const BASE_SEED = Number(process.env['OGE_PROPERTY_SEED'] ?? 20_260_316);

function forAll<T>(
  generate: (rand: Rand) => T,
  check: (value: T) => void,
  runs = 150,
): void {
  for (let run = 0; run < runs; run++) {
    const seed = BASE_SEED + run;
    const value = generate(rng(seed));
    try {
      check(value);
    } catch (error) {
      throw new Error(
        `property failed for seed ${seed} (OGE_PROPERTY_SEED=${seed}):\n` +
          `${JSON.stringify(value).slice(0, 3_000)}\n${String(error)}`,
      );
    }
  }
}

const HOUR = 3_600_000;
const day = (n: number, hour = 0) => new Date(2026, 1, 2 + n, hour);

function task(key: string, start: Date, end: Date): GanttTask {
  return {
    key,
    source: { key },
    parentKey: null,
    level: 0,
    title: key,
    start,
    end,
    progress: 0,
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
  };
}

interface Plan {
  tasks: GanttTask[];
  links: GanttDependency[];
}

/** A random DAG: links only run from a lower to a higher task index. */
function generatePlan(
  rand: Rand,
  hours: boolean,
  calendar?: GanttWorkCalendar,
): Plan {
  const count = int(rand, 2, 14);
  const tasks = Array.from({ length: count }, (_, i) => {
    const length = rand() < 0.1 ? 0 : int(rand, 1, 6);
    if (calendar !== undefined) {
      // a plan entered on a calendar starts on working days and counts its
      // length in them (a task lying wholly on a weekend has no working
      // length to keep — out of scope here)
      const start = nextWorkingDay(day(int(rand, 0, 20)), calendar);
      return task(`t${i}`, start, addWorkingDays(start, length, calendar));
    }
    const start = day(int(rand, 0, 20), hours ? int(rand, 0, 23) : 0);
    return task(`t${i}`, start, new Date(start.getTime() + length * 24 * HOUR));
  });
  const links: GanttDependency[] = [];
  for (let to = 1; to < count; to++) {
    for (let from = 0; from < to; from++) {
      if (rand() > 0.25) continue;
      const lagUnit = hours && rand() < 0.5 ? 'hours' : 'days';
      links.push({
        key: `t${from}-t${to}`,
        source: {},
        predecessorKey: `t${from}`,
        successorKey: `t${to}`,
        type: pick(rand, ['FS', 'FS', 'SS', 'FF', 'SF'] as const),
        lag: lagUnit === 'hours' ? int(rand, -12, 30) : int(rand, -2, 4),
        lagUnit,
      });
    }
  }
  return { tasks, links };
}

function apply(plan: Plan, calendar?: GanttWorkCalendar): GanttTask[] {
  const { changes } = scheduleGanttProject(plan.tasks, plan.links, {
    calendar,
  });
  const moved = new Map(changes.map((change) => [change.key, change]));
  return plan.tasks.map((t) => {
    const change = moved.get(t.key);
    return change ? { ...t, start: change.start, end: change.end } : t;
  });
}

/** The earliest start a link allows its successor (no calendar). */
function bound(link: GanttDependency, pred: GanttTask, succ: GanttTask) {
  const span = succ.end.getTime() - succ.start.getTime();
  const lagged = (date: Date) =>
    applyGanttLag(date, link.lag, link.lagUnit).getTime();
  switch (link.type) {
    case 'FS':
      return lagged(pred.end);
    case 'SS':
      return lagged(pred.start);
    case 'FF':
      return lagged(pred.end) - span;
    case 'SF':
      return lagged(pred.start) - span;
  }
}

describe('gantt CPM properties', () => {
  it('no task starts before its predecessors finish plus the lag', () => {
    forAll(
      (rand) => generatePlan(rand, rand() < 0.5),
      (plan) => {
        const scheduled = apply(plan);
        const byKey = new Map(scheduled.map((t) => [t.key, t]));
        for (const link of plan.links) {
          const pred = byKey.get(link.predecessorKey) as GanttTask;
          const succ = byKey.get(link.successorKey) as GanttTask;
          expect(succ.start.getTime()).toBeGreaterThanOrEqual(
            bound(link, pred, succ),
          );
        }
      },
    );
  });

  it('a linked task sits on its binding link; an unlinked one stays put', () => {
    forAll(
      (rand) => generatePlan(rand, rand() < 0.5),
      (plan) => {
        const scheduled = apply(plan);
        const byKey = new Map(scheduled.map((t) => [t.key, t]));
        for (const t of scheduled) {
          const incoming = plan.links.filter((l) => l.successorKey === t.key);
          if (incoming.length === 0) {
            const original = plan.tasks.find((o) => o.key === t.key);
            expect(t.start.getTime()).toBe(original?.start.getTime());
            continue;
          }
          const earliest = Math.max(
            ...incoming.map((l) =>
              bound(l, byKey.get(l.predecessorKey) as GanttTask, t),
            ),
          );
          expect(t.start.getTime()).toBe(earliest);
        }
      },
    );
  });

  it('scheduling keeps every length and is idempotent', () => {
    forAll(
      (rand) => generatePlan(rand, rand() < 0.5),
      (plan) => {
        const scheduled = apply(plan);
        scheduled.forEach((t, i) => {
          const original = plan.tasks[i];
          expect(t.end.getTime() - t.start.getTime()).toBe(
            original.end.getTime() - original.start.getTime(),
          );
        });
        const again = scheduleGanttProject(scheduled, plan.links);
        expect(again.changes).toEqual([]);
        expect(again.conflicts).toEqual([]);
      },
    );
  });

  it('FF on a calendar: a successor moved off a weekend still finishes on time', () => {
    // found by the property below: the start bound used to subtract the
    // successor's wall-clock length (4 days, Fri → Tue over a weekend), then
    // placed its 2 working days from Monday — finishing a day early
    const calendar: GanttWorkCalendar = { workingDays: [1, 2, 3, 4, 5] };
    const a = task('a', new Date(2026, 2, 2), new Date(2026, 2, 5)); // Mon–Wed
    const b = task('b', new Date(2026, 1, 27), new Date(2026, 2, 3)); // Fri, Mon
    const ff: GanttDependency = {
      key: 'a-b',
      source: {},
      predecessorKey: 'a',
      successorKey: 'b',
      type: 'FF',
      lag: 0,
      lagUnit: 'days',
    };
    const [moved] = apply({ tasks: [a, b], links: [ff] }, calendar).slice(1);
    expect(moved.start).toEqual(new Date(2026, 2, 3)); // Tue
    expect(moved.end).toEqual(new Date(2026, 2, 5)); // = a's finish
    expect(detectGanttConflicts([a, moved], [ff], calendar)).toEqual([]);
  });

  it('on a work calendar the result has no conflicts and is a fixpoint', () => {
    const calendar: GanttWorkCalendar = {
      workingDays: [1, 2, 3, 4, 5],
      holidays: [day(9), day(16)],
    };
    forAll(
      (rand) => generatePlan(rand, false, calendar),
      (plan) => {
        const scheduled = apply(plan, calendar);
        const byKey = new Map(scheduled.map((t) => [t.key, t]));
        const broken = detectGanttConflicts(scheduled, plan.links, calendar)
          .filter((conflict) => conflict.kind === 'dependency')
          .map((conflict) => {
            const link = plan.links.find(
              (l) => l.key === conflict.dependencyKey,
            );
            const pred = byKey.get(link?.predecessorKey ?? '');
            const succ = byKey.get(conflict.key);
            return `${link?.type} ${link?.lag}${link?.lagUnit} ${pred?.key} ${pred?.start.toISOString()}–${pred?.end.toISOString()} → ${succ?.key} ${succ?.start.toISOString()}–${succ?.end.toISOString()} needs ${conflict.date?.toISOString()}`;
          });
        if (broken.length > 0) throw new Error(broken.join('\n'));
        const moved = scheduleGanttProject(scheduled, plan.links, {
          calendar,
        }).changes.map((change) => {
          const was = byKey.get(change.key);
          const links = plan.links
            .filter((l) => l.successorKey === change.key)
            .map((l) => {
              const p = byKey.get(l.predecessorKey);
              return `${l.type}${l.lag} from ${p?.key} ${p?.start.toISOString()}–${p?.end.toISOString()}`;
            });
          const orig = plan.tasks.find((t) => t.key === change.key);
          return `${change.key} (orig ${orig?.start.toISOString()}–${orig?.end.toISOString()}) ${was?.start.toISOString()}–${was?.end.toISOString()} → ${change.start.toISOString()}–${change.end.toISOString()} [${links.join('; ')}]`;
        });
        if (moved.length > 0) throw new Error(moved.join('\n'));
      },
    );
  });
});

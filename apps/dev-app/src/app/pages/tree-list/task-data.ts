import {
  CustomDataSource,
  createFilterPredicate,
  foldText,
  type DataSource,
} from '@oge-ui/core';

/** Shared demo data for the tree-list summaries page: a project plan. */
export interface PlanTask {
  id: number;
  parentId: number | null;
  task: string;
  owner: string;
  hours: number;
  cost: number;
}

const OWNERS = ['Ada', 'Grace', 'Alan', 'Barbara', 'Edsger'];
const PHASES = ['Discovery', 'Design', 'Build', 'Launch'];
const STEPS = ['Plan', 'Review', 'Prototype', 'Implement', 'Test', 'Document'];

/** Deterministic plan: phases → work packages → tasks, hours on every row. */
export function makePlan(): PlanTask[] {
  const rows: PlanTask[] = [];
  let id = 1;
  PHASES.forEach((phase, p) => {
    const phaseId = id++;
    rows.push({
      id: phaseId,
      parentId: null,
      task: phase,
      owner: OWNERS[p % OWNERS.length],
      hours: 4,
      cost: 400,
    });
    for (let w = 0; w < 3; w++) {
      const packageId = id++;
      rows.push({
        id: packageId,
        parentId: phaseId,
        task: `${phase} package ${String(w + 1)}`,
        owner: OWNERS[(p + w) % OWNERS.length],
        hours: 2,
        cost: 200,
      });
      for (let t = 0; t < 3; t++) {
        const hours = 3 + ((p * 7 + w * 5 + t * 3) % 11);
        rows.push({
          id: id++,
          parentId: packageId,
          task: `${STEPS[(w + t) % STEPS.length]} ${phase.toLowerCase()} ${String(t + 1)}`,
          owner: OWNERS[(p + w + t) % OWNERS.length],
          hours,
          cost: hours * 95,
        });
      }
    }
  });
  return rows;
}

/**
 * A fake server honouring `remoteOperations.filtering`'s contract: it
 * filters and searches itself and answers with every match **plus all of
 * its ancestors**, flat, so each match keeps a path to a root.
 */
export function makePlanServer(
  log: (message: string) => void,
): DataSource<PlanTask> {
  const all = makePlan();
  const byId = new Map(all.map((row) => [row.id, row]));
  return new CustomDataSource<PlanTask>({
    key: 'id',
    load: async (options) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const predicate = options.filter
        ? createFilterPredicate<PlanTask>(options.filter)
        : null;
      const needle = foldText(options.searchText ?? '');
      const matches = all.filter(
        (row) =>
          (!predicate || predicate(row)) &&
          (!needle || foldText(`${row.task} ${row.owner}`).includes(needle)),
      );
      if (!predicate && !needle) {
        log(`load → ${String(all.length)} rows`);
        return { data: all, totalCount: all.length };
      }
      const keep = new Set<number>();
      for (const match of matches) {
        let current: PlanTask | undefined = match;
        while (current && !keep.has(current.id)) {
          keep.add(current.id);
          current =
            current.parentId === null ? undefined : byId.get(current.parentId);
        }
      }
      const data = all.filter((row) => keep.has(row.id));
      log(
        `filtered load → ${String(matches.length)} matches + ${String(data.length - matches.length)} ancestors`,
      );
      return { data, totalCount: data.length };
    },
    distinct: async (field) => {
      log(`distinct(${field})`);
      const values = new Set(
        all.map((row) => row[field as keyof PlanTask] as unknown),
      );
      return [...values];
    },
  });
}

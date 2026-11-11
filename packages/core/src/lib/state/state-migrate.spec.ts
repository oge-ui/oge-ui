import { sanitizeGridStateSnapshot } from './state-sanitize';
import { ogeMigrateState, ogeStateVersion } from './state-migrate';

describe('ogeMigrateState', () => {
  const v0 = {
    filter: {
      row: [
        ['state', { type: 'binary', field: 'state', op: 'eq', value: 'open' }],
      ],
    },
    columns: { widths: [['state', 140]] },
    paging: { pageSize: 50 },
  };
  // v0 → v1: the "state" column became "status"
  const renameState = (s: Record<string, unknown>) =>
    JSON.parse(JSON.stringify(s).replaceAll('"state"', '"status"'));
  // v1 → v2: equality filters became list filters
  const eqToIn = (s: Record<string, unknown>) =>
    JSON.parse(
      JSON.stringify(s).replace(
        /"op":"eq","value":("[^"]*")/g,
        '"op":"in","value":[$1]',
      ),
    );

  it('runs the missing steps and stamps the version', () => {
    const out = ogeMigrateState(v0, [renameState, eqToIn]);
    expect(ogeStateVersion(out)).toBe(2);
    const snapshot = sanitizeGridStateSnapshot(out) ?? {};
    expect(snapshot.version).toBe(2);
    expect(snapshot.filter?.row).toEqual([
      [
        'status',
        { type: 'binary', field: 'status', op: 'in', value: ['open'] },
      ],
    ]);
    expect(snapshot.columns?.widths).toEqual([['status', 140]]);
  });

  it('starts from the stored version and leaves newer states alone', () => {
    const v1 = { ...renameState(v0), version: 1 };
    const out = ogeMigrateState(v1, [
      () => {
        throw new Error('must not run');
      },
      eqToIn,
    ]) as { version: number };
    expect(out.version).toBe(2);
    const newer = { ...v0, version: 5 };
    expect(ogeMigrateState(newer, [renameState])).toBe(newer);
    expect(ogeMigrateState(v0, [])).toBe(v0);
    expect(ogeMigrateState(v0, undefined)).toBe(v0);
  });

  it('keeps the column layout when a step fails', () => {
    const out = ogeMigrateState(v0, [
      () => {
        throw new Error('bad step');
      },
    ]);
    expect(out).toEqual({
      version: 1,
      columns: { widths: [['state', 140]] },
      paging: { pageSize: 50 },
    });
    expect(ogeMigrateState(v0, [() => null as never])).toEqual(out);
  });

  it('reads a missing or invalid version as 0', () => {
    expect(ogeStateVersion({})).toBe(0);
    expect(ogeStateVersion({ version: -1 })).toBe(0);
    expect(ogeStateVersion({ version: 1.5 })).toBe(0);
    expect(ogeStateVersion('x')).toBe(0);
    expect(sanitizeGridStateSnapshot({ version: 'x' })).toEqual({});
  });
});

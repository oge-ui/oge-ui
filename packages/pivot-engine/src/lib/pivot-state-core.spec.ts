import { pathKey } from '@oge-ui/core';
import { OgePivotStateCore } from './pivot-state-core';
import { PLAIN_ADAPTER } from './test-adapter';

describe('OgePivotStateCore', () => {
  it('toggles expansion per axis, keeping real paths', () => {
    const store = new OgePivotStateCore(PLAIN_ADAPTER);
    store.toggleRowPath(['EU', 2024]);
    store.toggleColumnPath([null]);
    expect([...store.rowExpandedPaths()]).toEqual([pathKey(['EU', 2024])]);
    expect(store.rowExpandedPathList()).toEqual([['EU', 2024]]);
    expect(store.columnExpandedPathList()).toEqual([[null]]);
    store.toggleRowPath(['EU', 2024]);
    expect(store.rowExpandedPathList()).toEqual([]);
  });

  it('distinguishes value types in path keys', () => {
    const store = new OgePivotStateCore(PLAIN_ADAPTER);
    store.setExpansion([[1], ['1']], []);
    expect(store.rowExpandedPaths().size).toBe(2);
  });

  it('patches, moves and replaces field overrides', () => {
    const store = new OgePivotStateCore(PLAIN_ADAPTER);
    store.patchField('city', { sortOrder: 'desc' });
    store.moveField('city', 'column', 2);
    expect(store.fieldOverrides().get('city')).toEqual({
      sortOrder: 'desc',
      area: 'column',
      areaIndex: 2,
    });
    store.applyOverrides(new Map());
    expect(store.fieldOverrides().size).toBe(0);
  });

  it('toggles the field panel', () => {
    const store = new OgePivotStateCore(PLAIN_ADAPTER);
    expect(store.fieldPanelCollapsed()).toBe(false);
    store.toggleFieldPanel();
    expect(store.fieldPanelCollapsed()).toBe(true);
  });
});

import { render, settle } from './tree-view-test-host';

describe('OgeTreeView expansion', () => {
  it('expands and collapses on row click', async () => {
    const { fixture, rowFor, labels } = await render();
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);

    rowFor('Documents')?.click();
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('expands on double click when expandEvent is dblclick', async () => {
    const { fixture, host, rowFor, labels } = await render((h) =>
      h.expandEvent.set('dblclick'),
    );
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Photos']);

    rowFor('Documents')?.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true }),
    );
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
    void host;
  });

  it('expands from the chevron even when expandEvent is dblclick', async () => {
    const { fixture, rowFor, labels } = await render((h) =>
      h.expandEvent.set('dblclick'),
    );
    rowFor('Documents')
      ?.querySelector<HTMLElement>('.oge-tree-view-toggle')
      ?.click();
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
  });

  it('syncs expandedKeys both ways', async () => {
    const { fixture, host, rowFor, labels } = await render();
    host.expandedKeys.set([1, 2]);
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf', 'Photos']);

    rowFor('Documents')?.click();
    await settle(fixture);
    expect([...host.expandedKeys()].sort()).toEqual([2]);
  });

  it('honors the cancelable itemExpanding pre-event', async () => {
    const { fixture, host, rowFor, labels } = await render();
    host.tree().itemExpanding.subscribe((e) => (e.cancel = true));
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('expandAll and collapseAll cover every expandable node', async () => {
    const { fixture, host, labels } = await render();
    host.tree().expandAll();
    await settle(fixture);
    expect(labels()).toEqual([
      'Documents',
      'Reports',
      'Q1.pdf',
      'Photos',
      'Holiday',
    ]);

    host.tree().collapseAll();
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('expand() pulls the ancestors open with expandNodesRecursive', async () => {
    const { fixture, host, labels } = await render();
    await host.tree().expand(3);
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf', 'Photos']);
  });

  it('expand() resolves false for an unknown key and true when already open', async () => {
    const { fixture, host } = await render();
    await expect(host.tree().expand(999)).resolves.toBe(false);
    await expect(host.tree().expand(1)).resolves.toBe(true);
    await settle(fixture);
    await expect(host.tree().expand(1)).resolves.toBe(true);
  });

  it('ignores interaction while disabled', async () => {
    const { fixture, rowFor, labels } = await render((h) =>
      h.disabled.set(true),
    );
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Photos']);
  });
});

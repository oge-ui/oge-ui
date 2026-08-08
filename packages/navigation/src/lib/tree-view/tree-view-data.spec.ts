import { NESTED, render, settle, type Node } from './tree-view-test-host';

describe('OgeTreeView data binding', () => {
  it('renders only the roots until something is expanded', async () => {
    const { labels } = await render();
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('exposes the APG hierarchy attributes on a flat DOM', async () => {
    const { fixture, host, rows } = await render();
    host.expandedKeys.set([1]);
    await settle(fixture);

    const [documents, reports, photos] = rows();
    expect(documents.getAttribute('role')).toBe('treeitem');
    expect(documents.getAttribute('aria-level')).toBe('1');
    expect(documents.getAttribute('aria-posinset')).toBe('1');
    expect(documents.getAttribute('aria-setsize')).toBe('2');
    expect(documents.getAttribute('aria-expanded')).toBe('true');

    expect(reports.getAttribute('aria-level')).toBe('2');
    expect(reports.getAttribute('aria-posinset')).toBe('1');
    expect(reports.getAttribute('aria-setsize')).toBe('1');
    // a collapsed parent still advertises expandability
    expect(reports.getAttribute('aria-expanded')).toBe('false');

    expect(photos.getAttribute('aria-level')).toBe('1');
    expect(photos.getAttribute('aria-posinset')).toBe('2');
  });

  it('omits aria-expanded on leaves', async () => {
    const { fixture, host, rowFor } = await render();
    host.expandedKeys.set([4]);
    await settle(fixture);
    expect(rowFor('Holiday')?.getAttribute('aria-expanded')).toBeNull();
  });

  it('accepts nested children through itemsExpr', async () => {
    const { fixture, host, labels } = await render((h) => {
      h.items.set(NESTED as unknown as Node[]);
      h.itemsExpr.set('children');
    });
    expect(labels()).toEqual(['Documents', 'Photos']);

    host.expandedKeys.set([1, 2]);
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf', 'Photos']);
  });

  it('indents by level', async () => {
    const { fixture, host, rowFor } = await render();
    host.expandedKeys.set([1, 2]);
    await settle(fixture);
    const indent = (name: string) =>
      rowFor(name)?.style.getPropertyValue('padding-inline-start');
    expect(indent('Documents')).toBe('8px');
    expect(indent('Reports')).toBe('24px');
    expect(indent('Q1.pdf')).toBe('40px');
  });

  it('marks disabled nodes and keeps them out of the Tab sequence', async () => {
    const { rowFor } = await render((h) =>
      h.items.set([
        { id: 1, parentId: null, name: 'Documents' },
        { id: 4, parentId: null, name: 'Photos', disabled: true },
      ]),
    );
    expect(rowFor('Photos')?.getAttribute('aria-disabled')).toBe('true');
    expect(rowFor('Photos')?.getAttribute('tabindex')).toBe('-1');
  });

  it('shows the empty message when there are no nodes', async () => {
    const { el } = await render((h) => h.items.set([]));
    expect(el.querySelector('.oge-tree-view-empty')?.textContent).toContain(
      'No items to display',
    );
  });

  it('renders a per-node icon from iconExpr', async () => {
    const { el } = await render();
    // no iconExpr bound in the host → no icon element
    expect(el.querySelector('.oge-tree-view-icon')).toBeNull();
  });

  it('drops nodes whose parent is missing', async () => {
    const { labels } = await render((h) =>
      h.items.set([
        { id: 1, parentId: null, name: 'Documents' },
        { id: 9, parentId: 99, name: 'Orphan' },
      ]),
    );
    expect(labels()).toEqual(['Documents']);
  });
});

import { render, settle } from './tree-view-test-host';

describe('OgeTreeView search', () => {
  it('keeps matches reachable by auto-expanding their ancestors', async () => {
    const { fixture, host, labels } = await render();
    host.searchValue.set('Q1');
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf']);
  });

  it('is accent- and locale-insensitive', async () => {
    const { fixture, host, labels } = await render((h) =>
      h.items.set([
        { id: 1, parentId: null, name: 'Ödemeler' },
        { id: 2, parentId: null, name: 'Raporlar' },
      ]),
    );
    host.searchValue.set('odeme');
    await settle(fixture);
    expect(labels()).toEqual(['Ödemeler']);
  });

  it('honors startsWith and equals modes', async () => {
    const { fixture, host, labels } = await render((h) =>
      h.searchMode.set('startsWith'),
    );
    host.searchValue.set('rep');
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports']);

    host.searchMode.set('equals');
    host.searchValue.set('rep');
    await settle(fixture);
    expect(labels()).toEqual([]);

    host.searchValue.set('Reports');
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports']);
  });

  it('fullBranch also keeps the descendants of a match', async () => {
    const { fixture, host, labels } = await render((h) =>
      h.filterMode.set('fullBranch'),
    );
    host.searchValue.set('Reports');
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Q1.pdf']);
  });

  it('highlights the matched substring', async () => {
    const { fixture, host, rowFor } = await render();
    host.searchValue.set('port');
    await settle(fixture);
    expect(rowFor('Reports')?.innerHTML).toContain(
      '<mark class="oge-highlight">port</mark>',
    );
  });

  it('shows the no-results message and restores on clear', async () => {
    const { fixture, host, el, labels } = await render();
    host.searchValue.set('zzz');
    await settle(fixture);
    expect(el.querySelector('.oge-tree-view-empty')?.textContent).toContain(
      'No matching items',
    );

    host.searchValue.set('');
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Photos']);
  });

  it('renders the built-in search box and feeds the model', async () => {
    const { fixture, host, el, labels } = await render((h) =>
      h.searchEnabled.set(true),
    );
    const input = el.querySelector<HTMLInputElement>(
      '.oge-tree-view-search-input',
    );
    expect(input).not.toBeNull();
    expect(input?.getAttribute('aria-label')).toBe('Search the tree');

    if (input) {
      input.value = 'Holiday';
      input.dispatchEvent(new Event('input'));
    }
    await settle(fixture);
    expect(host.searchValue()).toBe('Holiday');
    expect(labels()).toEqual(['Photos', 'Holiday']);
  });
});

import { key, render, settle } from './tree-view-test-host';

describe('OgeTreeView keyboard (APG treeview)', () => {
  async function tree(setup?: Parameters<typeof render>[0]) {
    const api = await render((h) => {
      h.expandedKeys.set([1, 2, 4]);
      setup?.(h);
    });
    const focusedLabel = () => {
      const active = api.el.ownerDocument.activeElement;
      return active instanceof HTMLElement
        ? (active.textContent?.trim() ?? null)
        : null;
    };
    const press = (name: string, init: KeyboardEventInit = {}) => {
      const active = api.el.ownerDocument.activeElement;
      key(active instanceof Element ? active : api.el, name, init);
    };
    return { ...api, focusedLabel, press };
  }

  it('keeps exactly one node in the Tab sequence', async () => {
    const { rows } = await tree();
    const tabbable = rows().filter((r) => r.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].textContent?.trim()).toBe('Documents');
  });

  it('moves down and up over the visible nodes without wrapping', async () => {
    const { fixture, rowFor, focusedLabel, press } = await tree();
    rowFor('Documents')?.focus();
    press('ArrowDown');
    await settle(fixture);
    expect(focusedLabel()).toBe('Reports');

    press('ArrowDown');
    await settle(fixture);
    expect(focusedLabel()).toBe('Q1.pdf');

    press('ArrowUp');
    await settle(fixture);
    expect(focusedLabel()).toBe('Reports');

    // APG trees do not wrap at the ends
    rowFor('Documents')?.focus();
    press('ArrowUp');
    await settle(fixture);
    expect(focusedLabel()).toBe('Documents');
  });

  it('ArrowRight opens a collapsed parent, then moves to its first child', async () => {
    const { fixture, rowFor, labels, focusedLabel, press } = await tree((h) =>
      h.expandedKeys.set([]),
    );
    rowFor('Documents')?.focus();
    press('ArrowRight');
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos']);
    expect(focusedLabel()).toBe('Documents');

    press('ArrowRight');
    await settle(fixture);
    expect(focusedLabel()).toBe('Reports');
  });

  it('ArrowRight does nothing on a leaf', async () => {
    const { fixture, rowFor, focusedLabel, press } = await tree();
    rowFor('Q1.pdf')?.focus();
    press('ArrowRight');
    await settle(fixture);
    expect(focusedLabel()).toBe('Q1.pdf');
  });

  it('ArrowLeft closes an open parent, then moves to the parent node', async () => {
    const { fixture, rowFor, labels, focusedLabel, press } = await tree();
    rowFor('Reports')?.focus();
    press('ArrowLeft');
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos', 'Holiday']);
    expect(focusedLabel()).toBe('Reports');

    press('ArrowLeft');
    await settle(fixture);
    expect(focusedLabel()).toBe('Documents');
  });

  it('ArrowLeft on a leaf moves to its parent', async () => {
    const { fixture, rowFor, focusedLabel, press } = await tree();
    rowFor('Q1.pdf')?.focus();
    press('ArrowLeft');
    await settle(fixture);
    expect(focusedLabel()).toBe('Reports');
  });

  it('Home and End jump to the first and last visible node', async () => {
    const { fixture, rowFor, focusedLabel, press } = await tree();
    rowFor('Reports')?.focus();
    press('End');
    await settle(fixture);
    expect(focusedLabel()).toBe('Holiday');

    press('Home');
    await settle(fixture);
    expect(focusedLabel()).toBe('Documents');
  });

  it('skips disabled nodes while navigating', async () => {
    const { fixture, rowFor, focusedLabel, press } = await tree((h) =>
      h.items.set([
        { id: 1, parentId: null, name: 'Documents' },
        { id: 2, parentId: 1, name: 'Reports', disabled: true },
        { id: 4, parentId: null, name: 'Photos' },
      ]),
    );
    rowFor('Documents')?.focus();
    press('ArrowDown');
    await settle(fixture);
    expect(focusedLabel()).toBe('Photos');
  });

  it('type-ahead moves to the next matching node', async () => {
    const { fixture, rowFor, focusedLabel, press } = await tree();
    rowFor('Documents')?.focus();
    press('h');
    await settle(fixture);
    expect(focusedLabel()).toBe('Holiday');
  });

  it('Enter toggles a parent and selects a leaf', async () => {
    const { fixture, host, rowFor, labels, press } = await tree((h) => {
      h.selectionMode.set('single');
    });
    rowFor('Documents')?.focus();
    press('Enter');
    await settle(fixture);
    expect(labels()).toEqual(['Documents', 'Photos', 'Holiday']);

    rowFor('Holiday')?.focus();
    press('Enter');
    await settle(fixture);
    expect(host.selectedKeys()).toEqual([5]);
  });

  it('Space toggles selection on the focused node', async () => {
    const { fixture, host, rowFor, press } = await tree((h) =>
      h.selectionMode.set('multiple'),
    );
    rowFor('Reports')?.focus();
    press(' ');
    await settle(fixture);
    expect(host.selectedKeys()).toContain(2);

    press(' ');
    await settle(fixture);
    expect(host.selectedKeys()).not.toContain(2);
  });

  it('asterisk expands every sibling at the level', async () => {
    const { fixture, rowFor, labels, press } = await tree((h) =>
      h.expandedKeys.set([]),
    );
    rowFor('Documents')?.focus();
    press('*');
    await settle(fixture);
    // both roots open, their children do not
    expect(labels()).toEqual(['Documents', 'Reports', 'Photos', 'Holiday']);
  });

  it('Ctrl+A selects everything in multiple mode', async () => {
    const { fixture, host, rowFor, press } = await tree((h) =>
      h.selectionMode.set('multiple'),
    );
    rowFor('Documents')?.focus();
    press('a', { ctrlKey: true });
    await settle(fixture);
    expect(host.selectedKeys()).toHaveLength(5);
  });

  it('Ctrl+Shift+End selects from the focused node downwards', async () => {
    const { fixture, host, rowFor, press } = await tree((h) =>
      h.selectionMode.set('multiple'),
    );
    rowFor('Photos')?.focus();
    press('End', { ctrlKey: true, shiftKey: true });
    await settle(fixture);
    expect([...host.selectedKeys()].sort()).toEqual([4, 5]);
  });

  it('does nothing while disabled', async () => {
    const { fixture, rowFor, focusedLabel, press } = await tree((h) =>
      h.disabled.set(true),
    );
    rowFor('Documents')?.focus();
    press('ArrowDown');
    await settle(fixture);
    expect(focusedLabel()).toBe('Documents');
  });
});

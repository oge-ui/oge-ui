import { afterEach, describe, expect, it } from 'vitest';
import type { OgeMenuItem } from '../menu/menu-types';
import {
  ogeContextMenuApiTarget,
  ogeContextMenuPoint,
  ogeContextMenuTarget,
  ogeResolveContextMenuOpen,
  type OgeContextMenuOpeningEvent,
} from './context-menu-core';

const ITEMS: OgeMenuItem[] = [{ text: 'Open' }, { text: 'Delete' }];

function fixture() {
  const host = document.createElement('div');
  host.innerHTML = `
    <div class="row" data-id="1"><span class="cell">A</span></div>
    <div class="row" data-id="2"><span class="cell">B</span></div>
    <p class="gap">no row</p>`;
  document.body.append(host);
  const cell = host.querySelector('.row[data-id="2"] .cell') as HTMLElement;
  return { host, cell };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ogeContextMenuPoint', () => {
  it('reads the pointer location', () => {
    expect(ogeContextMenuPoint({ detail: 1, clientX: 5, clientY: 7 })).toEqual({
      x: 5,
      y: 7,
    });
  });

  it('treats keyboard-synthesized events as anchorless', () => {
    expect(ogeContextMenuPoint({ detail: 0, clientX: 5, clientY: 7 })).toBe(
      null,
    );
    expect(ogeContextMenuPoint({ detail: 1, clientX: 0, clientY: 0 })).toBe(
      null,
    );
  });
});

describe('ogeContextMenuTarget', () => {
  it('is the host without a selector', () => {
    const { host, cell } = fixture();
    expect(ogeContextMenuTarget(host, cell, undefined)).toBe(host);
  });

  it('delegates to the closest match inside the host', () => {
    const { host, cell } = fixture();
    expect(
      ogeContextMenuTarget(host, cell, '.row')?.getAttribute('data-id'),
    ).toBe('2');
  });

  it('ignores requests outside every match, and matches outside the host', () => {
    const { host } = fixture();
    const gap = host.querySelector('.gap');
    expect(ogeContextMenuTarget(host, gap, '.row')).toBe(null);
    const wrapper = document.createElement('section');
    wrapper.className = 'row';
    document.body.append(wrapper);
    wrapper.append(host);
    expect(ogeContextMenuTarget(host, gap, '.row')).toBe(null);
  });

  it('starts from the parent of a text node and survives a bad selector', () => {
    const { host, cell } = fixture();
    const text = cell.firstChild as Text;
    expect(ogeContextMenuTarget(host, text, '.row')).not.toBe(null);
    expect(ogeContextMenuTarget(host, cell, '][')).toBe(null);
  });
});

describe('ogeContextMenuApiTarget', () => {
  it('keeps a candidate inside the host, else hit-tests the point, else the host', () => {
    const { host, cell } = fixture();
    expect(ogeContextMenuApiTarget(host, cell, null)).toBe(cell);
    const outside = document.createElement('button');
    document.body.append(outside);
    expect(ogeContextMenuApiTarget(host, outside, null)).toBe(host);
    const original = document.elementFromPoint;
    document.elementFromPoint = () => cell;
    try {
      expect(ogeContextMenuApiTarget(host, outside, { x: 1, y: 1 })).toBe(cell);
      document.elementFromPoint = () => outside;
      expect(ogeContextMenuApiTarget(host, null, { x: 1, y: 1 })).toBe(host);
    } finally {
      document.elementFromPoint = original;
    }
  });
});

describe('ogeResolveContextMenuOpen', () => {
  it('opens with the configured items for the target', () => {
    const { host, cell } = fixture();
    const result = ogeResolveContextMenuOpen({
      host,
      eventTarget: cell,
      selector: '.row',
      items: ITEMS,
      event: null,
    });
    expect(result.kind).toBe('open');
    if (result.kind === 'open') {
      expect(result.items).toBe(ITEMS);
      expect(result.target.getAttribute('data-id')).toBe('2');
    }
  });

  it('lets the opening handler build the items per target', () => {
    const { host, cell } = fixture();
    const seen: OgeContextMenuOpeningEvent[] = [];
    const event = new MouseEvent('contextmenu');
    const result = ogeResolveContextMenuOpen({
      host,
      eventTarget: cell,
      selector: '.row',
      items: [],
      event,
      emitOpening: (e) => {
        seen.push(e);
        e.items = [{ text: `Row ${e.target.getAttribute('data-id')}` }];
      },
    });
    expect(seen[0].event).toBe(event);
    expect(result.kind === 'open' && result.items[0].text).toBe('Row 2');
  });

  it('reports a cancelled opening separately from an ignored request', () => {
    const { host, cell } = fixture();
    expect(
      ogeResolveContextMenuOpen({
        host,
        eventTarget: cell,
        items: ITEMS,
        event: null,
        emitOpening: (e) => {
          e.cancel = true;
        },
      }).kind,
    ).toBe('cancelled');
    expect(
      ogeResolveContextMenuOpen({
        host,
        eventTarget: cell,
        items: ITEMS,
        disabled: true,
        event: null,
      }).kind,
    ).toBe('ignored');
    expect(
      ogeResolveContextMenuOpen({
        host,
        eventTarget: cell,
        items: [],
        event: null,
      }).kind,
    ).toBe('ignored');
    expect(
      ogeResolveContextMenuOpen({
        host,
        eventTarget: host.querySelector('.gap'),
        selector: '.row',
        items: ITEMS,
        event: null,
        emitOpening: () => {
          throw new Error('never emitted outside a match');
        },
      }).kind,
    ).toBe('ignored');
  });
});

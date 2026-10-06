import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeChipList } from './chip-list';
import { OgeChipTemplate } from './templates';
import type {
  OgeChipItem,
  OgeChipItemRemovingEvent,
  OgeChipKey,
  OgeChipSelectionChangedEvent,
  OgeChipSelectionMode,
} from './chip-types';

const ITEMS: OgeChipItem[] = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta', disabled: true },
  { key: 'c', label: 'Gamma' },
  { key: 'd', label: 'Delta' },
];

@Component({
  imports: [OgeChipList],
  template: `
    <oge-chip-list
      [items]="items()"
      [selectionMode]="mode()"
      [(selectedKeys)]="selected"
      [removable]="removable()"
      [disabled]="disabled()"
      [ariaLabel]="label()"
      (selectionChanged)="changes.push($event)"
      (itemRemoving)="onRemoving($event)"
      (itemRemoved)="drop($event.item.key)"
    />
  `,
})
class ListHost {
  readonly items = signal<OgeChipItem[]>([...ITEMS]);
  readonly mode = signal<OgeChipSelectionMode>('multiple');
  readonly selected = signal<readonly OgeChipKey[]>([]);
  readonly removable = signal(false);
  readonly disabled = signal(false);
  readonly label = signal<string | undefined>(undefined);
  readonly list = viewChild.required(OgeChipList);
  readonly changes: OgeChipSelectionChangedEvent[] = [];
  veto = false;
  onRemoving(event: OgeChipItemRemovingEvent): void {
    event.cancel = this.veto;
  }
  drop(key: OgeChipKey): void {
    this.items.set(this.items().filter((item) => item.key !== key));
  }
}

@Component({
  imports: [OgeChipList, OgeChipTemplate],
  template: `
    <oge-chip-list [items]="items">
      <ng-template ogeChipTemplate let-item let-index="index">
        <b class="custom">{{ index }}:{{ item.label }}</b>
      </ng-template>
    </oge-chip-list>
  `,
})
class TemplateHost {
  readonly items = ITEMS.slice(0, 2);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const key = (el: Element, k: string) =>
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('OgeChipList — listbox', () => {
  let fixture: ComponentFixture<ListHost>;
  let host: ListHost;
  let el: HTMLElement;
  const options = () =>
    Array.from(el.querySelectorAll<HTMLElement>('[role="option"]'));

  beforeEach(async () => {
    fixture = TestBed.createComponent(ListHost);
    host = fixture.componentInstance;
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
  });

  afterEach(() => el.remove());

  it('is a labelled multiselectable listbox with one tab stop on first paint', () => {
    const list = el.querySelector('oge-chip-list')!;
    expect(list.getAttribute('role')).toBe('listbox');
    expect(list.getAttribute('aria-label')).toBe('Chips');
    expect(list.getAttribute('aria-multiselectable')).toBe('true');
    expect(options().map((o) => o.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(options()[1].getAttribute('aria-disabled')).toBe('true');
  });

  it('arrows skip disabled chips, Home/End jump, no wrap', async () => {
    options()[0].focus();
    key(options()[0], 'ArrowRight');
    expect(document.activeElement).toBe(options()[2]);
    key(options()[2], 'End');
    expect(document.activeElement).toBe(options()[3]);
    key(options()[3], 'ArrowRight');
    expect(document.activeElement).toBe(options()[3]);
    key(options()[3], 'Home');
    expect(document.activeElement).toBe(options()[0]);
    await settle(fixture);
    expect(options()[0].tabIndex).toBe(0);
  });

  it('Space / click toggles aria-selected and reports the change', async () => {
    key(options()[0], ' ');
    await settle(fixture);
    expect(host.selected()).toEqual(['a']);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    options()[2].click();
    await settle(fixture);
    expect(host.selected()).toEqual(['a', 'c']);
    expect(host.changes[1].previousKeys).toEqual(['a']);
    options()[1].click();
    expect(host.selected()).toEqual(['a', 'c']);
  });

  it('single mode replaces the selection and is not multiselectable', async () => {
    host.mode.set('single');
    await settle(fixture);
    expect(
      el.querySelector('oge-chip-list')!.hasAttribute('aria-multiselectable'),
    ).toBe(false);
    options()[0].click();
    options()[2].click();
    await settle(fixture);
    expect(host.selected()).toEqual(['c']);
  });

  it('Delete removes, the app drops the item, focus moves to the next chip', async () => {
    host.removable.set(true);
    await settle(fixture);
    expect(options()[0].getAttribute('aria-keyshortcuts')).toBe(
      'Delete Backspace',
    );
    expect(
      options()[0]
        .querySelector('.oge-chip-remove')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    options()[2].focus();
    key(options()[2], 'Delete');
    await settle(fixture);
    expect(host.items().map((i) => i.key)).toEqual(['a', 'b', 'd']);
    expect(document.activeElement?.textContent).toContain('Delta');
  });

  it('Backspace focuses the previous chip; a cancelled removal keeps the chip', async () => {
    host.removable.set(true);
    await settle(fixture);
    options()[3].focus();
    key(options()[3], 'Backspace');
    await settle(fixture);
    expect(document.activeElement?.textContent).toContain('Gamma');
    host.veto = true;
    key(options()[0], 'Delete');
    await settle(fixture);
    expect(host.items().length).toBe(3);
  });

  it('a click on the hidden ✕ removes the chip', async () => {
    host.removable.set(true);
    await settle(fixture);
    (options()[0].querySelector('.oge-chip-remove') as HTMLElement).click();
    await settle(fixture);
    expect(host.items()[0].key).toBe('b');
  });
});

describe('OgeChipList — grid and list', () => {
  let fixture: ComponentFixture<ListHost>;
  let host: ListHost;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ListHost);
    host = fixture.componentInstance;
    host.mode.set('none');
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
  });

  afterEach(() => el.remove());

  it('static chips are a plain list with nothing focusable', () => {
    const list = el.querySelector('oge-chip-list')!;
    expect(list.getAttribute('role')).toBe('list');
    expect(list.hasAttribute('aria-label')).toBe(false);
    expect(el.querySelectorAll('[role="listitem"]').length).toBe(4);
    expect(el.querySelectorAll('[tabindex]').length).toBe(0);
  });

  it('removable chips form a grid of rows with real remove buttons', async () => {
    host.removable.set(true);
    await settle(fixture);
    expect(el.querySelector('oge-chip-list')!.getAttribute('role')).toBe(
      'grid',
    );
    const rows = el.querySelectorAll('[role="row"]');
    expect(rows.length).toBe(4);
    expect(rows[0].querySelectorAll('[role="gridcell"]').length).toBe(2);
    // the disabled chip has no remove cell
    expect(rows[1].querySelectorAll('[role="gridcell"]').length).toBe(1);
    const label = rows[0].querySelector<HTMLElement>('.oge-chip-main')!;
    expect(label.tabIndex).toBe(0);
    label.focus();
    key(label, 'ArrowRight');
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Remove Alpha',
    );
    key(document.activeElement!, 'ArrowRight');
    expect(document.activeElement?.textContent).toContain('Gamma');
    (rows[0].querySelector('button') as HTMLButtonElement).click();
    await settle(fixture);
    expect(host.items()[0].key).toBe('b');
  });

  it('renders the custom chip template with its context', async () => {
    const f = TestBed.createComponent(TemplateHost);
    await settle(f);
    const custom = (f.nativeElement as HTMLElement).querySelectorAll('.custom');
    expect(Array.from(custom).map((c) => c.textContent)).toEqual([
      '0:Alpha',
      '1:Beta',
    ]);
  });
});

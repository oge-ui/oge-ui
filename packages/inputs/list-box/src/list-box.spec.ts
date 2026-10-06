import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { OgeListBox } from './list-box';
import {
  OgeListBoxGroupTemplate,
  OgeListBoxItemTemplate,
} from './list-box-templates';
import type { OgeListBoxSelectionChangedEvent } from './list-box-types';

interface City {
  id: number;
  name: string;
  country: string;
  closed?: boolean;
}

const CITIES: City[] = [
  { id: 1, name: 'Ankara', country: 'TR' },
  { id: 2, name: 'Berlin', country: 'DE' },
  { id: 3, name: 'Bonn', country: 'DE', closed: true },
  { id: 4, name: 'İzmir', country: 'TR' },
];

@Component({
  imports: [OgeListBox],
  template: `
    <oge-list-box
      label="Cities"
      [items]="items"
      displayExpr="name"
      valueExpr="id"
      disabledExpr="closed"
      [selectionMode]="mode()"
      [showCheckBoxes]="true"
      [searchEnabled]="search()"
      [groupBy]="group() ? 'country' : undefined"
      [readonly]="readonly()"
      [(value)]="value"
      (selectionChanged)="changes.push($event)"
    />
  `,
})
class Host {
  readonly items = CITIES;
  readonly mode = signal<'single' | 'multiple'>('single');
  readonly search = signal(false);
  readonly group = signal(false);
  readonly readonly = signal(false);
  readonly value = signal<unknown>(null);
  readonly changes: OgeListBoxSelectionChangedEvent<City>[] = [];
}

@Component({
  imports: [
    OgeListBox,
    OgeListBoxItemTemplate,
    OgeListBoxGroupTemplate,
    ReactiveFormsModule,
  ],
  template: `
    <oge-list-box
      [items]="items"
      displayExpr="name"
      valueExpr="id"
      groupBy="country"
      selectionMode="multiple"
      [formControl]="control"
    >
      <ng-template ogeListBoxItemTemplate let-city let-selected="selected">
        <b class="custom">{{ city.name }}:{{ selected }}</b>
      </ng-template>
      <ng-template ogeListBoxGroupTemplate let-label let-count="count">
        <i class="group">{{ label }} ({{ count }})</i>
      </ng-template>
    </oge-list-box>
  `,
})
class FormHost {
  readonly items = CITIES;
  readonly control = new FormControl<number[]>([], Validators.required);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const list = (f: ComponentFixture<unknown>): HTMLElement =>
  f.nativeElement.querySelector('[role="listbox"]');
const options = (f: ComponentFixture<unknown>): HTMLElement[] =>
  Array.from(f.nativeElement.querySelectorAll('[role="option"]'));

function key(el: HTMLElement, key: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

describe('OgeListBox', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders an APG listbox named by its label', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const box = list(f);
    expect(box.getAttribute('tabindex')).toBe('0');
    const label = f.nativeElement.querySelector('.oge-list-box-label');
    expect(box.getAttribute('aria-labelledby')).toBe(label.id);
    expect(box.hasAttribute('aria-multiselectable')).toBe(false);
    expect(options(f).map((o) => o.textContent?.trim())).toEqual([
      'Ankara',
      'Berlin',
      'Bonn',
      'İzmir',
    ]);
    expect(options(f)[2].getAttribute('aria-disabled')).toBe('true');
    expect(options(f)[0].getAttribute('aria-selected')).toBe('false');
  });

  it('single mode: arrows move and select, activedescendant only while focused', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const box = list(f);
    expect(box.getAttribute('aria-activedescendant')).toBeNull();
    box.focus();
    await settle(f);
    expect(box.getAttribute('aria-activedescendant')).toBe(options(f)[0].id);
    key(box, 'ArrowDown');
    await settle(f);
    expect(f.componentInstance.value()).toBe(2);
    key(box, 'ArrowDown');
    await settle(f);
    expect(f.componentInstance.value()).toBe(4);
    expect(box.getAttribute('aria-activedescendant')).toBe(options(f)[3].id);
    expect(options(f)[3].getAttribute('aria-selected')).toBe('true');
    const last = f.componentInstance.changes.at(-1)!;
    expect(last.previousValue).toBe(2);
    expect(last.addedItems.map((c) => c.name)).toEqual(['İzmir']);
    expect(last.removedItems.map((c) => c.name)).toEqual(['Berlin']);
  });

  it('multiple mode: click toggles, Shift+click extends, Ctrl+A selects all', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.mode.set('multiple');
    f.componentInstance.value.set([]);
    await settle(f);
    expect(list(f).getAttribute('aria-multiselectable')).toBe('true');
    expect(f.nativeElement.querySelectorAll('.oge-list-box-check').length).toBe(
      4,
    );
    options(f)[0].click();
    await settle(f);
    options(f)[3].dispatchEvent(
      new MouseEvent('click', { bubbles: true, shiftKey: true }),
    );
    await settle(f);
    expect(f.componentInstance.value()).toEqual([1, 2, 4]);
    options(f)[0].click();
    await settle(f);
    expect(f.componentInstance.value()).toEqual([2, 4]);
    list(f).focus();
    key(list(f), 'a', { ctrlKey: true });
    await settle(f);
    expect(f.componentInstance.value()).toEqual([1, 2, 4]);
    options(f)[2].click();
    await settle(f);
    expect(f.componentInstance.value()).toEqual([1, 2, 4]);
  });

  it('read-only lists navigate but never change the value', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.readonly.set(true);
    f.componentInstance.value.set(1);
    await settle(f);
    list(f).focus();
    key(list(f), 'ArrowDown');
    options(f)[3].click();
    await settle(f);
    expect(f.componentInstance.value()).toBe(1);
    expect(list(f).getAttribute('aria-readonly')).toBe('true');
  });

  it('search filters the options and type-ahead jumps by prefix', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.search.set(true);
    await settle(f);
    const input: HTMLInputElement = f.nativeElement.querySelector(
      '.oge-list-box-search-input',
    );
    expect(input.getAttribute('aria-controls')).toBe(list(f).id);
    input.value = 'b';
    input.dispatchEvent(new Event('input'));
    await settle(f);
    expect(options(f).map((o) => o.textContent?.trim())).toEqual([
      'Berlin',
      'Bonn',
    ]);
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    await settle(f);
    expect(options(f).length).toBe(0);
    expect(f.nativeElement.querySelector('.oge-list-box-empty')).not.toBeNull();
    input.value = '';
    input.dispatchEvent(new Event('input'));
    await settle(f);
    list(f).focus();
    key(list(f), 'i');
    await settle(f);
    expect(f.componentInstance.value()).toBe(4);
  });

  it('groups render as labelled role=group sections', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.group.set(true);
    await settle(f);
    const groups: HTMLElement[] = Array.from(
      f.nativeElement.querySelectorAll('[role="group"]'),
    );
    expect(groups.length).toBe(2);
    const header = groups[0].querySelector('.oge-list-box-group-header')!;
    expect(groups[0].getAttribute('aria-labelledby')).toBe(header.id);
    expect(header.textContent?.trim()).toBe('TR');
  });

  it('binds reactive forms and renders projected templates', async () => {
    const f = TestBed.createComponent(FormHost);
    await settle(f);
    expect(f.nativeElement.querySelector('.custom').textContent).toBe(
      'Ankara:false',
    );
    expect(f.nativeElement.querySelector('.group').textContent).toBe('TR (2)');
    options(f)[1].click();
    await settle(f);
    expect(f.componentInstance.control.value).toEqual([4]);
    expect(f.componentInstance.control.valid).toBe(true);
    f.componentInstance.control.setValue([1, 2]);
    await settle(f);
    expect(
      options(f).filter((o) => o.getAttribute('aria-selected') === 'true')
        .length,
    ).toBe(2);
    f.componentInstance.control.disable();
    await settle(f);
    expect(list(f).getAttribute('tabindex')).toBe('-1');
  });
});

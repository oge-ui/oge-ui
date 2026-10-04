import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { LoadOptions } from '@oge-ui/core';
import type {
  OgeListDataSource,
  OgeListPageLoadedEvent,
} from '@oge-ui/behavior';
import { OgeSelectBox } from './select-box';

interface Person {
  id: number;
  name: string;
}

const PEOPLE: Person[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `Person ${String(i + 1).padStart(3, '0')}`,
}));

/** A server double: answers `load` from PEOPLE and records every request. */
function fakeServer() {
  const calls: LoadOptions[] = [];
  const byKeyCalls: unknown[] = [];
  const source: OgeListDataSource<Person> = {
    load: async (options) => {
      calls.push(options);
      const term = (options.searchText ?? '').toLowerCase();
      const rows = PEOPLE.filter((p) => p.name.toLowerCase().includes(term));
      const skip = options.skip ?? 0;
      return {
        data: rows.slice(skip, skip + (options.take ?? rows.length)),
        totalCount: rows.length,
      };
    },
    byKey: async (key) => {
      byKeyCalls.push(key);
      return PEOPLE.find((p) => p.id === key) ?? null;
    },
  };
  return { source, calls, byKeyCalls };
}

@Component({
  imports: [OgeSelectBox],
  template: `
    <oge-select-box
      label="Person"
      displayExpr="name"
      valueExpr="id"
      [dataSource]="source()"
      [pageSize]="20"
      [searchEnabled]="true"
      [searchTimeout]="0"
      [virtualScroll]="virtual()"
      [(value)]="value"
      (pageLoaded)="pages.push($event)"
    />
  `,
})
class Host {
  readonly source = signal<OgeListDataSource<Person> | undefined>(undefined);
  readonly virtual = signal(true);
  readonly value = signal<unknown>(null);
  readonly pages: OgeListPageLoadedEvent<Person>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  fixture.detectChanges();
}

function selectBox(fixture: ComponentFixture<Host>): OgeSelectBox<Person> {
  return fixture.debugElement.children[0].componentInstance;
}

function options(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll<HTMLElement>('.oge-select-option'),
  );
}

function type(fixture: ComponentFixture<unknown>, text: string): void {
  const input: HTMLInputElement =
    fixture.nativeElement.querySelector('.oge-input-native');
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('OgeSelectBox remote dataSource', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('loads the first page on open with skip/take and renders its rows', async () => {
    const server = fakeServer();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.source.set(server.source);
    await settle(fixture);
    expect(server.calls).toHaveLength(0);
    selectBox(fixture).open();
    await settle(fixture);
    expect(server.calls[0]).toMatchObject({
      skip: 0,
      take: 20,
      requireTotalCount: true,
    });
    expect(options(fixture)[0].textContent).toContain('Person 001');
    // the server total drives aria-setsize while rows are still missing
    expect(options(fixture)[0].getAttribute('aria-setsize')).toBe('200');
    expect(fixture.componentInstance.pages[0]).toMatchObject({
      skip: 0,
      totalCount: 200,
    });
  });

  it('loads the next page as the virtual window nears the loaded end', async () => {
    const server = fakeServer();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.source.set(server.source);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    const list: HTMLElement =
      fixture.nativeElement.querySelector('.oge-select-list');
    list.scrollTop = 20 * 34 - 320;
    list.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    expect(server.calls.map((call) => call.skip)).toEqual([0, 20]);
  });

  it('sends the typed text as searchText and shows the server rows', async () => {
    const server = fakeServer();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.source.set(server.source);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    type(fixture, '150');
    await settle(fixture);
    expect(server.calls.at(-1)).toMatchObject({ searchText: '150', skip: 0 });
    expect(options(fixture).map((o) => o.textContent?.trim())).toEqual([
      'Person 150',
    ]);
  });

  it('resolves a value no loaded page holds through byKey', async () => {
    const server = fakeServer();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.source.set(server.source);
    fixture.componentInstance.value.set(123);
    await settle(fixture);
    expect(server.byKeyCalls).toEqual([123]);
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('.oge-input-native');
    expect(input.value).toBe('Person 123');
  });

  it('keeps the picked row resolvable after the search moves on', async () => {
    const server = fakeServer();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.virtual.set(false);
    fixture.componentInstance.source.set(server.source);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    type(fixture, '077');
    await settle(fixture);
    options(fixture)[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(77);
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('.oge-input-native');
    expect(input.value).toBe('Person 077');
    expect(server.byKeyCalls).toEqual([]);
  });
});

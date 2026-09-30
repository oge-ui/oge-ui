import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSelectBox } from './select-box';

interface Row {
  id: number;
  name: string;
  region: string;
}

const ITEMS: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`,
  region: i % 2 === 0 ? 'Even' : 'Odd',
}));

@Component({
  imports: [OgeSelectBox],
  template: `
    <oge-select-box
      label="Rows"
      [items]="items()"
      displayExpr="name"
      valueExpr="id"
      [virtualScroll]="virtualScroll()"
      [dropdownMaxHeight]="200"
      [groupBy]="groupBy()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = signal<Row[]>(ITEMS);
  readonly value = signal<unknown>(null);
  readonly virtualScroll = signal<boolean | { itemHeight?: number }>(true);
  readonly groupBy = signal<string | undefined>(undefined);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function selectBox(fixture: ComponentFixture<Host>): OgeSelectBox<Row> {
  return fixture.debugElement.children[0].componentInstance;
}

function options(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-select-option'),
  );
}

function listEl(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement.querySelector('.oge-select-list');
}

describe('OgeSelectBox virtual scrolling', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders only a window of the 1000 items inside a full-height spacer', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    const rendered = options(fixture);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(30);
    const spacer = fixture.nativeElement.querySelector('.oge-select-spacer');
    expect(spacer.style.height).toBe(`${1000 * 34}px`);
    expect(listEl(fixture).classList).toContain('oge-select-list-virtual');
  });

  it('keeps absolute option ids, aria-posinset and aria-setsize while scrolled', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    const list = listEl(fixture);
    list.scrollTop = 3400; // 100 rows down
    list.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    const first = options(fixture)[0];
    const index = Number(first.id.split('-option-')[1]);
    expect(index).toBe(100 - 4); // overscan above the viewport
    expect(first.getAttribute('aria-posinset')).toBe(String(index + 1));
    expect(first.getAttribute('aria-setsize')).toBe('1000');
  });

  it('scrolls the pre-selected value into the window on open', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(500);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve, 0)); // deferred DOM scroll
    await settle(fixture);
    const active = fixture.nativeElement.querySelector(
      '.oge-select-option-active',
    );
    expect(active?.textContent?.trim()).toBe('Item 500');
    expect(active?.getAttribute('aria-selected')).toBe('true');
  });

  it('ignores groupBy in virtual mode and warns in dev mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.groupBy.set('region');
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.oge-select-group')).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('virtualScroll ignores groupBy'),
    );
    warn.mockRestore();
  });

  it('selects by click on an absolute index deep in the list', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    selectBox(fixture).open();
    await settle(fixture);
    const list = listEl(fixture);
    list.scrollTop = 6800; // 200 rows down
    list.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    const target = options(fixture).find(
      (el) => el.textContent?.trim() === 'Item 200',
    );
    expect(target).toBeTruthy();
    target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(200);
  });
});

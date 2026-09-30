import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeTagBox } from './tag-box';

interface Row {
  id: number;
  name: string;
}

const ITEMS: Row[] = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  name: `Tag ${i}`,
}));

@Component({
  imports: [OgeTagBox],
  template: `
    <oge-tag-box
      label="Tags"
      [items]="items()"
      displayExpr="name"
      valueExpr="id"
      [virtualScroll]="true"
      [dropdownMaxHeight]="200"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly items = signal<Row[]>(ITEMS);
  readonly value = signal<readonly unknown[]>([]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function tagBox(fixture: ComponentFixture<Host>): OgeTagBox<Row> {
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

describe('OgeTagBox virtual scrolling', () => {
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

  it('renders a bounded window of the 500 items with a full-height spacer', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    tagBox(fixture).open();
    await settle(fixture);
    const rendered = options(fixture);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(30);
    const spacer = fixture.nativeElement.querySelector('.oge-select-spacer');
    expect(spacer.style.height).toBe(`${500 * 34}px`);
  });

  it('toggles selection by absolute index after scrolling and stays open', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    tagBox(fixture).open();
    await settle(fixture);
    const list = listEl(fixture);
    list.scrollTop = 3400; // 100 rows down
    list.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    const target = options(fixture).find(
      (el) => el.textContent?.trim() === 'Tag 100',
    );
    expect(target).toBeTruthy();
    expect(target?.getAttribute('aria-setsize')).toBe('500');
    target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([100]);
    expect(listEl(fixture)).toBeTruthy(); // multi-select keeps the popup open
    const chip = fixture.nativeElement.querySelector('.oge-tag-text');
    expect(chip?.textContent?.trim()).toBe('Tag 100');
  });
});

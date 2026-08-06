import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ApiReference, type ApiSections } from './api-reference';

const SECTIONS: ApiSections = {
  properties: [
    {
      title: 'Common (base)',
      entries: [
        {
          name: 'label',
          type: 'string',
          default: "''",
          description: 'Label text.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: '—',
        },
      ],
    },
    {
      title: 'Specific',
      entries: [
        {
          name: 'maxLength',
          type: 'number | undefined',
          description: 'Counter cap.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        { name: 'focus(): void', type: 'void', description: 'Moves focus.' },
      ],
    },
  ],
  events: [],
};

@Component({
  imports: [ApiReference],
  template: `<app-api-reference
    title="OgeThing"
    selector="oge-thing"
    [sections]="sections()"
  />`,
})
class Host {
  readonly sections = signal<ApiSections>(SECTIONS);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function filterTo(fixture: ComponentFixture<unknown>, text: string): void {
  const box = fixture.nativeElement.querySelector(
    'input[type="search"]',
  ) as HTMLInputElement;
  box.value = text;
  box.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
}

function headings(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('h3')).map(
    (h) => ((h as HTMLElement).textContent ?? '').trim().split(/\s+/)[0],
  );
}

describe('ApiReference', () => {
  async function create(): Promise<ComponentFixture<Host>> {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return fixture;
  }

  it('renders only non-empty sections with member counts and group titles', async () => {
    const fixture = await create();
    expect(headings(fixture)).toEqual(['Properties', 'Methods']); // events: [] stays hidden
    const h3 = fixture.nativeElement.querySelectorAll('h3')[0] as HTMLElement;
    expect(h3.textContent).toContain('3');
    const groupTitles = Array.from(
      fixture.nativeElement.querySelectorAll('h4'),
    ).map((h) => ((h as HTMLElement).textContent ?? '').trim());
    expect(groupTitles).toEqual(['Common (base)', 'Specific']);
    expect(h3.id).toBe('ogething-properties');
  });

  it('shows the Default column only in sections where some entry has one', async () => {
    const fixture = await create();
    const tables = fixture.nativeElement.querySelectorAll('table');
    const headerCells = (table: Element) =>
      Array.from(table.querySelectorAll('th')).map((th) =>
        (th.textContent ?? '').trim(),
      );
    expect(headerCells(tables[0])).toContain('Default'); // properties
    expect(headerCells(tables[2])).not.toContain('Default'); // methods
  });

  it('filters entries by name and hides emptied groups and sections', async () => {
    const fixture = await create();
    filterTo(fixture, 'max');
    expect(headings(fixture)).toEqual(['Properties']);
    const names = Array.from(
      fixture.nativeElement.querySelectorAll('td:first-child code'),
    ).map((c) => (c as HTMLElement).textContent);
    expect(names).toEqual(['maxLength']);
    expect(fixture.nativeElement.querySelectorAll('h4')).toHaveLength(1);
  });

  it('reports when nothing matches and recovers when cleared', async () => {
    const fixture = await create();
    filterTo(fixture, 'zzz');
    expect(headings(fixture)).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No members match');
    filterTo(fixture, '');
    expect(headings(fixture)).toEqual(['Properties', 'Methods']);
  });
});

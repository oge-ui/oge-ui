import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { LoadOptions } from '@oge-ui/core';
import type { OgeListDataSource } from '@oge-ui/behavior';
import { OgeAutocomplete } from './autocomplete';

const CITIES = Array.from({ length: 60 }, (_, i) => `City ${i + 1}`);

@Component({
  imports: [OgeAutocomplete],
  template: `
    <oge-autocomplete
      label="City"
      [dataSource]="source"
      [pageSize]="10"
      [searchTimeout]="0"
      [minSearchLength]="2"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly calls: LoadOptions[] = [];
  readonly value = signal('');
  readonly source: OgeListDataSource<string> = {
    load: async (options) => {
      this.calls.push(options);
      const term = (options.searchText ?? '').toLowerCase();
      const rows = CITIES.filter((city) => city.toLowerCase().includes(term));
      const skip = options.skip ?? 0;
      return { data: rows.slice(skip, skip + (options.take ?? 10)) };
    },
  };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 2; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  fixture.detectChanges();
}

function type(fixture: ComponentFixture<unknown>, text: string): void {
  const input: HTMLInputElement =
    fixture.nativeElement.querySelector('.oge-input-native');
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('OgeAutocomplete remote dataSource', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('asks the server only past minSearchLength, with the typed text', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'c');
    await settle(fixture);
    expect(fixture.componentInstance.calls).toHaveLength(0);
    type(fixture, 'ci');
    await settle(fixture);
    expect(fixture.componentInstance.calls[0]).toMatchObject({
      searchText: 'ci',
      skip: 0,
      take: 10,
    });
    // no maxItemCount cap in remote mode — the page size rules
    expect(
      fixture.nativeElement.querySelectorAll('.oge-select-option').length,
    ).toBe(10);
  });

  it('without a total, a full page means another may follow', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, 'city');
    await settle(fixture);
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('.oge-input-native');
    // walking the keyboard to the loaded end asks for the next page
    for (let i = 0; i < 9; i++) {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
    }
    await settle(fixture);
    expect(fixture.componentInstance.calls.map((call) => call.skip)).toEqual([
      0, 10,
    ]);
  });
});

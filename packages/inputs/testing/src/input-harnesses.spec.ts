import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import type { HarnessLoader } from '@angular/cdk/testing';
import { OgeDateBox } from '../../date-box/src/date-box';
import { OgeNumberBox } from '../../number-box/src/number-box';
import { OgeSelectBox } from '../../select-box/src/select-box';
import { OgeTextBox } from '../../text-box/src/text-box';
import { OgeDateBoxHarness } from './date-box-harness';
import { OgeNumberBoxHarness, OgeTextBoxHarness } from './input-harness';
import { OgeSelectBoxHarness } from './select-box-harness';

@Component({
  imports: [OgeTextBox, OgeNumberBox, OgeSelectBox, OgeDateBox],
  template: `
    <oge-text-box
      label="Name"
      placeholder="Full name"
      hint="As on the badge"
      [required]="true"
      [(value)]="name"
    />
    <oge-text-box label="Code" [disabled]="true" value="X-1" />
    <oge-text-box
      label="Email"
      [invalid]="true"
      errorDisplay="always"
      errorText="Enter an email address"
    />
    <oge-number-box label="Qty" locale="en-US" [step]="1" [(value)]="qty" />
    <oge-select-box
      label="City"
      [items]="cities"
      [showClearButton]="true"
      [(value)]="city"
    />
    <oge-date-box label="Due" locale="en-US" [(value)]="due" />
  `,
})
class Host {
  readonly cities = ['Lisbon', 'Oslo', 'Rome'];
  readonly name = signal('');
  readonly qty = signal<number | null>(2);
  readonly city = signal<unknown>(null);
  readonly due = signal<Date | null>(new Date(2026, 2, 14));
}

function setup(): { host: Host; loader: HarnessLoader } {
  const fixture = TestBed.createComponent(Host);
  return {
    host: fixture.componentInstance,
    loader: TestbedHarnessEnvironment.loader(fixture),
  };
}

describe('inputs harnesses', () => {
  beforeEach(() => {
    // popups position in requestAnimationFrame — stub it asynchronously
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('OgeTextBoxHarness', () => {
    it('filters by label, value and disabled state', async () => {
      const { loader } = setup();
      expect(await loader.getAllHarnesses(OgeTextBoxHarness)).toHaveLength(3);
      const code = await loader.getHarness(
        OgeTextBoxHarness.with({ value: 'X-1' }),
      );
      expect(await code.getLabel()).toBe('Code');
      expect(
        await loader.getAllHarnesses(
          OgeTextBoxHarness.with({ disabled: true }),
        ),
      ).toHaveLength(1);
      expect(await code.isDisabled()).toBe(true);
    });

    it('types, commits on blur and reads the field state', async () => {
      const { host, loader } = setup();
      const name = await loader.getHarness(
        OgeTextBoxHarness.with({ label: 'Name' }),
      );
      expect(await name.getPlaceholder()).toBe('Full name');
      expect(await name.getHintText()).toBe('As on the badge');
      expect(await name.isRequired()).toBe(true);
      expect(await name.isDisabled()).toBe(false);
      expect(await name.isReadonly()).toBe(false);
      await name.setValue('Ada');
      expect(await name.getValue()).toBe('Ada');
      expect(host.name()).toBe('Ada');
      expect(await name.isFocused()).toBe(false);
    });

    it('reports the error state', async () => {
      const { loader } = setup();
      const email = await loader.getHarness(
        OgeTextBoxHarness.with({ label: /mail/ }),
      );
      expect(await email.isInvalid()).toBe(true);
      expect(await email.getErrorText()).toBe('Enter an email address');
    });
  });

  describe('OgeNumberBoxHarness', () => {
    it('reads, steps and types numbers', async () => {
      const { host, loader } = setup();
      const qty = await loader.getHarness(OgeNumberBoxHarness);
      expect(await qty.getValue()).toBe('2');
      await qty.increment();
      expect(host.qty()).toBe(3);
      await qty.decrement();
      await qty.decrement();
      expect(host.qty()).toBe(1);
      await qty.setValue('42');
      expect(host.qty()).toBe(42);
    });
  });

  describe('OgeSelectBoxHarness', () => {
    it('opens, lists, selects by text and closes', async () => {
      const { host, loader } = setup();
      const city = await loader.getHarness(
        OgeSelectBoxHarness.with({ label: 'City' }),
      );
      expect(await city.isOpen()).toBe(false);
      expect(await city.getOptions()).toEqual(['Lisbon', 'Oslo', 'Rome']);
      expect(await city.isOpen()).toBe(true);
      expect(await city.getOptions({ text: /o$/ })).toEqual(['Oslo']);
      await city.close();
      expect(await city.isOpen()).toBe(false);

      await city.selectOption('Oslo');
      expect(host.city()).toBe('Oslo');
      expect(await city.getValue()).toBe('Oslo');
      expect(await city.isOpen()).toBe(false);
      expect(await city.getSelectedOptionText()).toBe('Oslo');
    });

    it('names the options when the text matches none', async () => {
      const { loader } = setup();
      const city = await loader.getHarness(OgeSelectBoxHarness);
      await expect(city.selectOption('Paris')).rejects.toThrow(
        /no option matching Paris \(options: Lisbon, Oslo, Rome\)/,
      );
    });
  });

  describe('OgeDateBoxHarness', () => {
    it('types a date and picks a day from the calendar', async () => {
      const { host, loader } = setup();
      const due = await loader.getHarness(
        OgeDateBoxHarness.with({ label: 'Due' }),
      );
      expect(await due.getValue()).toBe('3/14/26');
      await due.setValue('4/2/2026');
      expect(host.due()).toEqual(new Date(2026, 3, 2));

      await due.open();
      expect(await due.isOpen()).toBe(true);
      expect(await due.getCalendarTitle()).toBe('April 2026');
      await due.nextMonth();
      expect(await due.getCalendarTitle()).toBe('May 2026');
      await due.selectDay(20);
      expect(host.due()).toEqual(new Date(2026, 4, 20));
      expect(await due.isOpen()).toBe(false);

      await due.open();
      await due.close();
      expect(await due.isOpen()).toBe(false);
    });
  });
});

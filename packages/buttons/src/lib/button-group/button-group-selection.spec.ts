import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from '../button/button';
import { OgeButtonGroup } from './button-group';
import type {
  OgeButtonGroupItemClickEvent,
  OgeButtonGroupSelectionChangedEvent,
} from './button-group-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeButton, OgeButtonGroup],
  template: `
    <oge-button-group
      [selectionMode]="selectionMode()"
      [(selectedKeys)]="selectedKeys"
      (itemClick)="itemClicks.push($event)"
      (selectionChanged)="changes.push($event)"
    >
      <oge-button value="left" text="Left" />
      <oge-button value="center" text="Center" />
      <oge-button value="right" text="Right" [disabled]="rightDisabled()" />
      @if (withValueless()) {
        <oge-button text="No value" />
      }
    </oge-button-group>
  `,
})
class SelectionHost {
  readonly selectionMode = signal<'none' | 'single' | 'multiple'>('single');
  readonly selectedKeys = signal<readonly string[]>([]);
  readonly rightDisabled = signal(false);
  readonly withValueless = signal(false);
  readonly itemClicks: OgeButtonGroupItemClickEvent[] = [];
  readonly changes: OgeButtonGroupSelectionChangedEvent[] = [];
}

describe('OgeButtonGroup selection', () => {
  async function render(setup?: (host: SelectionHost) => void) {
    const fixture = TestBed.createComponent(SelectionHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      natives: () =>
        Array.from(
          el.querySelectorAll<HTMLButtonElement>('.oge-button-native'),
        ),
      buttons: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-button')),
    };
  }

  it('single: click selects, emits both outputs, re-click keeps the selection', async () => {
    const { fixture, host, natives } = await render();
    natives()[0].click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual(['left']);
    expect(host.itemClicks.length).toBe(1);
    expect(host.changes).toEqual([
      { selectedKeys: ['left'], addedKeys: ['left'], removedKeys: [] },
    ]);

    natives()[0].click(); // radios cannot unselect
    await settle(fixture);
    expect(host.selectedKeys()).toEqual(['left']);
    expect(host.itemClicks.length).toBe(2);
    expect(host.changes.length).toBe(1);

    natives()[1].click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual(['center']);
    expect(host.changes[1]).toEqual({
      selectedKeys: ['center'],
      addedKeys: ['center'],
      removedKeys: ['left'],
    });
  });

  it('single: the model is two-way — presets mark aria-checked and the selected class', async () => {
    const { natives, buttons } = await render((h) =>
      h.selectedKeys.set(['center']),
    );
    expect(natives()[1].getAttribute('aria-checked')).toBe('true');
    expect(buttons()[1].classList.contains('oge-button-selected')).toBe(true);
    expect(natives()[0].getAttribute('aria-checked')).toBe('false');
  });

  it('multiple: clicks toggle keys on and off with aria-pressed', async () => {
    const { fixture, host, natives } = await render((h) =>
      h.selectionMode.set('multiple'),
    );
    natives()[0].click();
    natives()[1].click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual(['left', 'center']);
    expect(natives()[0].getAttribute('aria-pressed')).toBe('true');

    natives()[0].click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual(['center']);
    expect(host.changes[2]).toEqual({
      selectedKeys: ['center'],
      addedKeys: [],
      removedKeys: ['left'],
    });
    expect(natives()[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('none: only itemClick fires and selectedKeys stays untouched', async () => {
    const { fixture, host, natives } = await render((h) =>
      h.selectionMode.set('none'),
    );
    natives()[0].click();
    await settle(fixture);
    expect(host.itemClicks).toEqual([
      { value: 'left', event: expect.any(Event), item: undefined, index: 0 },
    ]);
    expect(host.changes.length).toBe(0);
    expect(host.selectedKeys()).toEqual([]);
  });

  it('itemClick resolves the DOM index of the clicked button', async () => {
    const { fixture, host, natives } = await render();
    natives()[1].click();
    await settle(fixture);
    expect(host.itemClicks[0].index).toBe(1);
  });

  it('a disabled child cannot be clicked or selected', async () => {
    const { fixture, host, natives } = await render((h) =>
      h.rightDisabled.set(true),
    );
    expect(natives()[2].disabled).toBe(true);
    natives()[2].click();
    await settle(fixture);
    expect(host.selectedKeys()).toEqual([]);
    expect(host.itemClicks.length).toBe(0);
  });

  it('a value-less button emits itemClick but never selects (and warns in dev mode)', async () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const { fixture, host, natives } = await render((h) =>
      h.withValueless.set(true),
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no `value`'));

    natives()[3].click();
    await settle(fixture);
    expect(host.itemClicks[0].value).toBeUndefined();
    expect(host.changes.length).toBe(0);
    expect(host.selectedKeys()).toEqual([]);
    warnSpy.mockRestore();
  });
});

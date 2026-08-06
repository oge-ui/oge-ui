import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from '../button/button';
import { OgeButtonGroup } from './button-group';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function arrow(el: HTMLElement, key: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }),
  );
}

@Component({
  imports: [OgeButton, OgeButtonGroup],
  template: `
    <oge-button-group
      [selectionMode]="selectionMode()"
      [(selectedKeys)]="selectedKeys"
    >
      <oge-button value="a" text="Alpha" />
      <oge-button value="b" text="Beta" [disabled]="betaDisabled()" />
      <oge-button value="c" text="Gamma" />
    </oge-button-group>
  `,
})
class KeyboardHost {
  readonly selectionMode = signal<'none' | 'single' | 'multiple'>('none');
  readonly selectedKeys = signal<readonly string[]>([]);
  readonly betaDisabled = signal(false);
}

describe('OgeButtonGroup keyboard navigation', () => {
  async function render(setup?: (host: KeyboardHost) => void) {
    const fixture = TestBed.createComponent(KeyboardHost);
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
    };
  }

  it('exactly one button carries tabindex 0 (roving tabindex)', async () => {
    const { natives } = await render();
    const tabIndexes = natives().map((n) => n.getAttribute('tabindex'));
    expect(tabIndexes).toEqual(['0', '-1', '-1']);
  });

  it('ArrowRight moves focus forward and wraps; disabled buttons are skipped', async () => {
    const { fixture, natives } = await render((h) => h.betaDisabled.set(true));
    natives()[0].focus();
    natives()[0].dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle(fixture);

    arrow(natives()[0], 'ArrowRight'); // skips disabled Beta
    await settle(fixture);
    expect(document.activeElement).toBe(natives()[2]);
    expect(natives()[2].getAttribute('tabindex')).toBe('0');
    expect(natives()[0].getAttribute('tabindex')).toBe('-1');

    arrow(natives()[2], 'ArrowRight'); // wraps to Alpha
    await settle(fixture);
    expect(document.activeElement).toBe(natives()[0]);
  });

  it('ArrowLeft moves backwards and Home/End jump to the edges', async () => {
    const { fixture, natives } = await render();
    natives()[0].focus();
    natives()[0].dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle(fixture);

    arrow(natives()[0], 'ArrowLeft'); // wraps to Gamma
    await settle(fixture);
    expect(document.activeElement).toBe(natives()[2]);

    arrow(natives()[2], 'Home');
    await settle(fixture);
    expect(document.activeElement).toBe(natives()[0]);

    arrow(natives()[0], 'End');
    await settle(fixture);
    expect(document.activeElement).toBe(natives()[2]);
  });

  it('in single mode arrow movement also selects (radio-group pattern)', async () => {
    const { fixture, host, natives } = await render((h) => {
      h.selectionMode.set('single');
      h.selectedKeys.set(['a']);
    });
    natives()[0].focus();
    natives()[0].dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle(fixture);

    arrow(natives()[0], 'ArrowRight');
    await settle(fixture);
    expect(host.selectedKeys()).toEqual(['b']);
    expect(natives()[1].getAttribute('aria-checked')).toBe('true');
  });

  it('focus() targets the roving-tabindex button programmatically', async () => {
    const { fixture, natives } = await render();
    const group = fixture.debugElement.children[0]
      .componentInstance as OgeButtonGroup;
    group.focus();
    await settle(fixture);
    expect(document.activeElement).toBe(natives()[0]);
  });

  it('focusin updates the roving anchor', async () => {
    const { fixture, natives } = await render();
    natives()[1].focus();
    natives()[1].dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle(fixture);
    expect(natives()[1].getAttribute('tabindex')).toBe('0');
    expect(natives()[0].getAttribute('tabindex')).toBe('-1');
  });
});

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from '../button/button';
import { OgeButtonGroup } from './button-group';
import type { OgeButtonGroupItem } from './button-group-types';

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
      [stylingMode]="stylingMode()"
      [severity]="severity()"
      [size]="size()"
      [disabled]="disabled()"
      [items]="items()"
      ariaLabel="Demo group"
    >
      <oge-button value="a" text="Alpha" />
      <oge-button value="b" text="Beta" [severity]="childSeverity()" />
    </oge-button-group>
  `,
})
class GroupHost {
  readonly selectionMode = signal<'none' | 'single' | 'multiple'>('none');
  readonly stylingMode = signal<'contained' | 'outlined' | 'text'>('contained');
  readonly severity = signal<
    'normal' | 'accent' | 'success' | 'warning' | 'danger'
  >('normal');
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly disabled = signal(false);
  readonly items = signal<readonly OgeButtonGroupItem[] | undefined>(undefined);
  readonly childSeverity = signal<'danger' | undefined>(undefined);
}

describe('OgeButtonGroup rendering', () => {
  async function render(setup?: (host: GroupHost) => void) {
    const fixture = TestBed.createComponent(GroupHost);
    setup?.(fixture.componentInstance);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      group: el.querySelector('.oge-button-group') as HTMLElement,
      buttons: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-button')),
      natives: () =>
        Array.from(
          el.querySelectorAll<HTMLButtonElement>('.oge-button-native'),
        ),
    };
  }

  it('cascades stylingMode, severity and size to children', async () => {
    const { buttons } = await render((h) => {
      h.stylingMode.set('outlined');
      h.severity.set('accent');
      h.size.set('sm');
    });
    for (const button of buttons()) {
      expect(button.classList.contains('oge-button-outlined')).toBe(true);
      expect(button.classList.contains('oge-button-severity-accent')).toBe(
        true,
      );
      expect(button.classList.contains('oge-button-sm')).toBe(true);
    }
  });

  it("a child's own input overrides the group value", async () => {
    const { buttons } = await render((h) => {
      h.severity.set('accent');
      h.childSeverity.set('danger');
    });
    expect(buttons()[0].classList.contains('oge-button-severity-accent')).toBe(
      true,
    );
    expect(buttons()[1].classList.contains('oge-button-severity-danger')).toBe(
      true,
    );
  });

  it('renders data-driven items after the projected children', async () => {
    const { buttons, natives } = await render((h) =>
      h.items.set([
        { value: 'c', text: 'Gamma' },
        { value: 'd', text: 'Delta', disabled: true },
      ]),
    );
    expect(buttons().length).toBe(4);
    const labels = natives().map((n) => n.textContent?.trim());
    expect(labels).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(natives()[3].disabled).toBe(true);
  });

  it('group disabled disables every child', async () => {
    const { group, natives } = await render((h) => h.disabled.set(true));
    expect(group.classList.contains('oge-disabled')).toBe(true);
    for (const native of natives()) expect(native.disabled).toBe(true);
  });

  it('computes the ARIA role from selectionMode', async () => {
    const { fixture, host, group } = await render();
    expect(group.getAttribute('role')).toBe('toolbar');
    expect(group.getAttribute('aria-label')).toBe('Demo group');

    host.selectionMode.set('single');
    await settle(fixture);
    expect(group.getAttribute('role')).toBe('radiogroup');

    host.selectionMode.set('multiple');
    await settle(fixture);
    expect(group.getAttribute('role')).toBe('group');
  });

  it('children of a single-mode group become radios', async () => {
    const { natives } = await render((h) => h.selectionMode.set('single'));
    for (const native of natives()) {
      expect(native.getAttribute('role')).toBe('radio');
      expect(native.getAttribute('aria-checked')).toBe('false');
    }
  });
});

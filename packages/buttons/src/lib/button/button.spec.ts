import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeButton } from './button';
import { OgeButtonIcon } from './button-icon';
import type { OgeButtonClickEvent } from './button-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeButton, OgeButtonIcon],
  template: `
    <oge-button
      [text]="text()"
      [hint]="hint()"
      [disabled]="disabled()"
      [stylingMode]="stylingMode()"
      [severity]="severity()"
      [size]="size()"
      [iconPosition]="iconPosition()"
      [tabIndex]="tabIndex()"
      [accessKey]="accessKey()"
      [useSubmitBehavior]="useSubmitBehavior()"
      (clicked)="clicks.push($event)"
    >
      @if (withIcon()) {
        <svg
          ogeButtonIcon
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path d="M2 8h12" />
        </svg>
      }
    </oge-button>
  `,
})
class ButtonHost {
  readonly text = signal('Save');
  readonly hint = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly stylingMode = signal<'contained' | 'outlined' | 'text' | undefined>(
    undefined,
  );
  readonly severity = signal<
    'normal' | 'accent' | 'success' | 'warning' | 'danger' | undefined
  >(undefined);
  readonly size = signal<'sm' | 'md' | 'lg' | undefined>(undefined);
  readonly iconPosition = signal<'before' | 'after'>('before');
  readonly tabIndex = signal(0);
  readonly accessKey = signal<string | undefined>(undefined);
  readonly useSubmitBehavior = signal(false);
  readonly withIcon = signal(false);
  readonly clicks: OgeButtonClickEvent[] = [];
}

describe('OgeButton', () => {
  async function render() {
    const fixture = TestBed.createComponent(ButtonHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      button: el.querySelector('.oge-button') as HTMLElement,
      native: el.querySelector('.oge-button-native') as HTMLButtonElement,
    };
  }

  it('renders the text input and defaults to type="button"', async () => {
    const { native } = await render();
    expect(native.textContent).toContain('Save');
    expect(native.getAttribute('type')).toBe('button');
  });

  it('projects arbitrary content next to the text', async () => {
    @Component({
      imports: [OgeButton],
      template: `<oge-button>Projected</oge-button>`,
    })
    class ProjectionHost {}
    const fixture = TestBed.createComponent(ProjectionHost);
    await settle(fixture);
    const native = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-button-native',
    );
    expect(native?.textContent).toContain('Projected');
  });

  it('projects [ogeButtonIcon] into the icon slot and honours iconPosition', async () => {
    const { fixture, host, button } = await render();
    host.withIcon.set(true);
    await settle(fixture);
    const icon = button.querySelector('.oge-button-icon');
    expect(icon?.querySelector('svg')).toBeTruthy();
    expect(button.classList.contains('oge-button-icon-after')).toBe(false);

    host.iconPosition.set('after');
    await settle(fixture);
    expect(button.classList.contains('oge-button-icon-after')).toBe(true);
  });

  it('applies stylingMode, severity and size modifier classes', async () => {
    const { fixture, host, button } = await render();
    host.stylingMode.set('outlined');
    host.severity.set('danger');
    host.size.set('sm');
    await settle(fixture);
    expect(button.classList.contains('oge-button-outlined')).toBe(true);
    expect(button.classList.contains('oge-button-severity-danger')).toBe(true);
    expect(button.classList.contains('oge-button-colored')).toBe(true);
    expect(button.classList.contains('oge-button-sm')).toBe(true);

    host.stylingMode.set('text');
    host.size.set('lg');
    await settle(fixture);
    expect(button.classList.contains('oge-button-text-mode')).toBe(true);
    expect(button.classList.contains('oge-button-lg')).toBe(true);
  });

  it('disables the native button and suppresses clicks', async () => {
    const { fixture, host, button, native } = await render();
    host.disabled.set(true);
    await settle(fixture);
    expect(native.disabled).toBe(true);
    expect(button.classList.contains('oge-disabled')).toBe(true);
    native.click();
    expect(host.clicks.length).toBe(0);
  });

  it('renders hint as the native title attribute', async () => {
    const { fixture, host, native } = await render();
    host.hint.set('Saves the form');
    await settle(fixture);
    expect(native.getAttribute('title')).toBe('Saves the form');
  });

  it('renders type="submit" with useSubmitBehavior', async () => {
    const { fixture, host, native } = await render();
    host.useSubmitBehavior.set(true);
    await settle(fixture);
    expect(native.getAttribute('type')).toBe('submit');
  });

  it('forwards tabIndex and accessKey to the native button', async () => {
    const { fixture, host, native } = await render();
    host.tabIndex.set(2);
    host.accessKey.set('s');
    await settle(fixture);
    expect(native.getAttribute('tabindex')).toBe('2');
    expect(native.getAttribute('accesskey')).toBe('s');
  });

  it('emits the clicked output with the raw DOM event exactly once per click', async () => {
    const { host, native } = await render();
    native.click();
    expect(host.clicks.length).toBe(1);
    expect(host.clicks[0].event.type).toBe('click');
  });

  it('a custom color activates the colored palette with a derived soft tint', async () => {
    @Component({
      imports: [OgeButton],
      template: `<oge-button text="Custom" color="#7c3aed" />`,
    })
    class ColorHost {}
    const fixture = TestBed.createComponent(ColorHost);
    await settle(fixture);
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-button',
    ) as HTMLElement;
    expect(button.classList.contains('oge-button-colored')).toBe(true);
    expect(button.style.getPropertyValue('--oge-btn-main')).toBe('#7c3aed');
    expect(button.style.getPropertyValue('--oge-btn-soft')).toContain(
      '#7c3aed',
    );
  });

  it('focus() moves keyboard focus to the inner native button', async () => {
    const { fixture, native } = await render();
    const buttonComponent = fixture.debugElement.children[0]
      .componentInstance as OgeButton;
    buttonComponent.focus();
    expect(document.activeElement).toBe(native);
  });
});

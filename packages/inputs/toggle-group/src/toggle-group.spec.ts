import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { OgeToggleGroup } from './toggle-group';

interface Align {
  id: string;
  text: string;
  off?: boolean;
}

const ALIGNS: Align[] = [
  { id: 'left', text: 'Left' },
  { id: 'center', text: 'Center' },
  { id: 'right', text: 'Right', off: true },
  { id: 'justify', text: 'Justify' },
];

@Component({
  imports: [OgeToggleGroup],
  template: `
    <oge-toggle-group
      label="Alignment"
      [items]="items"
      displayExpr="text"
      valueExpr="id"
      disabledExpr="off"
      [selectionMode]="mode()"
      [(value)]="value"
      (selectionChanged)="changes.push($event)"
    />
  `,
})
class Host {
  readonly items = ALIGNS;
  readonly mode = signal<'single' | 'multiple'>('single');
  readonly value = signal<unknown>('center');
  readonly changes: unknown[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function segments(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-toggle-group-item'),
  );
}

function key(target: HTMLElement, name: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true }),
  );
}

describe('OgeToggleGroup', () => {
  it('single: a labelled radiogroup of radios with one roving tab stop', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const track: HTMLElement = fixture.nativeElement.querySelector(
      '.oge-toggle-group-track',
    );
    expect(track.getAttribute('role')).toBe('radiogroup');
    const label = fixture.nativeElement.querySelector(
      '.oge-toggle-group-label',
    );
    expect(track.getAttribute('aria-labelledby')).toBe(label.id);
    const buttons = segments(fixture);
    expect(buttons.map((b) => b.getAttribute('role'))).toEqual([
      'radio',
      'radio',
      'radio',
      'radio',
    ]);
    expect(buttons.map((b) => b.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
      'false',
    ]);
    expect(buttons.map((b) => b.tabIndex)).toEqual([-1, 0, -1, -1]);
    expect(buttons[2].disabled).toBe(true);
  });

  it('single: a press selects, pressing the selected segment keeps it', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    segments(fixture)[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('left');
    expect(fixture.componentInstance.changes).toEqual([
      { value: 'left', addedValues: ['left'], removedValues: ['center'] },
    ]);
    segments(fixture)[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('left');
    expect(fixture.componentInstance.changes).toHaveLength(1);
  });

  it('single: arrows move focus and selection, skipping disabled segments', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const buttons = segments(fixture);
    buttons[1].focus();
    key(buttons[1], 'ArrowRight');
    await settle(fixture);
    // 'right' is disabled — the next enabled segment is 'justify'
    expect(fixture.componentInstance.value()).toBe('justify');
    expect(document.activeElement).toBe(segments(fixture)[3]);
    key(segments(fixture)[3], 'ArrowRight'); // wraps
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('left');
    key(segments(fixture)[0], 'End');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe('justify');
  });

  it('multiple: aria-pressed toggles in items order; arrows move focus only', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.mode.set('multiple');
    fixture.componentInstance.value.set([]);
    await settle(fixture);
    const track = fixture.nativeElement.querySelector(
      '.oge-toggle-group-track',
    );
    expect(track.getAttribute('role')).toBe('group');
    segments(fixture)[3].click();
    await settle(fixture);
    segments(fixture)[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(['left', 'justify']);
    expect(
      segments(fixture).map((b) => b.getAttribute('aria-pressed')),
    ).toEqual(['true', 'false', 'false', 'true']);
    expect(segments(fixture)[0].hasAttribute('role')).toBe(false);
    key(segments(fixture)[0], 'ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(segments(fixture)[1]);
    expect(fixture.componentInstance.value()).toEqual(['left', 'justify']);
    segments(fixture)[0].click(); // pressed off
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(['justify']);
  });

  describe('forms', () => {
    @Component({
      imports: [OgeToggleGroup, ReactiveFormsModule],
      template: `
        <oge-toggle-group
          label="Alignment"
          [items]="items"
          displayExpr="text"
          valueExpr="id"
          [formControl]="control"
        />
      `,
    })
    class CvaHost {
      readonly items = ALIGNS;
      readonly control = new FormControl<string | null>(null, [
        Validators.required,
      ]);
    }

    it('binds a reactive control with validation display', async () => {
      const fixture = TestBed.createComponent(CvaHost);
      await settle(fixture);
      const control = fixture.componentInstance.control;
      const first = segments(fixture)[0];
      first.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      first.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await settle(fixture);
      expect(control.touched).toBe(true);
      expect(
        fixture.nativeElement
          .querySelector('.oge-toggle-group-error')
          ?.textContent?.trim(),
      ).toBe('This field is required');
      const track = fixture.nativeElement.querySelector(
        '.oge-toggle-group-track',
      );
      expect(track.getAttribute('aria-invalid')).toBe('true');
      expect(track.getAttribute('aria-describedby')).toBeTruthy();
      segments(fixture)[1].click();
      await settle(fixture);
      expect(control.value).toBe('center');
      control.setValue('left');
      await settle(fixture);
      expect(segments(fixture)[0].getAttribute('aria-checked')).toBe('true');
    });

    @Component({
      imports: [OgeToggleGroup, FormField],
      template: `
        <oge-toggle-group
          label="Alignment"
          [items]="items"
          displayExpr="text"
          valueExpr="id"
          [formField]="f.align"
        />
      `,
    })
    class SignalHost {
      readonly items = ALIGNS;
      readonly model = signal<{ align: unknown }>({ align: null });
      readonly f = form(this.model, (p) => {
        required(p.align);
      });
    }

    it('binds a Signal Forms field (required → aria-required)', async () => {
      const fixture = TestBed.createComponent(SignalHost);
      await settle(fixture);
      const track = fixture.nativeElement.querySelector(
        '.oge-toggle-group-track',
      );
      expect(track.getAttribute('aria-required')).toBe('true');
      segments(fixture)[3].click();
      await settle(fixture);
      expect(fixture.componentInstance.model().align).toBe('justify');
      expect(fixture.componentInstance.f.align().valid()).toBe(true);
    });
  });
});

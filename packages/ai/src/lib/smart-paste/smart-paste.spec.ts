import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideOgeAiConfig,
  type OgeAiRequest,
  type OgeAiTransport,
  type OgeGridAssistantMode,
  type OgeSmartPasteAppliedEvent,
  type OgeSmartPasteField,
  type OgeSmartPasteTarget,
} from '../config';
import { OgeSmartPaste } from './smart-paste';

class FakeForm implements OgeSmartPasteTarget {
  data: Record<string, unknown> = { name: '', seats: null, plan: 'free' };
  describeFields(): readonly OgeSmartPasteField[] {
    return [
      {
        field: 'name',
        label: 'Full name',
        dataType: 'string',
        value: this.data['name'],
      },
      {
        field: 'seats',
        label: 'Seats',
        dataType: 'number',
        value: this.data['seats'],
      },
      {
        field: 'plan',
        label: 'Plan',
        dataType: 'string',
        values: [
          { value: 'free', text: 'Free' },
          { value: 'pro', text: 'Pro' },
        ],
        value: this.data['plan'],
      },
    ];
  }
  updateData(values: Record<string, unknown>): void {
    this.data = { ...this.data, ...values };
  }
}

class ManualTransport implements OgeAiTransport {
  readonly requests: OgeAiRequest[] = [];
  private release: ((text: string) => void)[] = [];
  complete(request: OgeAiRequest) {
    this.requests.push(request);
    return new Promise<{ text: string }>((resolve) => {
      this.release.push((text) => resolve({ text }));
    });
  }
  reply(value: unknown): void {
    this.release.shift()?.(JSON.stringify(value));
  }
}

const REPLY = {
  status: 'apply',
  summary: 'Ada, 5 seats on Pro',
  values: { name: 'Ada Lovelace', seats: 5, plan: 'Pro' },
};

@Component({
  imports: [OgeSmartPaste],
  template: `
    <oge-smart-paste
      [target]="form"
      [mode]="mode()"
      [disabled]="disabled()"
      [messages]="{ label: 'Fill from clipboard' }"
      (applied)="applied.push($event)"
    />
  `,
})
class Host {
  readonly form = new FakeForm();
  readonly mode = signal<OgeGridAssistantMode>('preview');
  readonly disabled = signal(false);
  readonly paste = viewChild.required(OgeSmartPaste);
  readonly applied: OgeSmartPasteAppliedEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
}

function setup(clipboard: () => Promise<string>) {
  const transport = new ManualTransport();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { readText: clipboard },
  });
  TestBed.configureTestingModule({
    providers: [provideOgeAiConfig({ transport, locale: 'en-US' })],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = <E extends Element>(sel: string) => el.querySelector<E>(sel);
  return { fixture, host: fixture.componentInstance, q, transport };
}

describe('OgeSmartPaste', () => {
  it('reads the clipboard, shows a proposal table and applies it', async () => {
    const { fixture, host, q, transport } = setup(
      async () => 'Ada Lovelace, 5 seats, Pro plan',
    );
    const group = q('.oge-smart-paste')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Fill from clipboard');
    const trigger = q<HTMLButtonElement>('.oge-smart-paste-trigger')!;
    expect(trigger.textContent?.trim()).toBe('Fill from clipboard');
    expect(trigger.getAttribute('aria-describedby')).toBe(
      q('.oge-smart-paste-status')!.id,
    );

    trigger.click();
    await settle(fixture);
    expect(transport.requests[0].messages[1].content).toContain(
      'Ada Lovelace, 5 seats',
    );
    transport.reply(REPLY);
    await settle(fixture);

    const rows = [
      ...fixture.nativeElement.querySelectorAll(
        '.oge-smart-paste-table tbody tr',
      ),
    ].map((tr) =>
      [...(tr as HTMLElement).children].map((c) => c.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Full name', '(empty)', 'Ada Lovelace'],
      ['Seats', '(empty)', '5'],
      ['Plan', 'Free', 'Pro'],
    ]);
    expect(host.form.data['name']).toBe('');

    q<HTMLButtonElement>('.oge-smart-paste-apply')!.click();
    fixture.detectChanges();
    expect(host.form.data).toEqual({
      name: 'Ada Lovelace',
      seats: 5,
      plan: 'pro',
    });
    expect(host.applied).toHaveLength(1);
    expect(q('.oge-smart-paste-status')!.textContent?.trim()).toBe(
      '3 fields filled.',
    );
    expect(document.activeElement).toBe(q('.oge-smart-paste-trigger'));

    q<HTMLButtonElement>('.oge-smart-paste-undo')!.click();
    fixture.detectChanges();
    expect(host.form.data).toEqual({ name: '', seats: null, plan: 'free' });
  });

  it('opens the text area when the clipboard is denied, and fills from it', async () => {
    const { fixture, host, q, transport } = setup(async () => {
      throw new DOMException('denied', 'NotAllowedError');
    });
    host.mode.set('apply');
    fixture.detectChanges();
    q<HTMLButtonElement>('.oge-smart-paste-trigger')!.click();
    await settle(fixture);
    expect(q('.oge-smart-paste-status')!.textContent).toContain(
      'clipboard could not be read',
    );
    const toggle = q<HTMLButtonElement>('.oge-smart-paste-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const area = q<HTMLTextAreaElement>('.oge-smart-paste-area')!;
    expect(area.labels?.[0]?.textContent?.trim()).toBe(
      'Text to fill the form from',
    );
    expect(q<HTMLButtonElement>('.oge-smart-paste-fill')!.disabled).toBe(true);

    area.value = 'Ada, 5 seats';
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    q<HTMLButtonElement>('.oge-smart-paste-fill')!.click();
    transport.reply(REPLY);
    await settle(fixture);
    expect(host.form.data['seats']).toBe(5);
    expect(q('.oge-smart-paste-area')).toBeNull();
  });

  it('disables every control', () => {
    const { fixture, host, q } = setup(async () => '');
    host.disabled.set(true);
    fixture.detectChanges();
    expect(q<HTMLButtonElement>('.oge-smart-paste-trigger')!.disabled).toBe(
      true,
    );
    expect(q<HTMLButtonElement>('.oge-smart-paste-toggle')!.disabled).toBe(
      true,
    );
  });
});

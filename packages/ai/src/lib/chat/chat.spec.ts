import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideOgeAiConfig,
  type OgeAiRequest,
  type OgeAiTransport,
  type OgeChatMessage,
  type OgeChatSentEvent,
} from '../config';
import { OgeChat } from './chat';

class ManualTransport implements OgeAiTransport {
  readonly requests: OgeAiRequest[] = [];
  private release: ((text: string) => void)[] = [];
  complete(request: OgeAiRequest) {
    this.requests.push(request);
    return new Promise<{ text: string }>((resolve) => {
      this.release.push((text) => resolve({ text }));
    });
  }
  reply(text: string): void {
    this.release.shift()?.(text);
  }
}

@Component({
  imports: [OgeChat],
  template: `
    <oge-chat
      [transport]="transport()"
      instructions="You are the Acme bot."
      [suggestions]="['Where is my order?']"
      [(conversation)]="history"
      (sent)="sent.push($event)"
    />
  `,
})
class Host {
  readonly transport = signal<OgeAiTransport | null | undefined>(undefined);
  readonly history = signal<readonly OgeChatMessage[]>([]);
  readonly chat = viewChild.required(OgeChat);
  readonly sent: OgeChatSentEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await Promise.resolve();
  fixture.detectChanges();
}

function setup() {
  const transport = new ManualTransport();
  TestBed.configureTestingModule({
    providers: [provideOgeAiConfig({ transport })],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = <E extends Element>(sel: string) => el.querySelector<E>(sel);
  return { fixture, host: fixture.componentInstance, el, q, transport };
}

function type(field: HTMLTextAreaElement, text: string): void {
  field.value = text;
  field.dispatchEvent(new Event('input'));
}

describe('OgeChat', () => {
  it('renders a labelled log, composer and suggestions; Enter sends and the reply lands as text', async () => {
    const { fixture, host, q, el, transport } = setup();
    expect(q('.oge-chat')!.getAttribute('aria-label')).toBe('Chat');
    const log = q('.oge-chat-log')!;
    expect(log.getAttribute('role')).toBe('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(q('.oge-chat-empty')!.textContent?.trim()).toBe(
      'Start the conversation.',
    );
    const field = q<HTMLTextAreaElement>('.oge-chat-input')!;
    expect(field.getAttribute('aria-label')).toBe('Message');
    expect(q<HTMLButtonElement>('.oge-chat-send')!.disabled).toBe(true);

    type(field, 'Hello <b>there</b>');
    fixture.detectChanges();
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    expect(host.sent).toHaveLength(1);
    expect(transport.requests[0].messages[0].content).toContain(
      'You are the Acme bot.',
    );
    expect(q('.oge-chat-typing')).not.toBeNull();
    expect(q('.oge-chat-stop')).not.toBeNull();

    transport.reply('Hi! <script>x</script>');
    await settle(fixture);
    const bubbles = [...el.querySelectorAll('.oge-chat-bubble')].map((b) =>
      b.textContent?.trim(),
    );
    expect(bubbles).toEqual([
      'You: Hello <b>there</b>',
      'Assistant: Hi! <script>x</script>',
    ]);
    // text, never markup
    expect(el.querySelector('b, script')).toBeNull();
    expect(host.history().map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it('Shift+Enter keeps a new line; a suggestion sends at once; Escape stops', async () => {
    const { fixture, q, transport } = setup();
    const field = q<HTMLTextAreaElement>('.oge-chat-input')!;
    const shift = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(shift);
    expect(shift.defaultPrevented).toBe(false);

    q<HTMLButtonElement>('.oge-chat-chip')!.click();
    await settle(fixture);
    expect(transport.requests[0].messages.at(-1)?.content).toBe(
      'Where is my order?',
    );
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(q('.oge-chat-typing')).toBeNull();
  });

  it('manual mode: no transport, messages are emitted and replies added by the host', async () => {
    const { fixture, host, q, el, transport } = setup();
    host.transport.set(null);
    fixture.detectChanges();
    host.chat().send('Anyone?');
    await settle(fixture);
    expect(transport.requests).toHaveLength(0);
    host.chat().addMessage({ role: 'assistant', text: 'Ayşe here.' });
    await settle(fixture);
    expect(el.querySelectorAll('.oge-chat-message-assistant')).toHaveLength(1);
    // an outside conversation value flows in
    host.history.set([]);
    await settle(fixture);
    expect(q('.oge-chat-empty')).not.toBeNull();
  });
});

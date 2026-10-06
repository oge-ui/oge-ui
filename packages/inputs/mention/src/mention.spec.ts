import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type {
  OgeMentionSelectedEvent,
  OgeMentionToken,
  OgeMentionTrigger,
} from '@oge-ui/behavior';
import { OgeMention, OgeMentionItemTemplate } from './mention';

interface User {
  id: number;
  name: string;
}

const USERS: User[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Alan' },
  { id: 3, name: 'Grace' },
];

@Component({
  imports: [OgeMention],
  template: `
    <oge-mention
      label="Comment"
      [items]="users"
      displayExpr="name"
      valueExpr="id"
      [multiline]="multiline()"
      [(value)]="text"
      [(mentions)]="mentions"
      (mentionSelected)="selected.push($event)"
    />
  `,
})
class Host {
  readonly users = USERS;
  readonly multiline = signal(true);
  readonly text = signal('');
  readonly mentions = signal<readonly OgeMentionToken<User>[]>([]);
  readonly selected: OgeMentionSelectedEvent<User>[] = [];
}

@Component({
  imports: [OgeMention, OgeMentionItemTemplate],
  template: `
    <oge-mention label="Note" [triggers]="triggers">
      <ng-template ogeMentionItemTemplate let-item let-active="active">
        <b class="custom-row" [class.is-active]="active">{{ item.name }}!</b>
      </ng-template>
    </oge-mention>
  `,
})
class TemplateHost {
  readonly triggers: OgeMentionTrigger<User>[] = [
    { char: '@', items: USERS, displayExpr: 'name' },
    { char: '#', items: [{ id: 7, name: 'urgent' }], displayExpr: 'name' },
  ];
}

@Component({
  imports: [OgeMention, ReactiveFormsModule],
  template: `<oge-mention
    label="Comment"
    [items]="users"
    displayExpr="name"
    [formControl]="control"
  />`,
})
class FormHost {
  readonly users = USERS;
  readonly control = new FormControl('');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function field(
  fixture: ComponentFixture<unknown>,
): HTMLTextAreaElement | HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

async function type(
  fixture: ComponentFixture<unknown>,
  text: string,
): Promise<void> {
  const el = field(fixture);
  el.focus();
  el.value = text;
  el.setSelectionRange(text.length, text.length);
  el.dispatchEvent(new Event('input'));
  await settle(fixture);
}

async function key(
  fixture: ComponentFixture<unknown>,
  name: string,
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
  });
  field(fixture).dispatchEvent(event);
  await settle(fixture);
  return event;
}

function options(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('OgeMention', () => {
  it('opens a listbox after the trigger and wires aria-activedescendant', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = field(fixture);
    expect(el.tagName).toBe('TEXTAREA');
    expect(el.getAttribute('aria-autocomplete')).toBe('list');
    await type(fixture, 'Hi @a');
    const list = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(list.getAttribute('aria-label')).toBe('Suggestions');
    expect(options(fixture).map((o) => o.textContent?.trim())).toEqual([
      '@Ada',
      '@Alan',
      '@Grace',
    ]);
    expect(el.getAttribute('aria-controls')).toBe(list.id);
    expect(el.getAttribute('aria-activedescendant')).toBe(
      options(fixture)[0].id,
    );
    await key(fixture, 'ArrowDown');
    expect(el.getAttribute('aria-activedescendant')).toBe(
      options(fixture)[1].id,
    );
    expect(options(fixture)[1].getAttribute('aria-selected')).toBe('true');
  });

  it('inserts the picked suggestion as text and reports the mention', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    await type(fixture, 'Hi @gr');
    const enter = await key(fixture, 'Enter');
    expect(enter.defaultPrevented).toBe(true);
    const host = fixture.componentInstance;
    expect(host.text()).toBe('Hi @Grace ');
    expect(host.mentions()).toEqual([
      expect.objectContaining({ trigger: '@', value: 3, start: 3, end: 9 }),
    ]);
    expect(host.selected[0].item.name).toBe('Grace');
    expect(options(fixture)).toHaveLength(0);

    // editing the token drops it; editing elsewhere shifts it
    await type(fixture, 'Oh, Hi @Grace ');
    expect(host.mentions()[0].start).toBe(7);
    await type(fixture, 'Oh, Hi @Grac ');
    expect(host.mentions()).toEqual([]);
  });

  it('Escape closes the list until a new trigger is typed', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    await type(fixture, '@a');
    expect(options(fixture).length).toBeGreaterThan(0);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(options(fixture)).toHaveLength(0);
    await type(fixture, '@al');
    expect(options(fixture)).toHaveLength(0);
    await type(fixture, '@al @');
    expect(options(fixture)).toHaveLength(3);
  });

  it('ignores a trigger inside a word and Enter without suggestions', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    await type(fixture, 'mail@a');
    expect(options(fixture)).toHaveLength(0);
    const enter = await key(fixture, 'Enter');
    expect(enter.defaultPrevented).toBe(false);
  });

  it('renders a single-line combobox when multiline is off', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.multiline.set(false);
    await settle(fixture);
    const el = field(fixture);
    expect(el.tagName).toBe('INPUT');
    expect(el.getAttribute('role')).toBe('combobox');
    expect(el.getAttribute('aria-expanded')).toBe('false');
    await type(fixture, '@');
    expect(el.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking an option inserts it', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    await type(fixture, '@');
    options(fixture)[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.text()).toBe('@Alan ');
  });

  it('supports several triggers and a custom row template', async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    await settle(fixture);
    await type(fixture, '#');
    const rows = fixture.nativeElement.querySelectorAll('.custom-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toBe('urgent!');
    expect(rows[0].classList.contains('is-active')).toBe(true);
    await type(fixture, '#u @');
    expect(fixture.nativeElement.querySelectorAll('.custom-row')).toHaveLength(
      3,
    );
  });

  it('binds reactive forms', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await settle(fixture);
    await type(fixture, '@ad');
    await key(fixture, 'Tab');
    expect(fixture.componentInstance.control.value).toBe('@Ada ');
    fixture.componentInstance.control.setValue('reset');
    await settle(fixture);
    expect(field(fixture).value).toBe('reset');
  });
});

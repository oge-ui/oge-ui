import { Component, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { resetScrollLockForTests, type OgeCommand } from '@oge-ui/behavior';
import { provideOgeOverlayConfig } from '../config';
import {
  OgeCommandPalette,
  type OgeCommandExecuteEvent,
} from './command-palette';

const runs: string[] = [];
const COMMANDS: OgeCommand[] = [
  {
    id: 'new',
    label: 'New file',
    group: 'File',
    shortcut: 'Mod+N',
    icon: 'M4 4h16',
    run: () => runs.push('new'),
  },
  { id: 'save', label: 'Save all', group: 'File', disabled: true },
  {
    id: 'settings',
    label: 'Go to settings',
    group: 'Navigation',
    keywords: ['preferences'],
    description: 'Open the settings page',
  },
  { id: 'theme', label: 'Toggle theme' },
];

@Component({
  imports: [OgeCommandPalette],
  providers: [
    provideOgeOverlayConfig({ messages: { commandPaletteRecent: 'Son' } }),
  ],
  template: `
    <button id="trigger" type="button">Open</button>
    <oge-command-palette
      [commands]="commands"
      [(opened)]="opened"
      [(recent)]="recent"
      [hotkey]="hotkey()"
      [recentLimit]="3"
      (commandExecute)="onExecute($event)"
      (queryChange)="queries.push($event)"
    />
  `,
})
class Host {
  readonly commands = COMMANDS;
  readonly opened = signal(false);
  readonly recent = signal<readonly string[]>([]);
  readonly hotkey = signal<string | null>('Mod+K');
  readonly palette = viewChild.required(OgeCommandPalette);
  readonly executed: string[] = [];
  readonly queries: string[] = [];
  keepOpen = false;
  onExecute(event: OgeCommandExecuteEvent): void {
    event.keepOpen = this.keepOpen;
    this.executed.push(event.command.id);
  }
}

async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const panel = () =>
  document.body.querySelector('.oge-command-palette') as HTMLElement | null;
const input = () =>
  document.body.querySelector('.oge-command-palette-input') as HTMLInputElement;
const options = () =>
  Array.from(
    document.body.querySelectorAll('[role="option"]'),
  ) as HTMLElement[];
const labels = () =>
  options().map((o) =>
    o.querySelector('.oge-command-palette-label')!.textContent!.trim(),
  );
const key = (el: Element | Document, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: k,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );

describe('OgeCommandPalette', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    runs.length = 0;
    resetScrollLockForTests();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  async function type(text: string): Promise<void> {
    input().value = text;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
  }

  it('opens on Ctrl+K as a labelled modal combobox over a listbox', async () => {
    expect(panel()).toBeNull();
    const trigger = document.getElementById('trigger') as HTMLButtonElement;
    trigger.focus();
    key(document, 'k', { ctrlKey: true });
    await settle(fixture);
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    expect(host.opened()).toBe(true);
    const dialog = panel()!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Command palette');
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.activeElement).toBe(input());
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().placeholder).toBe('Type a command or search…');
    const list = document.getElementById(
      input().getAttribute('aria-controls')!,
    )!;
    expect(list.getAttribute('role')).toBe('listbox');
    expect(labels()).toEqual([
      'New file',
      'Save all',
      'Go to settings',
      'Toggle theme',
    ]);
    const groups = list.querySelectorAll('[role="group"]');
    expect(groups).toHaveLength(3);
    const fileLabel = document.getElementById(
      groups[0].getAttribute('aria-labelledby')!,
    );
    expect(fileLabel?.textContent?.trim()).toBe('File');
    expect(groups[2].hasAttribute('aria-labelledby')).toBe(false);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[0].id);
    expect(options()[1].getAttribute('aria-disabled')).toBe('true');
    expect(
      options()[0].querySelector('.oge-command-palette-shortcut')!.textContent,
    ).toMatch(/N$/);
    expect(
      options()[2].querySelector('.oge-command-palette-description')!
        .textContent,
    ).toBe('Open the settings page');
    // the hotkey closes it again, and focus goes back
    key(document, 'k', { ctrlKey: true });
    await settle(fixture);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('filters, highlights, announces and runs with the keyboard', async () => {
    host.palette().open();
    await settle(fixture);
    await type('pref');
    expect(labels()).toEqual(['Go to settings']);
    await type('tog');
    // the prefix hit ranks first; 'to' + 'g' still finds the settings
    expect(labels()).toEqual(['Toggle theme', 'Go to settings']);
    const mark = options()[0].querySelector('mark')!;
    expect(mark.textContent).toBe('Tog');
    expect(document.querySelector('[role="status"]')!.textContent).toBe(
      '2 results',
    );
    await type('zzz');
    expect(options()).toHaveLength(0);
    expect(
      document.querySelector('.oge-command-palette-empty')!.textContent,
    ).toContain('No matching commands');
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
    expect(document.querySelector('[role="status"]')!.textContent).toBe(
      'No results',
    );
    await type('');
    expect(host.queries).toEqual(['pref', 'tog', 'zzz', '']);
    key(input(), 'ArrowDown'); // skips the disabled "Save all"
    await settle(fixture);
    expect(options()[2].getAttribute('aria-selected')).toBe('true');
    key(input(), 'ArrowUp');
    await settle(fixture);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    key(input(), 'End', { ctrlKey: true });
    await settle(fixture);
    expect(options()[3].getAttribute('aria-selected')).toBe('true');
    key(input(), 'Home'); // plain Home stays with the text box
    key(input(), 'Home', { ctrlKey: true });
    await settle(fixture);
    key(input(), 'Enter');
    await settle(fixture);
    expect(runs).toEqual(['new']);
    expect(host.executed).toEqual(['new']);
    expect(host.opened()).toBe(false);
    expect(host.recent()).toEqual(['new']);
  });

  it('lists recent commands first, keeps open on request and runs on click', async () => {
    host.recent.set(['theme']);
    host.palette().open();
    await settle(fixture);
    expect(labels()[0]).toBe('Toggle theme');
    expect(
      document
        .querySelector('.oge-command-palette-group-label')!
        .textContent!.trim(),
    ).toBe('Son');
    host.keepOpen = true;
    options()[3].dispatchEvent(new Event('pointermove'));
    await settle(fixture);
    expect(options()[3].getAttribute('aria-selected')).toBe('true');
    options()[2].dispatchEvent(new Event('pointermove')); // disabled: ignored
    await settle(fixture);
    expect(options()[3].getAttribute('aria-selected')).toBe('true');
    options()[2].click(); // disabled: nothing
    options()[3].click();
    await settle(fixture);
    expect(host.executed).toEqual(['settings']);
    expect(host.opened()).toBe(true);
    expect(host.recent()).toEqual(['settings', 'theme']);
    // Escape dismisses
    key(input(), 'Escape');
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('toggles from the API, ignores the hotkey when turned off, and closes on a backdrop press', async () => {
    host.hotkey.set(null);
    await settle(fixture);
    key(document, 'k', { ctrlKey: true });
    await settle(fixture);
    expect(host.opened()).toBe(false);
    host.palette().toggle();
    await settle(fixture);
    host.palette().open(); // already open: no-op
    await settle(fixture);
    expect(panel()).not.toBeNull();
    const layer = document.querySelector('.oge-command-palette-layer')!;
    layer.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(host.opened()).toBe(false);
    host.palette().toggle();
    await settle(fixture);
    host.palette().toggle();
    await settle(fixture);
    expect(panel()).toBeNull();
  });
});

import { demoSource } from '../../shared/demo-source';

const COMMANDS = `protected readonly commands: OgeCommand[] = [
  { id: 'new-invoice', label: 'New invoice', group: 'Create', shortcut: 'Mod+Alt+N' },
  { id: 'new-customer', label: 'New customer', group: 'Create', keywords: ['client'] },
  { id: 'go-dashboard', label: 'Go to dashboard', group: 'Navigate', keywords: ['home'] },
  {
    id: 'go-reports',
    label: 'Go to reports',
    group: 'Navigate',
    description: 'Sales, stock and cash flow',
  },
  {
    id: 'go-settings',
    label: 'Go to settings',
    group: 'Navigate',
    keywords: ['preferences'],
    shortcut: 'Mod+,',
  },
  { id: 'toggle-theme', label: 'Toggle dark theme', group: 'Preferences' },
  { id: 'export-pdf', label: 'Export as PDF', group: 'Preferences', disabled: true },
];`;

export const COMMAND_PALETTE_BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeCommandPalette'] },
  types: { '@oge-ui/overlay': ['OgeCommand', 'OgeCommandExecuteEvent'] },
  template: `<!-- The default hotkey is Mod+K (Ctrl+K, or ⌘K on a Mac); this site
     uses Ctrl+K for its own search, so the demo takes Mod+/. -->
<button type="button" (click)="palette.open()">Open the palette</button>
<oge-command-palette
  #palette
  [commands]="commands"
  hotkey="Mod+/"
  (commandExecute)="ran($event)"
/>
<p>{{ last() }}</p>`,
  body: `protected readonly last = signal('Nothing run yet');
${COMMANDS}

protected ran(event: OgeCommandExecuteEvent): void {
  this.last.set(\`Ran "\${event.command.label}"\`);
}`,
});

export const COMMAND_PALETTE_RECENT_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeCommandPalette'] },
  types: { '@oge-ui/overlay': ['OgeCommand', 'OgeCommandExecuteEvent'] },
  template: `<!-- [(recent)] is two-way: store it to keep the "Recent" section across
     visits. keepOpen leaves the palette open for repeatable commands. -->
<button type="button" (click)="palette.open()">Open with recent commands</button>
<oge-command-palette
  #palette
  [commands]="counterCommands"
  [(recent)]="recent"
  [recentLimit]="3"
  [hotkey]="null"
  placeholder="Search counter commands…"
  (commandExecute)="run($event)"
/>
<p>Count: {{ count() }} · recent: {{ recent().join(', ') || 'none' }}</p>`,
  body: `protected readonly count = signal(0);
protected readonly recent = signal<readonly string[]>([]);
protected readonly counterCommands: OgeCommand[] = [
  { id: 'increment', label: 'Increment', description: 'Keeps the palette open' },
  { id: 'decrement', label: 'Decrement', description: 'Keeps the palette open' },
  { id: 'reset', label: 'Reset the counter' },
];

protected run(event: OgeCommandExecuteEvent): void {
  const id = event.command.id;
  if (id === 'reset') this.count.set(0);
  else this.count.update((n) => n + (id === 'increment' ? 1 : -1));
  event.keepOpen = id !== 'reset';
}`,
});

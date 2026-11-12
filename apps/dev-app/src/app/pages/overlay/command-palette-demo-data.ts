import type { OgeCommand } from '@oge-ui/overlay';

/** The commands both render layers' command palette demos list. */
export const COMMAND_PALETTE_COMMANDS: OgeCommand[] = [
  {
    id: 'new-invoice',
    label: 'New invoice',
    group: 'Create',
    shortcut: 'Mod+Alt+N',
    icon: 'M12 5v14M5 12h14',
  },
  {
    id: 'new-customer',
    label: 'New customer',
    group: 'Create',
    keywords: ['client', 'account'],
    icon: 'M12 5v14M5 12h14',
  },
  {
    id: 'go-dashboard',
    label: 'Go to dashboard',
    group: 'Navigate',
    keywords: ['home', 'overview'],
    icon: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z',
  },
  {
    id: 'go-reports',
    label: 'Go to reports',
    group: 'Navigate',
    description: 'Sales, stock and cash flow',
    icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  },
  {
    id: 'go-settings',
    label: 'Go to settings',
    group: 'Navigate',
    keywords: ['preferences', 'options'],
    shortcut: 'Mod+,',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  },
  {
    id: 'toggle-theme',
    label: 'Toggle dark theme',
    group: 'Preferences',
    keywords: ['appearance', 'night'],
    icon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  },
  {
    id: 'export-pdf',
    label: 'Export as PDF',
    group: 'Preferences',
    disabled: true,
    description: 'Needs an open document',
  },
];

/** The counter demo: two repeatable commands that keep the palette open. */
export const COMMAND_PALETTE_COUNTER_COMMANDS: OgeCommand[] = [
  {
    id: 'increment',
    label: 'Increment',
    description: 'Keeps the palette open',
  },
  {
    id: 'decrement',
    label: 'Decrement',
    description: 'Keeps the palette open',
  },
  { id: 'reset', label: 'Reset the counter' },
];

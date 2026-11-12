import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React command palette page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node. Section-for-section mirror of `../overlay/command-palette.ts`.
 */
const COMMANDS = `const commands: OgeCommand[] = [
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

const COUNTER = `const counterCommands: OgeCommand[] = [
  { id: 'increment', label: 'Increment', description: 'Keeps the palette open' },
  { id: 'decrement', label: 'Decrement', description: 'Keeps the palette open' },
  { id: 'reset', label: 'Reset the counter' },
];`;

export const OVERLAY_COMMAND_PALETTE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics',
    description:
      'Commands carry a label, an optional group, keywords, description, shortcut and icon; a disabled one is listed but never runs. The default hotkey is Mod+K; this site uses Ctrl+K for its search, so the demo listens for Mod+/.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-overlay': ['OgeCommandPalette'] },
      types: {
        '@oge-ui/react-overlay': ['OgeCommand', 'OgeCommandPaletteHandle'],
      },
      name: 'CommandPaletteBasicsDemo',
      before: COMMANDS,
      body: `const palette = useRef<OgeCommandPaletteHandle>(null);
const [last, setLast] = useState('Nothing run yet');`,
      jsx: `<>
  <button type="button" onClick={() => palette.current?.open()}>
    Open the palette
  </button>
  <OgeCommandPalette
    ref={palette}
    commands={commands}
    hotkey="Mod+/"
    onCommandExecute={(e) => setLast(\`Ran "\${e.command.label}"\`)}
  />
  <p>{last}</p>
</>`,
    }),
  },
  {
    title: 'Recent commands & keepOpen',
    description:
      'recent / onRecentChange keep the "Recent" section — persist them to keep it across visits. A handler that sets keepOpen leaves the palette open, for commands people repeat.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-overlay': ['OgeCommandPalette'] },
      types: {
        '@oge-ui/react-overlay': [
          'OgeCommand',
          'OgeCommandExecuteEvent',
          'OgeCommandPaletteHandle',
        ],
      },
      name: 'CommandPaletteRecentDemo',
      before: COUNTER,
      body: `const palette = useRef<OgeCommandPaletteHandle>(null);
const [count, setCount] = useState(0);
const [recent, setRecent] = useState<readonly string[]>([]);
const run = (event: OgeCommandExecuteEvent) => {
  const id = event.command.id;
  setCount((n) => (id === 'reset' ? 0 : n + (id === 'increment' ? 1 : -1)));
  event.keepOpen = id !== 'reset';
};`,
      jsx: `<>
  <button type="button" onClick={() => palette.current?.open()}>
    Open with recent commands
  </button>
  <OgeCommandPalette
    ref={palette}
    commands={counterCommands}
    recent={recent}
    onRecentChange={setRecent}
    recentLimit={3}
    hotkey={null}
    placeholder="Search counter commands…"
    onCommandExecute={run}
  />
  <p>
    Count: {count} · recent: {recent.join(', ') || 'none'}
  </p>
</>`,
    }),
  },
];

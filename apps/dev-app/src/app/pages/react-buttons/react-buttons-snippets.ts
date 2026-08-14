import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React buttons pages. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirrors of the Angular pages' demos
 * (`../buttons/*-snippets.ts`), per the parity standard
 * (`docs/REACT-PARITY.md`): same headings, same example content, React idiom.
 */

// ── Overview (mirrors buttons/overview.ts) ─────────────────────────────────

export const BUTTON_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Severities & styling modes',
    description:
      'Five semantic severities map straight to the design tokens, so every theme restyles them automatically. Each severity combines with three fill styles — contained (solid, the default), outlined and text.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      name: 'VariantsDemo',
      jsx: `<div className="demo-row">
  <OgeButton text="Contained" severity="accent" />
  <OgeButton text="Outlined" severity="accent" stylingMode="outlined" />
  <OgeButton text="Text" severity="accent" stylingMode="text" />
  <OgeButton text="Success" severity="success" />
  <OgeButton text="Warning" severity="warning" />
  <OgeButton text="Danger" severity="danger" />
  <OgeButton text="Normal" />
  <OgeButton text="Disabled" disabled />
</div>`,
    }),
  },
  {
    title: 'Sizes',
    description:
      'Three presets — sm (28px), md (34px, default) and lg (42px). The scale is shared with the input editors, so a button placed next to a text box of the same size lines up pixel-perfect in form rows.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      name: 'SizesDemo',
      jsx: `<div className="demo-row">
  <OgeButton text="Small" size="sm" />
  <OgeButton text="Medium" />
  <OgeButton text="Large" size="lg" />
  <OgeButton text="Small outlined" size="sm" severity="accent" stylingMode="outlined" />
</div>`,
    }),
  },
  {
    title: 'Icons',
    description:
      'There is no icon-font dependency: pass any inline SVG as the icon prop and it inherits the button’s color. iconPosition places it before or after the label. Icon-only buttons must provide an accessible name via ariaLabel (or a hint tooltip).',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      name: 'IconsDemo',
      before: `const downloadIcon = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const nextIcon = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);`,
      jsx: `<div className="demo-row">
  <OgeButton text="Download" severity="accent" icon={downloadIcon} />
  <OgeButton text="Next" iconPosition="after" stylingMode="outlined" icon={nextIcon} />
  <OgeButton ariaLabel="Settings" hint="Settings" stylingMode="text" icon={nextIcon} />
</div>`,
    }),
  },
  {
    title: 'Custom colors',
    description:
      'The color prop accepts any CSS color and overrides the severity palette for that one button — the hover shade and focus ring derive automatically. For brand-wide changes, override the --oge-* tokens instead.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      name: 'ColorsDemo',
      jsx: `<div className="demo-row">
  <OgeButton text="Purple" color="#7c3aed" />
  <OgeButton text="Teal" color="#0d9488" stylingMode="outlined" />
  <OgeButton text="Pink" color="#db2777" stylingMode="text" />
  <OgeButton
    text="Brand token"
    severity="accent"
    style={{ '--oge-accent': '#ea580c', '--oge-accent-soft': 'rgba(234, 88, 12, 0.14)' } as CSSProperties}
  />
</div>`,
      react: ['type CSSProperties'],
    }),
  },
  {
    title: 'Badges',
    description:
      'A number or string renders a pill in the button’s corner; numbers cap at 99+. The value joins the button’s accessible name through a visually hidden span, so screen readers announce it. Passing true renders a plain attention dot instead.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      name: 'BadgesDemo',
      jsx: `<div className="demo-row">
  <OgeButton text="Inbox" badge={7} />
  <OgeButton text="Alerts" badge={120} severity="accent" stylingMode="outlined" />
  <OgeButton text="Live" badge stylingMode="text" />
</div>`,
    }),
  },
];

// ── Interactions (mirrors buttons/interactions.ts) ─────────────────────────

export const INTERACTION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Async actions & loading',
    description:
      'Bind a promise-returning function to action and the button manages the async lifecycle: loading on, self-disabled, single-flight, then onActionDone / onActionFailed.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      react: ['useState'],
      name: 'AsyncActionsDemo',
      before: `const save = () => new Promise((resolve) => setTimeout(resolve, 1500));
const fail = () =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('nope')), 1000));`,
      body: `const [saved, setSaved] = useState(0);
const [failed, setFailed] = useState(0);`,
      jsx: `<div className="demo-row">
  <OgeButton text="Save changes" severity="accent" action={save} onActionDone={() => setSaved(saved + 1)} />
  <OgeButton
    text="Fails after 1s"
    severity="danger"
    stylingMode="outlined"
    action={fail}
    onActionFailed={() => setFailed(failed + 1)}
  />
  <span>saved ×{saved} · failed ×{failed}</span>
</div>`,
    }),
  },
  {
    title: 'Click guard',
    description:
      'Rate-limits onClick against double submissions and spam. true is a ready-made 500ms throttle; { mode: "debounce", ms } waits for the clicks to stop and fires once. The guard also applies to hold completions and auto-repeat ticks.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      react: ['useState'],
      name: 'ClickGuardDemo',
      body: `const [throttled, setThrottled] = useState(0);
const [debounced, setDebounced] = useState(0);`,
      jsx: `<div className="demo-row">
  <OgeButton text="Throttled" clickGuard onClick={() => setThrottled(throttled + 1)} />
  <OgeButton
    text="Debounced 400ms"
    stylingMode="outlined"
    clickGuard={{ mode: 'debounce', ms: 400 }}
    onClick={() => setDebounced(debounced + 1)}
  />
  <span>throttled ×{throttled} · debounced ×{debounced}</span>
</div>`,
    }),
  },
  {
    title: 'Hold to confirm',
    description:
      'Arms destructive actions behind an uninterrupted press: a fill sweeps across the button while held — releasing after it fills fires onClick. Quick taps do nothing; Escape aborts; keyboard users hold Space or Enter.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      react: ['useState'],
      name: 'HoldToConfirmDemo',
      body: `const [deletions, setDeletions] = useState(0);`,
      jsx: `<div className="demo-row">
  <OgeButton
    text="Delete account"
    severity="danger"
    holdToConfirm={{ ms: 1200 }}
    onClick={() => setDeletions(deletions + 1)}
  />
  <span>confirmed ×{deletions}</span>
</div>`,
    }),
  },
  {
    title: 'Auto-repeat',
    description:
      'For spinner and counter buttons: holding re-fires onClick — once immediately, then repeatedly after delayMs at intervalMs. Mutually exclusive with holdToConfirm (hold wins).',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton'] },
      react: ['useState'],
      name: 'AutoRepeatDemo',
      body: `const [value, setValue] = useState(0);`,
      jsx: `<div className="demo-row">
  <OgeButton
    text="−"
    hint="Decrement"
    size="sm"
    autoRepeat={{ delayMs: 400, intervalMs: 80 }}
    onClick={() => setValue((n) => n - 1)}
  />
  <output>{value}</output>
  <OgeButton
    text="+"
    hint="Increment"
    size="sm"
    autoRepeat={{ delayMs: 400, intervalMs: 80 }}
    onClick={() => setValue((n) => n + 1)}
  />
</div>`,
    }),
  },
];

// ── Button group (mirrors buttons/button-group.ts) ─────────────────────────

export const BUTTON_GROUP_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Single selection (radio pattern)',
    description:
      'One segment stays selected at all times, exactly like a radio group: role="radiogroup", role="radio" children with aria-checked, and arrow keys move focus and selection together.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton', 'OgeButtonGroup'] },
      react: ['useState'],
      name: 'SingleSelectionDemo',
      body: `const [align, setAlign] = useState<readonly string[]>(['left']);`,
      jsx: `<div className="demo-row">
  <OgeButtonGroup
    selectionMode="single"
    selectedKeys={align}
    onSelectionChange={({ selectedKeys }) => setAlign(selectedKeys)}
    ariaLabel="Text alignment"
  >
    <OgeButton value="left" text="Left" />
    <OgeButton value="center" text="Center" />
    <OgeButton value="right" text="Right" />
  </OgeButtonGroup>
  <span>selected: {align.join(', ') || '—'}</span>
</div>`,
    }),
  },
  {
    title: 'Multiple selection (toggle buttons)',
    description:
      'Each segment toggles independently (aria-pressed semantics) — the classic text-formatting toolbar. onSelectionChange reports the full state plus addedKeys/removedKeys diffs.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButton', 'OgeButtonGroup'] },
      react: ['useState'],
      name: 'MultipleSelectionDemo',
      body: `const [styles, setStyles] = useState<readonly string[]>(['bold']);`,
      jsx: `<div className="demo-row">
  <OgeButtonGroup
    selectionMode="multiple"
    selectedKeys={styles}
    onSelectionChange={({ selectedKeys }) => setStyles(selectedKeys)}
    stylingMode="outlined"
    ariaLabel="Text styles"
  >
    <OgeButton value="bold" text="B" hint="Bold" />
    <OgeButton value="italic" text="I" hint="Italic" />
    <OgeButton value="underline" text="U" hint="Underline" />
  </OgeButtonGroup>
  <span>active: {styles.join(', ') || '—'}</span>
</div>`,
    }),
  },
  {
    title: 'Data-driven items',
    description:
      'When the segments come from data, pass an items array instead of (or in addition to) declarative children. The group’s stylingMode, severity and size cascade into every child unless the child overrides them.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeButtonGroup'] },
      types: { '@oge-ui/react-buttons': ['OgeButtonGroupItem'] },
      react: ['useState'],
      name: 'DataDrivenDemo',
      before: `const periods: readonly OgeButtonGroupItem[] = [
  { value: 'day', text: 'Day' },
  { value: 'week', text: 'Week' },
  { value: 'month', text: 'Month' },
  { value: 'year', text: 'Year', disabled: true },
];`,
      body: `const [period, setPeriod] = useState<readonly string[]>(['week']);`,
      jsx: `<div className="demo-row">
  <OgeButtonGroup
    selectionMode="single"
    items={periods}
    selectedKeys={period}
    onSelectionChange={({ selectedKeys }) => setPeriod(selectedKeys)}
    size="sm"
    ariaLabel="Period"
  />
  <span>period: {period.join(', ') || '—'}</span>
</div>`,
    }),
  },
];

// ── Drop-down button (mirrors buttons/drop-down-button.ts) ─────────────────

export const DROP_DOWN_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Menu button',
    description:
      'The WAI-ARIA menu-button pattern: the trigger toggles an anchored menu; onItemClick reports the pick and the panel closes. Import @oge-ui/react-overlay/styles.css once for the panel chrome.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeDropDownButton'] },
      types: { '@oge-ui/react-buttons': ['OgeMenuItem'] },
      name: 'MenuButtonDemo',
      before: `const exportItems: readonly OgeMenuItem[] = [
  { text: 'CSV', value: 'csv' },
  { text: 'Excel', value: 'xlsx' },
  { separator: true, text: '' },
  { text: 'PDF', value: 'pdf', disabled: true },
];`,
      jsx: `<OgeDropDownButton
  text="Export"
  items={exportItems}
  onItemClick={({ item }) => console.log(item.value)}
/>`,
    }),
  },
  {
    title: 'Lazy items',
    description:
      'A function source is invoked on first open and cached until its reference changes; loading, empty and error rows render inside the panel while it settles.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeDropDownButton'] },
      react: ['useCallback'],
      name: 'LazyItemsDemo',
      body: `const loadTargets = useCallback(async () => {
  const response = await fetch('/api/run-targets');
  return await response.json();
}, []);`,
      jsx: `<OgeDropDownButton text="Deploy" items={loadTargets} />`,
    }),
  },
  {
    title: 'Split button with a remembered action',
    description:
      'splitButton renders an independent action main button beside the chevron toggle; rememberLastAction turns the last picked item into the main button’s label and action — the IDE “Run” pattern.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeDropDownButton'] },
      types: { '@oge-ui/react-buttons': ['OgeMenuItem'] },
      name: 'SplitButtonDemo',
      before: `const runTargets: readonly OgeMenuItem[] = [
  { text: 'Run tests', action: () => fetch('/api/run?suite=tests', { method: 'POST' }) },
  { text: 'Run lint', action: () => fetch('/api/run?suite=lint', { method: 'POST' }) },
];`,
      jsx: `<OgeDropDownButton
  text="Run"
  severity="accent"
  splitButton
  rememberLastAction
  items={runTargets}
/>`,
    }),
  },
];

import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React tooltip & context menu page. Pure data, no
 * React imports — the `llms.txt` generator and the compile gate load this
 * module in plain Node.
 *
 * Section-for-section mirror of `../overlay/tooltip-context-menu.ts`.
 */
export const OVERLAY_TOOLTIP_CONTEXT_MENU_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Tooltip basics',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgeTooltip'],
      },
      name: 'TooltipDemo',
      jsx: `<>
  {/* any element becomes a tooltip trigger */}
  <OgeTooltip text="Saves your changes">
    <OgeButton text="Save" />
  </OgeTooltip>
  <OgeTooltip text="Plain elements work too">
    <button type="button">Hover me</button>
  </OgeTooltip>
  {/* shows on hover after a dwell, immediately on keyboard focus;
      hides on leave, blur or Escape; wired to aria-describedby */}
</>`,
    }),
  },
  {
    title: 'Tooltip placement & delays',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgeOverlayConfigProvider', 'OgeTooltip'],
      },
      name: 'TooltipOptionsDemo',
      jsx: `// application-wide defaults
<OgeOverlayConfigProvider config={{ tooltipShowDelayMs: 300, tooltipHideDelayMs: 150 }}>
  <OgeTooltip text="Prefers the bottom edge" placement="bottom">
    <OgeButton text="Below" />
  </OgeTooltip>
  <OgeTooltip text="Waits 800ms before showing" showDelay={800}>
    <OgeButton text="Slow" />
  </OgeTooltip>
  <OgeTooltip text="Never appears" disabled>
    <OgeButton text="Muted" />
  </OgeTooltip>
</OgeOverlayConfigProvider>`,
    }),
  },
  {
    title: 'Context menu',
    source: reactDemoSource({
      use: { '@oge-ui/react-overlay': ['OgeContextMenu'] },
      types: { '@oge-ui/react-overlay': ['OgeMenuItem'] },
      name: 'ContextMenuDemo',
      before: `// the canonical OgeMenuItem model: separators, checked state,
// danger severity, per-item actions
const rowMenu: OgeMenuItem[] = [
  { text: 'Open', value: 'open' },
  { text: 'Duplicate', value: 'duplicate' },
  { separator: true, text: '' },
  { text: 'Delete', value: 'delete', severity: 'danger' },
];`,
      jsx: `<OgeContextMenu items={rowMenu}>
  <div tabIndex={0}>Right-click me (or press Shift+F10)</div>
</OgeContextMenu>`,
    }),
  },
  {
    title: 'Context menu events',
    source: reactDemoSource({
      use: { '@oge-ui/react-overlay': ['OgeContextMenu'] },
      types: { '@oge-ui/react-overlay': ['OgeMenuItem'] },
      name: 'ContextMenuEventsDemo',
      before: `const menu: OgeMenuItem[] = [
  { text: 'Open', value: 'open' },
  { text: 'Delete', value: 'delete', severity: 'danger' },
];`,
      body: `// event: { item, index, event } — the same payload as <OgeMenuList>
const run = (command: unknown) => console.log('run', command);
const log = (phase: string) => console.log(phase);`,
      jsx: `<OgeContextMenu
  items={menu}
  ariaLabel="File actions"
  onItemClick={(event) => run(event.item.value)}
  onOpened={() => log('opened')}
  onClosed={() => log('closed')}
>
  <div tabIndex={0}>File: quarterly-report.xlsx</div>
</OgeContextMenu>`,
    }),
  },
];

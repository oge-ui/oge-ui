import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React window page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../overlay/window.ts`.
 */
export const OVERLAY_WINDOW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgeWindow'],
      },
      name: 'BasicWindow',
      body: `const [opened, setOpened] = useState(false);`,
      jsx: `<>
  <OgeButton text="Open window" onClick={() => setOpened(true)} />

  {/* non-modal: no backdrop, no focus trap, no scroll lock */}
  <OgeWindow title="Quick notes" opened={opened} onOpenedChange={setOpened} width={360}>
    <textarea aria-label="Notes" />
  </OgeWindow>
</>`,
    }),
  },
  {
    title: 'Multiple windows & stacking',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeWindow'] },
      name: 'StackedWindows',
      body: `const [inspector, setInspector] = useState(true);
const [layers, setLayers] = useState(true);
const [log, setLog] = useState(true);
const [active, setActive] = useState('');`,
      jsx: `<>
  {/* any number at once; a press or focus brings one to the front */}
  <OgeWindow title="Inspector" opened={inspector} onOpenedChange={setInspector}
             placement="top-start" onActivated={() => setActive('Inspector')} />
  <OgeWindow title="Layers" opened={layers} onOpenedChange={setLayers}
             placement="top-end" onActivated={() => setActive('Layers')} />
  <OgeWindow title="Console" opened={log} onOpenedChange={setLog}
             placement="bottom" zIndex={2000} onActivated={() => setActive('Console')} />
  <p>active: {active}</p>
</>`,
    }),
  },
  {
    title: 'Drag & resize (keyboard too)',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeWindow'] },
      types: {
        '@oge-ui/react-overlay': [
          'OgeWindowMovedEvent',
          'OgeWindowResizedEvent',
        ],
      },
      name: 'DraggableWindow',
      body: `const [opened, setOpened] = useState(false);

const onMoved = (event: OgeWindowMovedEvent) =>
  console.log(event.x, event.y, event.source); // 'pointer' | 'keyboard' | 'api'
const onResized = (event: OgeWindowResizedEvent) =>
  console.log(event.width, event.height, event.edge);`,
      jsx: `<>
  {/* title bar drags, eight edge handles resize; with the frame focused:
      arrows move (10px, Shift 1px), Ctrl/⌘+arrows resize */}
  <OgeWindow
    title="Drag me"
    opened={opened}
    onOpenedChange={setOpened}
    minWidth={260}
    minHeight={160}
    maxWidth={640}
    onMoved={onMoved}
    onResized={onResized}
  />
</>`,
    }),
  },
  {
    title: 'Minimize / maximize',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeWindow'] },
      types: {
        '@oge-ui/react-overlay': [
          'OgeWindowState',
          'OgeWindowStateChangingEvent',
        ],
      },
      name: 'ReportWindow',
      body: `const [opened, setOpened] = useState(false);
const [state, setState] = useState<OgeWindowState>('normal');
const [locked] = useState(false);

// cancelable, like every -ing event
const onStateChanging = (event: OgeWindowStateChangingEvent) => {
  if (event.state === 'maximized' && locked) event.cancel = true;
};`,
      jsx: `<>
  {/* title-bar buttons, a title-bar double-click, Alt+↑ / Alt+↓,
      the controlled state pair or the handle's minimize() / maximize() / restore() */}
  <OgeWindow
    title="Report"
    opened={opened}
    onOpenedChange={setOpened}
    state={state}
    onStateChange={setState}
    onStateChanging={onStateChanging}
  />
</>`,
    }),
  },
  {
    title: 'Placement & constraints',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeWindow'] },
      types: { '@oge-ui/react-overlay': ['OgeWindowPlacement'] },
      name: 'PlacedWindows',
      body: `const [opened, setOpened] = useState(false);
const [pinned, setPinned] = useState(false);
const [placement] = useState<OgeWindowPlacement>('bottom-end');
const [contained] = useState(true);`,
      jsx: `<>
  {/* placement applies when there is no position; start/end mirror in RTL.
      keepInViewport={false} lets the window hang off the edges, but the
      title bar always stays reachable */}
  <OgeWindow title="Placed window" opened={opened} onOpenedChange={setOpened}
             placement={placement} keepInViewport={contained} />

  {/* an explicit position (viewport px) wins and moves it when it changes */}
  <OgeWindow title="Pinned" opened={pinned} onOpenedChange={setPinned}
             position={{ x: 24, y: 96 }} />
</>`,
    }),
  },
  {
    title: 'Events',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeWindow'] },
      types: {
        '@oge-ui/react-overlay': [
          'OgeWindowClosingEvent',
          'OgeWindowClosedEvent',
        ],
      },
      name: 'EventLogWindow',
      body: `const [opened, setOpened] = useState(false);
const log = (entry: string) => console.log(entry);

// Escape (focus inside, no popup open), ✕ and close() — all cancelable
const onClosing = (event: OgeWindowClosingEvent) => log(\`closing (\${event.reason})\`);
const onClosed = (event: OgeWindowClosedEvent) => log(\`closed (\${event.reason})\`);`,
      jsx: `<OgeWindow
  title="Event log"
  opened={opened}
  onOpenedChange={setOpened}
  onOpening={() => log('opening')}
  onClosing={onClosing}
  onClosed={onClosed}
  onMoved={() => log('moved')}
  onResized={() => log('resized')}
  onStateChanged={() => log('stateChanged')}
  onActivated={() => log('activated')}
/>`,
    }),
  },
];

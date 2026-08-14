import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React tabs overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../tabs/overview.ts`, per the parity standard
 * (`docs/REACT-PARITY.md`): same nine sections, same order, same example
 * content, React idiom.
 */
export const TABS_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Declarative tabs',
    description:
      'The tabs prop is the React counterpart of the projected <oge-tab> children: each entry carries its own content. selectedIndex + onSelectedIndexChange is the controlled pair; a user gesture first fires the cancelable onSelectionChanging, then onSelectionChanged. Disabled tabs are skipped by clicks and arrow keys.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-tabs': ['OgeTabPanel'] },
      types: { '@oge-ui/react-tabs': ['OgeTabSelectionChangedEvent'] },
      name: 'DeclarativeTabsDemo',
      body: `const [index, setIndex] = useState(0);
const [lastChange, setLastChange] = useState<OgeTabSelectionChangedEvent | null>(null);`,
      jsx: `<>
  <OgeTabPanel
    selectedIndex={index}
    onSelectedIndexChange={setIndex}
    onSelectionChanged={setLastChange}
    tabs={[
      { text: 'Overview', content: <p>Project overview — selected index: {index}</p> },
      { text: 'Activity', content: <p>Latest activity feed…</p> },
      { text: 'Settings', disabled: true, content: <p>Settings…</p> },
    ]}
  />
  {lastChange && (
    <p className="mt-2 text-sm opacity-70">
      selectionChanged → index {lastChange.index} (from {lastChange.previousIndex})
    </p>
  )}
</>`,
    }),
  },
  {
    title: 'Data-driven items',
    description:
      'The items array drives the strip; selectedKey + onSelectedKeyChange selects by identity, so the selection survives reordering and insertions. badge renders a counter, dirty the unsaved-changes dot (announced to screen readers). One renderTabContent render prop draws every item’s panel.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-tabs': ['OgeTabPanel'] },
      types: { '@oge-ui/react-tabs': ['OgeTabItem'] },
      name: 'ItemsDemo',
      before: `const docs: OgeTabItem[] = [
  { key: 'readme', text: 'README.md' },
  { key: 'spec', text: 'spec.ts', badge: 3 },
  { key: 'draft', text: 'draft.md', dirty: true },
];`,
      body: `const [activeDoc, setActiveDoc] = useState<string | undefined>('readme');`,
      jsx: `<OgeTabPanel
  items={docs}
  selectedKey={activeDoc}
  onSelectedKeyChange={setActiveDoc}
  renderTabContent={({ item }) => (
    <p>
      Editing <b>{item.text}</b> — selectedKey: <code>{activeDoc}</code>
    </p>
  )}
/>`,
    }),
  },
  {
    title: 'Lazy rendering & keep-alive',
    description:
      'With deferRendering (default) a panel is mounted on its first visit; keepAlive (default) then keeps it mounted while hidden — note the creation time does not change when you come back. Toggle keep-alive off and the content is recreated on every visit.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-tabs': ['OgeTabPanel'] },
      name: 'LazyDemo',
      before: `/** Stamps its creation time — makes lazy/keep-alive behavior visible. */
function CreatedAt() {
  const [createdAt] = useState(() => new Date().toLocaleTimeString());
  return <span className="text-sm opacity-70">created at {createdAt}</span>;
}`,
      body: `const [keepAlive, setKeepAlive] = useState(true);`,
      jsx: `<>
  <label className="mb-2 flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={keepAlive}
      onChange={() => setKeepAlive((value) => !value)}
    />
    keepAlive
  </label>
  <OgeTabPanel
    keepAlive={keepAlive}
    tabs={[
      { text: 'First', content: <CreatedAt /> },
      { text: 'Second', content: <CreatedAt /> },
    ]}
  />
</>`,
    }),
  },
  {
    title: 'Closable tabs & async close guard',
    description:
      'Closing runs a pipeline: cancelable onTabClosing → the tab’s async closeGuard (the ✕ shows a pending spinner, extra clicks are ignored) → onTabClosed, where the app removes the tab — focus hands off per the APG (following tab, else preceding). The guarded tab here asks for a second click within 3 seconds. Delete/Backspace on a focused tab closes it too.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-tabs': ['OgeTabPanel'] },
      types: { '@oge-ui/react-tabs': ['OgeTabItem'] },
      name: 'ClosableDemo',
      body: `const [notice, setNotice] = useState('');
const armedUntil = useRef(0);

/** First attempt arms a 3s window; a second attempt inside it allows. */
const confirmDiscard = (): Promise<boolean> => {
  const now = Date.now();
  if (now < armedUntil.current) {
    armedUntil.current = 0;
    return Promise.resolve(true);
  }
  armedUntil.current = now + 3000;
  return new Promise((resolve) =>
    setTimeout(() => {
      setNotice('closeGuard vetoed — close again within 3s to discard changes');
      resolve(false);
    }, 600),
  );
};

const buildFiles = (): OgeTabItem[] => [
  { key: 'a.ts', text: 'a.ts' },
  { key: 'b.ts', text: 'b.ts (guarded)', dirty: true, closeGuard: confirmDiscard },
  { key: 'c.ts', text: 'c.ts' },
];

const [files, setFiles] = useState<OgeTabItem[]>(buildFiles);`,
      jsx: `<>
  <OgeTabPanel
    items={files}
    closable
    onTabClosed={(event) => {
      setFiles((current) => current.filter((file) => file.key !== event.key));
      setNotice('');
    }}
    renderTabContent={({ item }) => <p>{item.text} content…</p>}
  />
  <div className="mt-2 flex items-center gap-3">
    <button
      type="button"
      className="rounded border px-2 py-1 text-sm"
      onClick={() => {
        setFiles(buildFiles());
        setNotice('');
      }}
    >
      Reset tabs
    </button>
    {notice && <span className="text-sm opacity-70">{notice}</span>}
  </div>
</>`,
    }),
  },
  {
    title: 'Overflow: arrows & all-tabs menu',
    description:
      "When the strip overflows, showNavButtons: 'auto' reveals scroll arrows (RTL-aware) and the selected tab is kept in view. showTabListButton adds an all-tabs menu — the active tab is checked, disabled tabs stay disabled.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-tabs': ['OgeTabs'] },
      types: { '@oge-ui/react-tabs': ['OgeTabItem'] },
      name: 'OverflowDemo',
      before: `const manyTabs: OgeTabItem[] = Array.from({ length: 14 }, (_, i) => ({
  key: \`ch\${i + 1}\`,
  text: \`Chapter \${i + 1}\`,
  disabled: i === 5,
}));`,
      body: `const [index, setIndex] = useState(0);`,
      jsx: `<>
  <OgeTabs
    items={manyTabs}
    selectedIndex={index}
    onSelectedIndexChange={setIndex}
    showTabListButton
    ariaLabel="Chapters"
  />
  <p className="mt-2 text-sm opacity-70">selected: {manyTabs[index].text}</p>
</>`,
    }),
  },
  {
    title: 'Drag reorder',
    description:
      'Drag a header to reorder — a drop indicator marks the target, Escape cancels the drag, and the selection follows the moved tab. onTabReordering is cancelable; onTabReordered reports the committed move. Give tabs a key for stable identity.',
    source: reactDemoSource({
      use: { '@oge-ui/react-tabs': ['OgeTabPanel'] },
      types: { '@oge-ui/react-tabs': ['OgeTabItem'] },
      name: 'ReorderDemo',
      before: `const stages: OgeTabItem[] = [
  { key: 'todo', text: 'To do' },
  { key: 'doing', text: 'In progress' },
  { key: 'review', text: 'Review' },
  { key: 'done', text: 'Done' },
];`,
      jsx: `<OgeTabPanel
  items={stages}
  allowTabReordering
  onTabReordered={(event) => console.log(event.fromIndex, '→', event.toIndex)}
  renderTabContent={({ item }) => <p>{item.text} stage…</p>}
/>`,
    }),
  },
  {
    title: 'Positions & styling',
    description:
      "tabsPosition accepts logical top / bottom / start / end — vertical strips switch the arrow keys to Up/Down and RTL flips start/end for free. stylingMode='secondary' renders soft pills, size controls density.",
    source: reactDemoSource({
      use: { '@oge-ui/react-tabs': ['OgeTabPanel'] },
      name: 'PositionDemo',
      jsx: `<OgeTabPanel
  tabsPosition="start"
  stylingMode="secondary"
  size="sm"
  tabs={[
    { text: 'General', content: <p>General project settings…</p> },
    { text: 'Members', content: <p>Member management…</p> },
    { text: 'Danger zone', content: <p>Careful now…</p> },
  ]}
/>`,
    }),
  },
  {
    title: 'Alignment, indicator & empty state',
    description:
      "tabAlignment distributes the tabs while they fit — justify spreads them to the edges, stretch gives each an equal share. indicatorFit='content' shrinks the selected-tab underline to the label. With no visible tabs the strip renders messages.noData.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-tabs': ['OgeTabs'] },
      types: {
        '@oge-ui/react-tabs': ['OgeTabItem', 'OgeTabsAlignment'],
      },
      name: 'AlignmentDemo',
      before: `const stages: OgeTabItem[] = [
  { key: 'todo', text: 'To do' },
  { key: 'doing', text: 'In progress' },
  { key: 'review', text: 'Review' },
  { key: 'done', text: 'Done' },
];

const alignments: OgeTabsAlignment[] = [
  'start',
  'center',
  'end',
  'justify',
  'stretch',
];`,
      body: `const [alignment, setAlignment] = useState<OgeTabsAlignment>('start');
const [fitIndicator, setFitIndicator] = useState(false);
const [index, setIndex] = useState(0);`,
      jsx: `<>
  <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
    <label className="flex items-center gap-2">
      alignment
      <select
        className="rounded border px-2 py-1"
        value={alignment}
        onChange={(event) =>
          setAlignment(event.target.value as OgeTabsAlignment)
        }
      >
        {alignments.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={fitIndicator}
        onChange={() => setFitIndicator((value) => !value)}
      />
      indicatorFit = content
    </label>
  </div>
  <OgeTabs
    items={stages}
    tabAlignment={alignment}
    indicatorFit={fitIndicator ? 'content' : 'tab'}
    selectedIndex={index}
    onSelectedIndexChange={setIndex}
    ariaLabel="Alignment demo"
  />
  <p className="mt-4 mb-1 text-sm opacity-70">Empty strip:</p>
  <OgeTabs items={[]} ariaLabel="Empty demo" />
</>`,
    }),
  },
  {
    title: 'Panel transitions',
    description:
      'panelAnimation fades or slides the incoming panel — slide enters from the direction of travel and mirrors itself under RTL. dynamicHeight animates the content box between panel heights instead of letting the page jump, tracking async content with a ResizeObserver. Duration is the --oge-tab-panel-transition variable rather than a prop, and both are suppressed under prefers-reduced-motion.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-tabs': ['OgeTabPanel'] },
      types: { '@oge-ui/react-tabs': ['OgeTabPanelAnimation'] },
      name: 'AnimationDemo',
      before: `const animations: OgeTabPanelAnimation[] = ['none', 'fade', 'slide'];

const tallLines = [
  'Tab panels can differ a lot in height.',
  'Without dynamicHeight the page jumps as you switch.',
  'With it, the content box animates between the two heights.',
  'The transition honours prefers-reduced-motion.',
  'And async content is picked up by a ResizeObserver.',
];`,
      body: `const [panelAnimation, setPanelAnimation] =
  useState<OgeTabPanelAnimation>('slide');
const [dynamicHeight, setDynamicHeight] = useState(true);
const [index, setIndex] = useState(0);`,
      jsx: `<>
  <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
    <label className="flex items-center gap-2">
      panelAnimation
      <select
        className="rounded border px-2 py-1"
        value={panelAnimation}
        onChange={(event) =>
          setPanelAnimation(event.target.value as OgeTabPanelAnimation)
        }
      >
        {animations.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={dynamicHeight}
        onChange={() => setDynamicHeight((value) => !value)}
      />
      dynamicHeight
    </label>
  </div>
  <OgeTabPanel
    panelAnimation={panelAnimation}
    dynamicHeight={dynamicHeight}
    selectedIndex={index}
    onSelectedIndexChange={setIndex}
    tabs={[
      { text: 'Short', content: <p>One line of content.</p> },
      {
        text: 'Medium',
        content: (
          <>
            <p>A few more lines.</p>
            <p>So the panel is noticeably taller than the first one.</p>
          </>
        ),
      },
      {
        text: 'Tall',
        content: (
          <>
            {tallLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </>
        ),
      },
    ]}
  />
</>`,
    }),
  },
];

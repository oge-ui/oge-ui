import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React app bar page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/app-bar.ts`: the Angular
 * `[ogeAppBarStart]` / `[ogeAppBarEnd]` / `[ogeAppBarCenter]` attribute slots
 * arrive here as the `start` / `end` / `center` node props, and `children`
 * go to the center section like unmarked projected content.
 */
export const LAYOUT_APP_BAR_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Sections',
    description:
      'start and end size to their content; children go to the center section, which takes the remaining width and lets a long title truncate instead of pushing the actions off a phone screen.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAppBar'] },
      name: 'AppBarSectionsDemo',
      body: `const [last, setLast] = useState('—');`,
      jsx: `<>
  <OgeAppBar
    start={
      <button type="button" aria-label="Open menu" onClick={() => setLast('menu')}>
        ☰
      </button>
    }
    end={
      <>
        <button type="button" onClick={() => setLast('search')}>Search</button>
        <button type="button" onClick={() => setLast('profile')}>Profile</button>
      </>
    }
  >
    <strong>Inbox</strong>
  </OgeAppBar>
  <p>last action → {last}</p>
</>`,
    }),
  },
  {
    title: 'Colors & sizes',
    description:
      'default is the page surface with a hairline on the content edge, primary the accent, inverse the dark tooltip surface, transparent none. size is the 48 / 56 / 64 px density and elevated adds the card shadow — all tokens, so a theme re-tunes every bar.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAppBar'] },
      name: 'AppBarColorsDemo',
      jsx: `<>
  <OgeAppBar size="sm"><strong>Default · sm</strong></OgeAppBar>
  <OgeAppBar color="primary" elevated end={<button type="button">Action</button>}>
    <strong>Primary · elevated</strong>
  </OgeAppBar>
  <OgeAppBar color="inverse" size="lg" centerAlign="center">
    <strong>Inverse · lg · centered</strong>
  </OgeAppBar>
  <OgeAppBar color="transparent"><strong>Transparent</strong></OgeAppBar>
</>`,
    }),
  },
  {
    title: 'Sticky & fixed (safe areas)',
    description:
      'sticky sticks to the top of the nearest scroll container; fixed pins to the viewport instead (not shown live — it would cover these docs). Both pad with env(safe-area-inset-*) as a floor and sit on the --oge-z-app-bar layer, below FABs, popups and dialogs.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAppBar'] },
      name: 'AppBarStickyDemo',
      before: `const paragraphs = Array.from(
  { length: 8 },
  (_, i) => \`Paragraph \${i + 1}: scroll inside this box — the bar stays on top.\`,
);`,
      jsx: `<div
  role="region"
  aria-label="Scrolling article"
  tabIndex={0}
  style={{ maxHeight: 240, overflow: 'auto' }}
>
  <OgeAppBar positionMode="sticky" elevated end={<button type="button">Share</button>}>
    <strong>Article</strong>
  </OgeAppBar>
  {paragraphs.map((paragraph) => (
    <p key={paragraph}>{paragraph}</p>
  ))}
</div>`,
    }),
  },
  {
    title: 'Bottom bar',
    description:
      'position="bottom" moves the hairline and the shadow to the top edge and the safe-area padding to the home-indicator edge — a phone’s bottom navigation.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAppBar'] },
      name: 'AppBarBottomDemo',
      before: `const messages = Array.from({ length: 8 }, (_, i) => \`Message \${i + 1}\`);
const tabs = ['home', 'search', 'me'] as const;`,
      body: `const [tab, setTab] = useState<string>('home');`,
      jsx: `<div
  role="region"
  aria-label="Phone screen"
  tabIndex={0}
  style={{ maxHeight: 240, overflow: 'auto' }}
>
  {messages.map((message) => (
    <p key={message}>{message}</p>
  ))}
  <OgeAppBar position="bottom" positionMode="sticky" centerAlign="center">
    {tabs.map((option) => (
      <button
        key={option}
        type="button"
        aria-pressed={tab === option}
        onClick={() => setTab(option)}
      >
        {option}
      </button>
    ))}
  </OgeAppBar>
</div>`,
    }),
  },
  {
    title: 'Landmarks',
    description:
      'A landmark only on request: banner for the one page header, contentinfo for a page footer, navigation / region plus an ariaLabel for a named secondary bar. ariaLabel is written only when a landmark is set — on a role-less element it would be invalid ARIA.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAppBar'] },
      name: 'AppBarLandmarkDemo',
      jsx: `<OgeAppBar
  landmark="navigation"
  ariaLabel="Project"
  color="inverse"
  size="sm"
  start={<strong>Project</strong>}
>
  <a href="#landmarks">Overview</a>
  <a href="#landmarks">Issues</a>
  <a href="#landmarks">Settings</a>
</OgeAppBar>`,
    }),
  },
];

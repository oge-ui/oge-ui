import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React card page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/card.ts`, per the parity standard
 * (`docs/REACT-PARITY.md`): same eleven sections, same order, same example
 * content, React idiom. The Angular attribute slots (`[ogeCardMedia]`,
 * `[ogeCardActions]`, …) arrive here as the node props `media`, `actions`,
 * `avatar`, `headerActions` and `footer`; the slot node carries the section's
 * `.oge-card-*` class, which is what the directives add on the Angular side.
 */
export const LAYOUT_CARD_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics',
    description:
      'Simple titles come from the header / subheader props (the PrimeNG names — a title prop would double as a native tooltip). The default content is children; no marker element to remember.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      name: 'CardBasicsDemo',
      body: `const [last, setLast] = useState('—');`,
      jsx: `<div className="max-w-sm">
  <OgeCard
    header="Mountains"
    subheader="Alps, 2026"
    actions={
      <div className="oge-card-actions oge-card-actions-end">
        <button type="button" onClick={() => setLast('Share')}>
          Share
        </button>
      </div>
    }
  >
    <p>Four days above the tree line, one pass a day.</p>
  </OgeCard>
  <p className="mt-2 text-sm opacity-70">last action → {last}</p>
</div>`,
    }),
  },
  {
    title: 'Chrome presets',
    description:
      "stylingMode is the house word with the layout family's values plus Material's raised: outlined (default), raised, filled, flat. raised rests on the --oge-shadow-card token, so a theme re-tunes elevation without touching the component.",
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      name: 'CardModesDemo',
      before: `// outlined is the default; raised rests on the --oge-shadow-card token,
// filled sits on the header surface, flat is for a card nested inside
// another surface.
const modes = ['outlined', 'raised', 'filled', 'flat'] as const;`,
      jsx: `<div className="grid gap-4 sm:grid-cols-2">
  {modes.map((mode) => (
    <OgeCard key={mode} header={mode} stylingMode={mode}>
      <p className="text-sm">The {mode} chrome preset.</p>
    </OgeCard>
  ))}
</div>`,
    }),
  },
  {
    title: 'Density',
    description:
      'size is the family’s density preset (sm / md / lg): it scales the section padding and type ramp together, and --oge-card-pad is the per-card escape hatch.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      name: 'CardSizeDemo',
      before: `const sizes = ['sm', 'md', 'lg'] as const;`,
      jsx: `<div className="grid gap-4 sm:grid-cols-3">
  {sizes.map((size) => (
    <OgeCard key={size} header={size === 'md' ? 'Default' : size} size={size}>
      <p className="text-sm">The {size} density.</p>
    </OgeCard>
  ))}
</div>`,
    }),
  },
  {
    title: 'Media',
    description:
      'The media prop is full-bleed — it touches the card edges while the sections around it keep the padding. Size it with your own CSS (aspect-ratio, block-size); there is deliberately no aspectRatio prop. The heading stays before the media in DOM order.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      name: 'CardMediaDemo',
      jsx: `<div className="max-w-sm">
  <OgeCard
    header="Mountains"
    subheader="Alps, 2026"
    media={
      <img
        className="oge-card-media"
        src="https://picsum.photos/seed/oge-alps/640/360"
        alt=""
        style={{ aspectRatio: '16 / 9' }}
      />
    }
  >
    <p>Media renders edge to edge, clipped by the card radius.</p>
  </OgeCard>
</div>`,
    }),
  },
  {
    title: 'Horizontal',
    description:
      'orientation="horizontal" turns the card into a two-column grid: the media spans the inline-start column and --oge-card-media-size sets its width. Kendo is the only reference with an orientation input at all.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      types: { react: ['CSSProperties'] },
      name: 'CardHorizontalDemo',
      jsx: `<div className="max-w-xl">
  <OgeCard
    header="Mountains"
    subheader="Alps, 2026"
    orientation="horizontal"
    style={{ '--oge-card-media-size': '160px' } as CSSProperties}
    media={
      <img
        className="oge-card-media"
        src="https://picsum.photos/seed/oge-lake/320/320"
        alt=""
      />
    }
  >
    <p>
      The media column follows the writing mode, so it mirrors in RTL with no
      flag to set.
    </p>
  </OgeCard>
</div>`,
    }),
  },
  {
    title: 'Header slots',
    description:
      'The header row renders only when it has something to show — titles, an avatar or headerActions node. Header actions are real controls in the Tab sequence; the card never wraps them in anything interactive.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      name: 'CardHeaderDemo',
      body: `const [last, setLast] = useState('—');`,
      jsx: `<div className="max-w-sm">
  <OgeCard
    header="R. Aydın"
    subheader="3 hours ago"
    avatar={
      <img
        className="oge-card-avatar"
        src="https://i.pravatar.cc/80?img=12"
        alt=""
      />
    }
    headerActions={
      <div className="oge-card-header-actions">
        <button
          type="button"
          aria-label="More options"
          onClick={() => setLast('Menu')}
        >
          ⋮
        </button>
      </div>
    }
  >
    <p>Reached the ridge before the weather turned.</p>
  </OgeCard>
  <p className="mt-2 text-sm opacity-70">last action → {last}</p>
</div>`,
    }),
  },
  {
    title: 'Actions alignment',
    description:
      'The alignment vocabulary is the Kendo superset: start (the Material/Kendo default), center, end, and stretched — every action takes equal width. React has no [ogeCardActions] directive to carry it, so the actions node takes the matching oge-card-actions-* class itself.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      types: { '@oge-ui/react-layout': ['OgeCardActionsAlign'] },
      name: 'CardActionsDemo',
      before: `const aligns: readonly OgeCardActionsAlign[] = [
  'start',
  'center',
  'end',
  'stretched',
];`,
      body: `const [align, setAlign] = useState<OgeCardActionsAlign>('start');`,
      jsx: `<div className="max-w-sm">
  <div className="mb-3 flex gap-2">
    {aligns.map((value) => (
      <button key={value} type="button" onClick={() => setAlign(value)}>
        {value}
      </button>
    ))}
  </div>
  <OgeCard
    header="Draft"
    actions={
      <div
        className={\`oge-card-actions\${align === 'start' ? '' : \` oge-card-actions-\${align}\`}\`}
      >
        <button type="button">Discard</button>
        <button type="button">Save</button>
      </div>
    }
  >
    <p>Unsaved changes.</p>
  </OgeCard>
</div>`,
    }),
  },
  {
    title: 'Footer & separator',
    description:
      'The footer node is a divided strip on the header surface — metadata rather than commands. An <hr className="oge-card-separator" /> in the content draws a full-bleed hairline inside the padding.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      name: 'CardFooterDemo',
      jsx: `<div className="max-w-sm">
  <OgeCard
    header="Weekly report"
    footer={<div className="oge-card-footer">Updated 2 hours ago</div>}
  >
    <p>Generated from last week&#39;s data.</p>
    <hr className="oge-card-separator" />
    <p>12 pages, 4 charts.</p>
  </OgeCard>
</div>`,
    }),
  },
  {
    title: 'Status & loading',
    description:
      'severity draws a status rail on the inline-start edge — the toast’s rail idiom on a static surface. loading swaps the content and action row for a shimmer skeleton and marks the card aria-busy; header, media and footer keep the footprint while the data arrives.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      name: 'CardStatesDemo',
      body: `const [pending, setPending] = useState(true);`,
      jsx: `<>
  <div className="grid gap-4 sm:grid-cols-2">
    <OgeCard
      header="Deploy failed"
      subheader="build #412"
      severity="danger"
      actions={
        <div className="oge-card-actions oge-card-actions-end">
          <button type="button">Retry</button>
        </div>
      }
    >
      <p className="text-sm">The e2e stage timed out after 20 minutes.</p>
    </OgeCard>
    <OgeCard header="Weekly report" subheader="loading…" loading={pending}>
      <p className="text-sm">Generated from last week&#39;s data.</p>
    </OgeCard>
  </div>
  <button type="button" className="mt-3" onClick={() => setPending(!pending)}>
    Toggle loading
  </button>
</>`,
    }),
  },
  {
    title: 'Clickable cards, accessibly',
    description:
      'There is no clickable prop, on purpose: wrapping the whole card in a link or button is the nested-interactive axe violation the moment a second control appears, and a screen reader reads the entire card as one link name. The accessible pattern is one primary <a> in the content with a CSS-stretched hit area — and interactive is its visual half: a hover/focus-within lift with no role, tabindex or wrapper of its own.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCard'] },
      name: 'CardClickableDemo',
      before: `// The stretched hit area, in your own stylesheet:
//
//   .oge-card { position: relative; }
//   .card-link::after { content: ''; position: absolute; inset: 0; }
//
// Other controls stay usable by raising them above the overlay
// (position: relative + z-index).`,
      jsx: `<div className="max-w-sm">
  <OgeCard
    header="Mountains"
    subheader="Alps, 2026"
    interactive
    style={{ position: 'relative' }}
  >
    <p>Four days above the tree line.</p>
    <a className="card-link" href="/trips/alps-2026">
      Read the full report
    </a>
  </OgeCard>
</div>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      '<OgeCardConfigProvider> carries stylingMode, orientation and size defaults for its subtree; instance props win. There is no messages block, deliberately — the card renders no user-facing strings and no interactive chrome of its own.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeCard', 'OgeCardConfigProvider'] },
      name: 'CardConfigDemo',
      jsx: `<OgeCardConfigProvider config={{ stylingMode: 'raised' }}>
  <div className="max-w-sm">
    <OgeCard header="Raised by default">
      <p className="text-sm">
        What every card in the subtree looks like. Instance props still win:
        add stylingMode="outlined" to opt one card out.
      </p>
    </OgeCard>
  </div>
</OgeCardConfigProvider>`,
    }),
  },
];

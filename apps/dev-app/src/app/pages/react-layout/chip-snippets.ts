import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const STAR = `const STAR = 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.8 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z';`;

/**
 * Demo sources for the React chip page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/chip.ts`: same seven sections,
 * same example content, React idiom (`onSelectedChange` for the
 * `[(selected)]` banana, `renderChip` for `[ogeChipTemplate]`).
 */
export const LAYOUT_CHIP_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Chips',
    description:
      'A plain chip is static text — no role and nothing focusable. icon takes SVG path data; an avatar renders the image, then the initials, and is always aria-hidden.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeChip'] },
      name: 'ChipBasicsDemo',
      before: STAR,
      jsx: `<>
  <OgeChip label="Angular" />
  <OgeChip label="Featured" icon={STAR} severity="accent" />
  <OgeChip label="Ada Lovelace" avatar={{ name: 'Ada Lovelace' }} />
  <OgeChip label="Passed" severity="success" stylingMode="outlined" />
  <OgeChip label="Blocked" severity="danger" size="sm" />
</>`,
    }),
  },
  {
    title: 'Selectable chips',
    description:
      'selectable renders a toggle <button aria-pressed>; the check glyph and the accent frame show the state, never colour alone.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeChip'] },
      name: 'ChipSelectableDemo',
      body: `const [remote, setRemote] = useState(true);
const [fullTime, setFullTime] = useState(false);`,
      jsx: `<>
  <OgeChip label="Remote" selectable selected={remote} onSelectedChange={setRemote} />
  <OgeChip label="Full-time" selectable selected={fullTime} onSelectedChange={setFullTime} />
  <p>
    remote: {String(remote)} · full-time: {String(fullTime)}
  </p>
</>`,
    }),
  },
  {
    title: 'Removable chips',
    description:
      'removable adds a separate, real remove button ("Remove Design"). The chip moves no data — drop it in onRemoved.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeChip'] },
      name: 'ChipRemovableDemo',
      body: `const [tags, setTags] = useState(['Design', 'Research', 'Writing']);`,
      jsx: `<>
  {tags.map((tag) => (
    <OgeChip
      key={tag}
      label={tag}
      removable
      onRemoved={() => setTags((current) => current.filter((t) => t !== tag))}
    />
  ))}
</>`,
    }),
  },
  {
    title: 'Chip list — single selection',
    description:
      'Selectable chips form an APG listbox with one tab stop: arrows, Home and End move; Space or Enter toggles; disabled chips are skipped.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeChipList'] },
      types: { '@oge-ui/react-layout': ['OgeChipItem', 'OgeChipKey'] },
      name: 'ChipSingleDemo',
      before: `const SIZES: OgeChipItem[] = [
  { key: 's', label: 'Small' },
  { key: 'm', label: 'Medium' },
  { key: 'l', label: 'Large' },
  { key: 'xl', label: 'X-Large', disabled: true },
];`,
      body: `const [size, setSize] = useState<readonly OgeChipKey[]>(['m']);`,
      jsx: `<OgeChipList
  items={SIZES}
  selectionMode="single"
  selectedKeys={size}
  onSelectedKeysChange={setSize}
  ariaLabel="Size"
/>`,
    }),
  },
  {
    title: 'Chip list — multiple selection (filters)',
    description:
      'multiple adds aria-multiselectable; onSelectionChanged carries the previous and the next keys plus the toggled chip.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeChipList'] },
      types: { '@oge-ui/react-layout': ['OgeChipItem', 'OgeChipKey'] },
      name: 'ChipMultipleDemo',
      before: `const FILTERS: OgeChipItem[] = [
  { key: 'open', label: 'Open' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'bug', label: 'Bug', severity: 'danger' },
  { key: 'docs', label: 'Docs', severity: 'accent' },
];`,
      body: `const [active, setActive] = useState<readonly OgeChipKey[]>(['open']);
const [last, setLast] = useState('—');`,
      jsx: `<>
  <OgeChipList
    items={FILTERS}
    selectionMode="multiple"
    selectedKeys={active}
    onSelectedKeysChange={setActive}
    ariaLabel="Filters"
    onSelectionChanged={(event) => setLast(event.item.label)}
  />
  <p>
    active: {active.join(', ') || 'none'} · last: {last}
  </p>
</>`,
    }),
  },
  {
    title: 'Removable list (APG grid)',
    description:
      'Chips that can only be removed form an APG layout grid with real remove buttons. Delete focuses the chip that took the place, Backspace the previous one.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeChipList'] },
      types: { '@oge-ui/react-layout': ['OgeChipItem'] },
      name: 'ChipGridDemo',
      before: `const PEOPLE: OgeChipItem[] = [
  { key: 1, label: 'Ada Lovelace', avatar: { name: 'Ada Lovelace' } },
  { key: 2, label: 'Grace Hopper', avatar: { name: 'Grace Hopper' } },
  { key: 3, label: 'Alan Turing', avatar: { name: 'Alan Turing' } },
  { key: 4, label: 'Katherine Johnson', avatar: { name: 'Katherine Johnson' } },
];`,
      body: `const [people, setPeople] = useState(PEOPLE);`,
      jsx: `<OgeChipList
  items={people}
  removable
  ariaLabel="Recipients"
  onItemRemoved={(event) =>
    setPeople((current) => current.filter((p) => p.key !== event.item.key))
  }
/>`,
    }),
  },
  {
    title: 'Custom chip template',
    description:
      'renderChip replaces the label only: the list keeps the role, the focus, the check glyph and the remove affordance.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeChipList'] },
      types: { '@oge-ui/react-layout': ['OgeChipItem', 'OgeChipKey'] },
      name: 'ChipTemplateDemo',
      before: `const LANGUAGES: OgeChipItem[] = [
  { key: 'ts', label: 'TypeScript' },
  { key: 'rs', label: 'Rust' },
  { key: 'go', label: 'Go' },
];
const COUNTS: Record<string, number> = { ts: 128, rs: 42, go: 37 };`,
      body: `const [picked, setPicked] = useState<readonly OgeChipKey[]>(['ts']);`,
      jsx: `<OgeChipList
  items={LANGUAGES}
  selectionMode="multiple"
  selectedKeys={picked}
  onSelectedKeysChange={setPicked}
  ariaLabel="Languages"
  renderChip={({ item }) => (
    <>
      <strong>{item.label}</strong> <span className="opacity-70">{COUNTS[item.key]}</span>
    </>
  )}
/>`,
    }),
  },
];

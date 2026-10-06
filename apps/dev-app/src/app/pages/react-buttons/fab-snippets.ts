import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';
import { FAB_ICONS } from '../buttons/fab-snippets';

/**
 * Demo sources for the React FAB & speed dial page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node.
 *
 * Section-for-section mirror of `../buttons/fab-snippets.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same six sections, same example content,
 * React idiom (`onClick`, `onItemClick`, `opened` + `onOpenedChange`).
 */
export const FAB_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Floating action button',
    description:
      'An icon-only FAB takes its accessible name from label. Pass the icon as SVG path data, or render your own aria-hidden icon as children. onClick reports the press.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeFab'] },
      name: 'FabDemo',
      before: `const PENCIL = '${FAB_ICONS.pencil}';`,
      jsx: `<div style={{ position: 'relative', height: 224 }}>
  {/* positionMode="absolute" pins it inside the nearest positioned
      ancestor; the default "fixed" pins it to the viewport. */}
  <OgeFab
    label="Compose"
    icon={PENCIL}
    positionMode="absolute"
    onClick={() => console.log('compose')}
  />
</div>`,
    }),
  },
  {
    title: 'Extended FAB',
    description:
      'extended shows the label as text beside the icon in a pill. Sizes are 40 / 56 / 72 px; severity uses the button vocabulary (normal is the page surface).',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeFab'] },
      name: 'FabExtendedDemo',
      before: `const PENCIL = '${FAB_ICONS.pencil}';
const SHARE = '${FAB_ICONS.share}';`,
      jsx: `<div className="demo-row">
  <OgeFab label="Compose" icon={PENCIL} extended positionMode="static" />
  <OgeFab label="Share" icon={SHARE} size="sm" severity="normal" positionMode="static" />
  <OgeFab label="Share" icon={SHARE} severity="success" positionMode="static" />
  <OgeFab label="Share" icon={SHARE} size="lg" severity="danger" positionMode="static" />
</div>`,
    }),
  },
  {
    title: 'Positions & safe areas',
    description:
      'Six logical positions — start/end mirror in RTL. Pinned edges use max(offset, env(safe-area-inset-*)), so a fixed FAB clears the home indicator and the notch once the app opts into viewport-fit=cover.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeFab'] },
      types: { '@oge-ui/react-buttons': ['OgeFabPosition'] },
      name: 'FabPositionsDemo',
      before: `const PENCIL = '${FAB_ICONS.pencil}';
const POSITIONS: OgeFabPosition[] = [
  'top-start',
  'top-center',
  'top-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
];`,
      jsx: `<div style={{ position: 'relative', height: 256 }}>
  {POSITIONS.map((position) => (
    <OgeFab
      key={position}
      label={position}
      icon={PENCIL}
      size="sm"
      positionMode="absolute"
      position={position}
      offset="12px"
    />
  ))}
</div>`,
    }),
  },
  {
    title: 'Speed dial',
    description:
      'Enter, Space, a click or the arrow pointing along the dial opens it with focus on the nearest action. The arrows move and wrap, Home/End jump, Escape closes and returns focus to the FAB, Tab closes and moves on, a press outside closes it.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-buttons': ['OgeSpeedDial'] },
      types: { '@oge-ui/react-buttons': ['OgeSpeedDialItem'] },
      name: 'SpeedDialDemo',
      before: `const ACTIONS: OgeSpeedDialItem[] = [
  { key: 'mail', label: 'Email', icon: '${FAB_ICONS.mail}' },
  { key: 'print', label: 'Print', icon: '${FAB_ICONS.print}' },
  { key: 'share', label: 'Copy link', icon: '${FAB_ICONS.share}' },
  { key: 'delete', label: 'Delete', icon: '${FAB_ICONS.trash}', severity: 'danger' },
];`,
      body: `const [opened, setOpened] = useState(false);
const [last, setLast] = useState('none');`,
      jsx: `<>
  <div style={{ position: 'relative', height: 288 }}>
    <OgeSpeedDial
      label="Share options"
      positionMode="absolute"
      items={ACTIONS}
      opened={opened}
      onOpenedChange={setOpened}
      onItemClick={({ item }) => setLast(item.label)}
    />
  </div>
  <p>
    Last action: {last} · opened: {String(opened)}
  </p>
</>`,
    }),
  },
  {
    title: 'Directions & label modes',
    description:
      'direction overrides the default (up from a bottom FAB, down from a top one). labelMode is hover (beside the hovered or focused action, always on touch screens), always, or none — the label then stays the accessible name only. A disabled action is aria-disabled and skipped by the arrows.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeSpeedDial'] },
      types: { '@oge-ui/react-buttons': ['OgeSpeedDialItem'] },
      name: 'SpeedDialDirectionsDemo',
      before: `const FILES: OgeSpeedDialItem[] = [
  { key: 'doc', label: 'Document', icon: '${FAB_ICONS.doc}' },
  { key: 'image', label: 'Image', icon: '${FAB_ICONS.image}' },
  { key: 'mail', label: 'Email draft', icon: '${FAB_ICONS.mail}', disabled: true },
];`,
      jsx: `<div style={{ position: 'relative', height: 240 }}>
  <OgeSpeedDial
    label="New file"
    positionMode="absolute"
    position="bottom-end"
    direction="start"
    labelMode="none"
    items={FILES}
  />
  <OgeSpeedDial
    label="Insert"
    positionMode="absolute"
    position="top-start"
    labelMode="always"
    size="sm"
    items={FILES}
  />
</div>`,
    }),
  },
  {
    title: 'Hover mode',
    description:
      'openMode="hover" also opens the dial while a mouse hovers it — never on touch, where a tap is the only gesture. Hover does not move focus; a click still opens it with focus on the first action.',
    source: reactDemoSource({
      use: { '@oge-ui/react-buttons': ['OgeSpeedDial'] },
      types: { '@oge-ui/react-buttons': ['OgeSpeedDialItem'] },
      name: 'SpeedDialHoverDemo',
      before: `const QUICK: OgeSpeedDialItem[] = [
  { key: 'share', label: 'Share', icon: '${FAB_ICONS.share}' },
  { key: 'mail', label: 'Email', icon: '${FAB_ICONS.mail}' },
];`,
      jsx: `<div style={{ position: 'relative', height: 224 }}>
  <OgeSpeedDial
    label="Quick actions"
    openMode="hover"
    positionMode="absolute"
    severity="normal"
    items={QUICK}
  />
</div>`,
    }),
  },
];

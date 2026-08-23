import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React overlay overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../overlay/overview.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same two sections, same order, same
 * example content, React idiom.
 */
export const OVERLAY_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Anchored panel',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgePopup', 'useAnchoredPanel'],
      },
      types: { '@oge-ui/react-overlay': ['OgePopupPlacement'] },
      name: 'AnchoredPanelDemo',
      body: `const [placement, setPlacement] = useState<OgePopupPlacement>('bottom-start');
const anchorRef = useRef<HTMLSpanElement>(null);
const popupRef = useRef<HTMLDivElement>(null);
const panel = useAnchoredPanel({
  anchor: () => anchorRef.current,
  panel: () => popupRef.current,
  placement: () => placement,
});`,
      jsx: `<>
  <span ref={anchorRef} className="inline-flex">
    <OgeButton
      text="Toggle panel"
      ariaHasPopup="dialog"
      ariaExpanded={panel.isOpen}
      ariaControls={panel.panelId}
      onClick={() => panel.toggle()}
    />
  </span>
  {panel.isOpen && (
    <OgePopup panel={panel} ref={popupRef}>
      <div className="w-56 p-3">Anchored content…</div>
    </OgePopup>
  )}
</>`,
    }),
  },
  {
    title: 'Menu list',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeMenuList'] },
      types: { '@oge-ui/react-overlay': ['OgeMenuItem'] },
      name: 'MenuListDemo',
      before: `const items: OgeMenuItem[] = [
  { text: 'Duplicate', checked: false },
  { text: 'Move to…' },
  { text: '', separator: true },
  { text: 'Delete', severity: 'danger' },
];`,
      body: `const [last, setLast] = useState('');`,
      jsx: `<>
  <OgeMenuList
    items={items}
    ariaLabel="Demo actions"
    onItemClick={(event) => setLast(event.item.text)}
  />
  <span className="text-sm opacity-70">last action: {last || '—'}</span>
</>`,
    }),
  },
];

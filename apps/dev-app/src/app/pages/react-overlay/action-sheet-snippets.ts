import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React action sheet page. Pure data, no React imports.
 * Section-for-section mirror of `../overlay/action-sheet.ts`; the Angular
 * `[ogeActionSheetItemTemplate]` arrives as the `renderItem` render prop and
 * the template reference as a `ref` handle.
 */
export const OVERLAY_ACTION_SHEET_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics',
    description:
      'A modal dialog labelled by its title, portaled to <body>, with an APG menu of actions and a separate Cancel button. Escape, the backdrop and a swipe down close it; focus returns to the opener.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-overlay': ['OgeActionSheet'] },
      types: {
        '@oge-ui/react-overlay': ['OgeActionSheetHandle', 'OgeActionSheetItem'],
      },
      name: 'ActionSheetBasicsDemo',
      before: `const actions: OgeActionSheetItem[] = [
  { key: 'share', text: 'Share', icon: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13' },
  { key: 'link', text: 'Copy link' },
  { key: 'edit', text: 'Edit', icon: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' },
  { key: 'delete', text: 'Delete photo', icon: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', destructive: true },
];`,
      body: `const sheet = useRef<OgeActionSheetHandle>(null);
const [last, setLast] = useState('none');`,
      jsx: `<>
  <button type="button" onClick={() => sheet.current?.open()}>
    Photo actions
  </button>
  <OgeActionSheet
    ref={sheet}
    title="Photo"
    description="Taken on 3 October in Göreme"
    items={actions}
    onItemClick={(e) => setLast(e.item.text)}
  />
  <p>Last action: {last}</p>
</>`,
    }),
  },
  {
    title: 'Groups, disabled actions & templates',
    description:
      "group: 'bottom' actions render after a divider; disabled actions stay focusable but never run; renderItem replaces the icon and text while the menu item button stays with the sheet.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeActionSheet'] },
      types: { '@oge-ui/react-overlay': ['OgeActionSheetItem'] },
      name: 'ActionSheetGroupsDemo',
      before: `const actions: OgeActionSheetItem[] = [
  { key: 'download', text: 'Download', description: 'PDF, 2.4 MB' },
  { key: 'share', text: 'Share with team', description: 'Only owners can share this file', disabled: true },
  { key: 'report', text: 'Report a problem', group: 'bottom' },
  { key: 'delete', text: 'Move to trash', destructive: true, group: 'bottom' },
];`,
      body: `const [opened, setOpened] = useState(false);`,
      jsx: `<>
  <button type="button" onClick={() => setOpened(!opened)}>
    File actions
  </button>
  <OgeActionSheet
    opened={opened}
    onOpenedChange={setOpened}
    title="Quarterly report.pdf"
    items={actions}
    renderItem={({ item }) => (
      <span>
        <strong>{item.text}</strong>
        {item.description && <small> — {item.description}</small>}
      </span>
    )}
  />
</>`,
    }),
  },
  {
    title: 'Promise API & events',
    description:
      'open() on the ref handle resolves with the chosen action, or null when dismissed; onItemClick can set keepOpen, and the cancelable onClosing can veto a close by its reason.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-overlay': ['OgeActionSheet'] },
      types: {
        '@oge-ui/react-overlay': ['OgeActionSheetHandle', 'OgeActionSheetItem'],
      },
      name: 'ActionSheetPromiseDemo',
      before: `const layouts: OgeActionSheetItem[] = [
  { key: 'grid', text: 'Grid' },
  { key: 'list', text: 'List' },
  { key: 'preview', text: 'Preview (keeps the sheet open)' },
];`,
      body: `const sheet = useRef<OgeActionSheetHandle>(null);
const [result, setResult] = useState('Nothing chosen yet');
const [lock, setLock] = useState(false);
const choose = async () => {
  const chosen = await sheet.current?.open();
  setResult(chosen ? \`Chose \${chosen.text}\` : 'Dismissed');
};`,
      jsx: `<>
  <button type="button" onClick={choose}>Choose a layout</button>
  <label>
    <input type="checkbox" checked={lock} onChange={() => setLock(!lock)} />
    Veto backdrop closing
  </label>
  <OgeActionSheet
    ref={sheet}
    title="Layout"
    items={layouts}
    onItemClick={(e) => (e.keepOpen = e.item.key === 'preview')}
    onClosing={(e) => (e.cancel = lock && e.reason === 'backdrop')}
  />
  <p>{result}</p>
</>`,
    }),
  },
];

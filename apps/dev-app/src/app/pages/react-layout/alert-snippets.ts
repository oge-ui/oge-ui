import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React alert page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/alert.ts`: same five sections,
 * same example content, React idiom (`actions` / `icon` node props for the
 * `[ogeAlertActions]` / `[ogeAlertIcon]` slots, `onVisibleChange` for the
 * `[(visible)]` banana).
 */
export const LAYOUT_ALERT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Severities',
    description:
      'info / success are role="status" (polite), warning / error role="alert" (assertive). The glyph is aria-hidden; a visually hidden prefix carries the meaning.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAlert'] },
      name: 'AlertSeveritiesDemo',
      jsx: `<>
  <OgeAlert severity="info">A new version is available.</OgeAlert>
  <OgeAlert severity="success">Your changes were saved.</OgeAlert>
  <OgeAlert severity="warning">Your trial ends in three days.</OgeAlert>
  <OgeAlert severity="error">The payment could not be processed.</OgeAlert>
</>`,
    }),
  },
  {
    title: 'Styling modes',
    description:
      'soft (default) is a tinted surface, outlined a coloured frame, filled the solid severity colour.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAlert'] },
      name: 'AlertModesDemo',
      jsx: `<>
  <OgeAlert severity="success" stylingMode="soft">Soft</OgeAlert>
  <OgeAlert severity="success" stylingMode="outlined">Outlined</OgeAlert>
  <OgeAlert severity="success" stylingMode="filled">Filled</OgeAlert>
</>`,
    }),
  },
  {
    title: 'Title, actions & dismiss',
    description:
      'dismissible adds a real dismiss button; onClosing is cancelable and focus moves past the alert instead of dropping to the page body.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAlert'] },
      name: 'AlertDismissDemo',
      body: `const [visible, setVisible] = useState(true);`,
      jsx: `<>
  <OgeAlert
    severity="warning"
    title="Storage almost full"
    dismissible
    visible={visible}
    onVisibleChange={setVisible}
    actions={<button type="button">Manage storage</button>}
  >
    You have used 92% of your quota.
  </OgeAlert>
  {!visible && (
    <button type="button" onClick={() => setVisible(true)}>
      Show again
    </button>
  )}
</>`,
    }),
  },
  {
    title: 'Live regions',
    description:
      'The role stays on the host while it is hidden, so showing the alert again is announced. live="off" renders no role.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAlert'] },
      name: 'AlertLiveDemo',
      body: `const [saved, setSaved] = useState(false);`,
      jsx: `<>
  <button type="button" onClick={() => setSaved(!saved)}>
    Toggle saved
  </button>
  <OgeAlert severity="success" visible={saved} onVisibleChange={setSaved}>
    Draft saved.
  </OgeAlert>
  <OgeAlert severity="info" live="off">
    This page is read-only.
  </OgeAlert>
</>`,
    }),
  },
  {
    title: 'Custom icon',
    description:
      'icon replaces the default glyph inside an aria-hidden wrapper; showIcon={false} drops the icon column.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAlert'] },
      name: 'AlertIconDemo',
      jsx: `<>
  <OgeAlert
    severity="info"
    title="Tip"
    icon={
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
      </svg>
    }
  >
    Press <kbd>?</kbd> to see every keyboard shortcut.
  </OgeAlert>
  <OgeAlert severity="info" showIcon={false}>
    No icon at all.
  </OgeAlert>
</>`,
    }),
  },
];

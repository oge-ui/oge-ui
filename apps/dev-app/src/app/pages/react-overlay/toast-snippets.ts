import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React toast page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../overlay/toast.ts`.
 */
export const OVERLAY_TOAST_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Severities',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['OgeToastProvider', 'useOgeToasts'],
      },
      name: 'SaveButton',
      body: `// <OgeToastProvider> sits once near the app root
const toasts = useOgeToasts();

const save = () => {
  toasts.success('Saved');
  toasts.warning('Quota at 90%', { title: 'Heads up' });
  toasts.error('Save failed'); // announces assertively
  toasts.show({ message: 'Plain info toast' });
};`,
      jsx: `<OgeButton text="Save" onClick={save} />`,
    }),
  },
  {
    title: 'Positions & stacking',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': [
          'OgeOverlayConfigProvider',
          'OgeToastProvider',
          'useOgeToasts',
        ],
      },
      name: 'NotifyButton',
      before: `// extras beyond toastMaxVisible queue FIFO and promote as slots free up
export function App() {
  return (
    <OgeOverlayConfigProvider config={{ toastPosition: 'bottom-end', toastMaxVisible: 5 }}>
      <OgeToastProvider>
        <NotifyButton />
      </OgeToastProvider>
    </OgeOverlayConfigProvider>
  );
}`,
      body: `const toasts = useOgeToasts();

// 6 logical positions (RTL-aware); the default comes from config
const notify = () => toasts.info('Top center', { position: 'top-center' });`,
      jsx: `<OgeButton text="Top center" onClick={notify} />`,
    }),
  },
  {
    title: 'Sticky, action & undo',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['useOgeToasts'],
      },
      name: 'DeleteRowButton',
      body: `const toasts = useOgeToasts();

const deleteRow = async () => {
  const ref = toasts.show({
    message: 'Row deleted',
    sticky: true, // action toasts should stick
    action: { text: 'Undo', handler: () => restore() },
  });
  const { reason } = await ref.closed; // 'action' | 'closeButton' | …
  console.log('closed because of', reason);
};

const restore = () => console.log('restored');`,
      jsx: `<OgeButton text="Delete row" severity="danger" onClick={deleteRow} />`,
    }),
  },
  {
    title: 'Promise toasts',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['useOgeToasts'],
      },
      name: 'PublishButton',
      body: `const toasts = useOgeToasts();

const publishPages = (): Promise<{ count: number }> =>
  fetch('/api/publish').then((response) => response.json());

// spinner → severity morph in place; the timer starts on settle
const publish = () => {
  toasts.promise(publishPages(), {
    loading: 'Publishing…',
    success: (result) => \`Published \${result.count} pages\`,
    error: (error) => ({ title: 'Publish failed', message: String(error) }),
  });
};`,
      jsx: `<OgeButton text="Publish" onClick={publish} />`,
    }),
  },
  {
    title: 'Coalescing & progress',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-overlay': ['useOgeToasts'],
      },
      name: 'ImportButton',
      body: `const toasts = useOgeToasts();
const failedRows = [3, 17, 42];

const report = () => {
  // identical toasts merge into one with a live ×N badge
  for (const _row of failedRows) {
    toasts.error('Import row failed', { coalesce: true });
  }

  // remaining-time progress bar; pauses with the timer on hover/focus
  toasts.info('With progress', { progressBar: true, displayTime: 6000 });
};`,
      jsx: `<OgeButton text="Import" onClick={report} />`,
    }),
  },
];

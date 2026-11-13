import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React notification center page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node. Section-for-section mirror of `../overlay/notification-center.ts`.
 */
export const OVERLAY_NOTIFICATION_CENTER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Notification center',
    description:
      'The bell shows the unread count; the panel is a feed (Page Down / Page Up between items). Scrolling to the end calls onLoadMore while hasMore is set.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-overlay': ['OgeNotificationCenter'] },
      types: { '@oge-ui/react-overlay': ['OgeNotification'] },
      name: 'NotificationCenterDemo',
      body: `const [items, setItems] = useState<readonly OgeNotification[]>([
  { id: 'n1', title: 'Build passed', time: Date.now() - 120_000, severity: 'success' },
  { id: 'n2', title: 'Invoice #1042 paid', time: Date.now() - 90_000_000, read: true },
]);
const [page, setPage] = useState(0);
const [loading, setLoading] = useState(false);
const loadOlder = () => {
  setLoading(true);
  // fetch the next page from your API, then append it
  setTimeout(() => {
    const older = Array.from({ length: 5 }, (_, i) => ({
      id: \`old-\${page}-\${i}\`,
      title: 'Weekly report is ready',
      time: Date.now() - (3 + page * 5 + i) * 86_400_000,
      read: true,
    }));
    setItems((current) => [...current, ...older]);
    setPage(page + 1);
    setLoading(false);
  }, 400);
};
const arrive = () =>
  setItems((current) => [
    { id: crypto.randomUUID(), title: 'New order received', time: Date.now() },
    ...current,
  ]);`,
      jsx: `<>
  <OgeNotificationCenter
    items={items}
    onItemsChange={setItems}
    hasMore={page < 3}
    loading={loading}
    onLoadMore={loadOlder}
    onReadChange={(e) => console.log(e.item.id, e.read)}
  />
  <button type="button" onClick={arrive}>
    Simulate a new notification
  </button>
</>`,
    }),
  },
];

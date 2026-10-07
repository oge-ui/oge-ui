/** Code samples rendered on the Next.js App Router guide. */
import { reactDemoSource } from '../../shared/react-demo-source';

export const INSTALL = `npm install @oge-ui/react          # every MIT React family
# or one family at a time
npm install @oge-ui/react-grid @oge-ui/react-inputs`;

export const LAYOUT = `// app/layout.tsx — a Server Component: global CSS and the client providers
import type { ReactNode } from 'react';
import '@oge-ui/react/styles.css';          // or @oge-ui/react-<family>/styles.css
import '@oge-ui/core/themes/dark.css';      // optional theme, shared with Angular
import { Providers } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}`;

export const PROVIDERS = `'use client';

import type { ReactNode } from 'react';
import { OgeLocaleProvider } from '@oge-ui/react';
import { de } from '@oge-ui/locales/de';

// app/providers.tsx — config and locale providers hold React context, so they
// live in a client module; the layout above stays a Server Component
export function Providers({ children }: { children: ReactNode }) {
  return <OgeLocaleProvider pack={de}>{children}</OgeLocaleProvider>;
}`;

export const SERVER_PAGE = `// app/orders/page.tsx — a Server Component rendering an OGE client component
import { OgeGrid } from '@oge-ui/react-grid';
import { getOrders } from '@/lib/orders';

const columns = [
  { field: 'id', caption: 'Order', width: 90, dataType: 'number' as const },
  { field: 'customer', caption: 'Customer' },
  { field: 'total', caption: 'Total', dataType: 'number' as const },
];

export default async function OrdersPage() {
  const orders = await getOrders();
  // only serializable props cross the boundary: arrays, plain objects, strings
  return <OgeGrid data={orders} keyField="id" columns={columns} locale="de-DE" />;
}`;

export const CLIENT_COMPONENT = reactDemoSource({
  react: ['useState'],
  use: {
    '@oge-ui/react-buttons': ['OgeButton'],
    '@oge-ui/react-grid': ['OgeGrid'],
  },
  name: 'OrdersBoard',
  before: `interface Order {
  readonly id: number;
  readonly customer: string;
}

const columns = [
  { field: 'id', caption: 'Order', width: 90, dataType: 'number' as const },
  { field: 'customer', caption: 'Customer' },
];`,
  body: `// event handlers are functions — they need a client module of your own
const [orders, setOrders] = useState<readonly Order[]>([
  { id: 1, customer: 'Ada' },
]);
const add = () =>
  setOrders((rows) => [...rows, { id: rows.length + 1, customer: 'Grace' }]);`,
  jsx: `<>
  <OgeButton text="Add order" onClick={add} />
  <OgeGrid data={orders} keyField="id" columns={columns} locale="en-US" />
</>`,
});

export const LAZY = `'use client';

import dynamic from 'next/dynamic';

// a heavy family the first paint does not need: load it after hydration
const Scheduler = dynamic(
  () => import('@oge-ui/react-scheduler').then((m) => m.OgeScheduler),
  { ssr: false, loading: () => <p>Loading the calendar…</p> },
);`;

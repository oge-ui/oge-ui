/**
 * Demo data shared by the list box and transfer list pages in both render
 * layers (the React demos import it too, so it lives outside either page).
 */

export interface DemoCity {
  id: number;
  name: string;
  country: string;
  closed?: boolean;
}

export const DEMO_CITIES: DemoCity[] = [
  { id: 1, name: 'Amsterdam', country: 'Netherlands' },
  { id: 2, name: 'Ankara', country: 'Türkiye' },
  { id: 3, name: 'Berlin', country: 'Germany' },
  { id: 4, name: 'Bonn', country: 'Germany', closed: true },
  { id: 5, name: 'Hamburg', country: 'Germany' },
  { id: 6, name: 'İstanbul', country: 'Türkiye' },
  { id: 7, name: 'İzmir', country: 'Türkiye' },
  { id: 8, name: 'Rotterdam', country: 'Netherlands' },
];

export interface DemoPermission {
  id: string;
  name: string;
  area: string;
  locked?: boolean;
}

export const DEMO_PERMISSIONS: DemoPermission[] = [
  { id: 'orders.read', name: 'View orders', area: 'Orders' },
  { id: 'orders.write', name: 'Edit orders', area: 'Orders' },
  { id: 'orders.refund', name: 'Issue refunds', area: 'Orders' },
  { id: 'users.read', name: 'View users', area: 'Users' },
  { id: 'users.invite', name: 'Invite users', area: 'Users' },
  { id: 'users.admin', name: 'Manage roles', area: 'Users', locked: true },
  { id: 'reports.read', name: 'View reports', area: 'Reports' },
  { id: 'reports.export', name: 'Export reports', area: 'Reports' },
];

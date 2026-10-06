import type { OgeListViewItemAction } from '@oge-ui/layout/list-view';

/** A person of the list view demos, shared by the Angular and React views. */
export interface ListViewPerson {
  id: number;
  name: string;
  role: string;
  team: string;
  away?: boolean;
}

export const LIST_VIEW_PEOPLE: readonly ListViewPerson[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Analyst', team: 'Research' },
  { id: 2, name: 'Grace Hopper', role: 'Compiler lead', team: 'Platform' },
  {
    id: 3,
    name: 'Alan Turing',
    role: 'Cryptanalyst',
    team: 'Research',
    away: true,
  },
  {
    id: 4,
    name: 'Margaret Hamilton',
    role: 'Flight software',
    team: 'Platform',
  },
  { id: 5, name: 'Katherine Johnson', role: 'Trajectories', team: 'Research' },
  { id: 6, name: 'Linus Torvalds', role: 'Kernel', team: 'Platform' },
  { id: 7, name: 'Barbara Liskov', role: 'Abstractions', team: 'Design' },
  { id: 8, name: 'Edsger Dijkstra', role: 'Algorithms', team: 'Research' },
  { id: 9, name: 'Radia Perlman', role: 'Networking', team: 'Platform' },
  { id: 10, name: 'Donald Knuth', role: 'Typesetting', team: 'Design' },
  { id: 11, name: 'Frances Allen', role: 'Optimization', team: 'Platform' },
  { id: 12, name: 'Hedy Lamarr', role: 'Frequency hopping', team: 'Design' },
];

/** 10 000 generated rows for the virtual-scrolling demo. */
export function listViewManyRows(
  count = 10_000,
): { id: number; name: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Ticket #${String(i + 1).padStart(5, '0')}`,
  }));
}

/** A city of the search / infinite-scroll demo. */
export interface ListViewCity {
  id: number;
  name: string;
  country: string;
}

const CITY_NAMES = [
  ['İstanbul', 'Türkiye'],
  ['Ankara', 'Türkiye'],
  ['İzmir', 'Türkiye'],
  ['Berlin', 'Germany'],
  ['München', 'Germany'],
  ['Köln', 'Germany'],
  ['Paris', 'France'],
  ['Lyon', 'France'],
  ['Zürich', 'Switzerland'],
  ['Genève', 'Switzerland'],
  ['Kraków', 'Poland'],
  ['Warszawa', 'Poland'],
  ['São Paulo', 'Brazil'],
  ['Brasília', 'Brazil'],
  ['Málaga', 'Spain'],
  ['Sevilla', 'Spain'],
] as const;

/** Page `page` (0-based) of the endless city feed, `size` rows each. */
export function listViewCityPage(page: number, size = 16): ListViewCity[] {
  return Array.from({ length: size }, (_, i) => {
    const n = page * size + i;
    const [name, country] = CITY_NAMES[n % CITY_NAMES.length];
    const round = Math.floor(n / CITY_NAMES.length);
    return {
      id: n + 1,
      name: round ? `${name} ${round + 1}` : name,
      country,
    };
  });
}

/** A message of the swipe-actions demo. */
export interface ListViewMessage {
  id: number;
  from: string;
  subject: string;
}

export const LIST_VIEW_INBOX: readonly ListViewMessage[] = [
  { id: 1, from: 'Build bot', subject: 'Nightly build passed' },
  { id: 2, from: 'Ayşe Kaya', subject: 'Design review moved to Friday' },
  { id: 3, from: 'Billing', subject: 'Your invoice for October' },
  { id: 4, from: 'Mehmet Demir', subject: 'Lunch?' },
  { id: 5, from: 'Security', subject: 'New sign-in from Chrome on Windows' },
];

const ARCHIVE_ICON = 'M3 7h18M5 7l1 12h12l1-12M9 11h6M4 4h16v3H4z';
const DELETE_ICON = 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3';

export const LIST_VIEW_INBOX_ACTIONS: readonly OgeListViewItemAction[] = [
  {
    key: 'archive',
    label: 'Archive',
    icon: ARCHIVE_ICON,
    severity: 'accent',
    shortcut: 'Shift+A',
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: DELETE_ICON,
    severity: 'danger',
    shortcut: 'Delete',
  },
];

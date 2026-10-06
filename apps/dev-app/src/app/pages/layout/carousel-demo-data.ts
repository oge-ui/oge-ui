import type { OgeCarouselItem } from '@oge-ui/layout/carousel';

/** Demo data of the carousel page, shared by the Angular and React views. */
export const CAROUSEL_DESTINATIONS: readonly OgeCarouselItem[] = [
  {
    key: 'coast',
    image: '/demo/carousel/coast.svg',
    imageAlt: 'A palm tree on a sandy beach by a calm blue sea',
    title: 'Turquoise Coast',
    description: 'Seven days of coves, ruins and slow mornings.',
  },
  {
    key: 'mountains',
    image: '/demo/carousel/mountains.svg',
    imageAlt: 'Snow-capped violet peaks under a pink evening sky',
    title: 'Kaçkar Mountains',
    description: 'Highland villages and the trail to the glacier lakes.',
  },
  {
    key: 'city',
    image: '/demo/carousel/city.svg',
    imageAlt: 'A city skyline with lit windows at sunset',
    title: 'Istanbul by night',
    description: 'Rooftops, ferries and the Bosphorus after dark.',
  },
  {
    key: 'forest',
    image: '/demo/carousel/forest.svg',
    imageAlt: 'Pine trees on green rolling hills',
    title: 'Black Sea forests',
    description: 'Tea gardens and misty pine forests above the coast.',
  },
  {
    key: 'desert',
    image: '/demo/carousel/desert.svg',
    imageAlt: 'A cactus on orange dunes under a low sun',
    title: 'Cappadocia valleys',
    description: 'Fairy chimneys, cave hotels and balloons at dawn.',
  },
];

/** A product row for the several-per-view demo (custom slide template). */
export const CAROUSEL_PRODUCTS: readonly OgeCarouselItem[] = [
  { key: 'p1', title: 'Desk lamp', description: '€49 · warm white' },
  { key: 'p2', title: 'Notebook', description: '€12 · dotted, A5' },
  { key: 'p3', title: 'Headphones', description: '€129 · noise cancelling' },
  { key: 'p4', title: 'Mug', description: '€15 · stoneware' },
  { key: 'p5', title: 'Backpack', description: '€89 · 20 litres' },
  { key: 'p6', title: 'Plant pot', description: '€24 · terracotta' },
  { key: 'p7', title: 'Keyboard', description: '€99 · low profile' },
];

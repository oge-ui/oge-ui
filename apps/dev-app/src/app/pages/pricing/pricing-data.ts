import { PRO_FAMILIES, PRO_PRICE_USD } from '../../shared/pro-license';

/** One question of a page FAQ; `answer` is plain text (no markup). */
export interface FaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

/** The MIT packages, as the `/license` page lists them. */
export const MIT_PACKAGES = [
  'oge-ui',
  '@oge-ui/core',
  '@oge-ui/grid',
  '@oge-ui/tree-list',
  '@oge-ui/inputs',
  '@oge-ui/buttons',
  '@oge-ui/overlay',
  '@oge-ui/layout',
  '@oge-ui/navigation',
  '@oge-ui/tabs',
  '@oge-ui/forms',
  '@oge-ui/editor',
  '@oge-ui/upload',
  '@oge-ui/locales',
] as const;

const PRO_NAMES = PRO_FAMILIES.map((family) => family.name);

/**
 * Free vs Pro, row by row. Every cell restates a term from `/license` —
 * nothing here may promise more than the license page does.
 */
export const PLAN_ROWS: readonly (readonly string[])[] = [
  ['Price', 'Free', `$${PRO_PRICE_USD} per developer per year`],
  ['License', 'MIT', 'OGE UI Commercial License (source-available)'],
  [
    'Data Grid, Tree List, inputs, forms, editor, upload, buttons, overlay, layout, navigation, tabs, locales',
    'Included, any use',
    'Included, any use (MIT)',
  ],
  [
    'Grid Excel/PDF export, master-detail, range selection, server-side operations',
    'Included, any use',
    'Included, any use (MIT)',
  ],
  ...PRO_NAMES.map((name) => [
    name,
    'Free for evaluation and development',
    'Licensed for production',
  ]),
  ['Angular and React', 'Both', 'Both, one key'],
  [
    'Evaluation, development, testing',
    'Free',
    'Free, no sign-up — install from npm',
  ],
  [
    'Production use',
    'Free',
    'One seat per developer writing code against the Pro packages',
  ],
  ['End users, apps, servers, deployments', 'Unlimited', 'Unlimited'],
  [
    'Updates',
    'Every release',
    'Every release published while the key is current — 12 months, then keep what you have',
  ],
  [
    'License check',
    'None',
    'Offline signature check in the browser; nothing is sent anywhere',
  ],
];

export const PRICING_FAQ: readonly FaqEntry[] = [
  {
    id: 'is-oge-ui-free',
    question: 'Is OGE UI free for commercial use?',
    answer:
      'Yes. The Data Grid, Tree List, inputs, buttons, overlay, layout, navigation, tabs, forms, editor and upload packages and their React counterparts are MIT-licensed and free for any use, commercial included. These packages and every feature currently in them will remain MIT; no feature that is free today will move behind a paid license.',
  },
  {
    id: 'what-does-pro-cost',
    question: 'How much does OGE UI Pro cost?',
    answer: `$${PRO_PRICE_USD} per developer per year. It covers the seven commercial families — ${PRO_NAMES.join(', ')} — in both Angular and React with one key. For invoices, purchase orders or volume pricing, write to the sales address on the licensing page.`,
  },
  {
    id: 'free-to-evaluate',
    question: 'Do I need a license to try the Pro components?',
    answer:
      'No. OGE UI Pro is free for evaluation, development, testing and any other non-production use: install the packages from npm and try everything, with no sign-up. A license is needed for production.',
  },
  {
    id: 'who-needs-a-seat',
    question: 'Who needs a seat?',
    answer:
      'Each developer who writes code against the Pro packages needs one seat. End users, servers, apps and deployments are unlimited.',
  },
  {
    id: 'when-the-license-lapses',
    question: 'What happens when my license expires?',
    answer:
      'A key covers every release published while it is current, forever. When it lapses your apps keep working on those versions; renew to get later releases.',
  },
  {
    id: 'without-a-key',
    question:
      'What happens if a Pro component runs in production without a key?',
    answer:
      'Nothing breaks: the component still works in full. The page gets one console warning per package and a small “OGE UI Pro — unlicensed” link in the corner. Development hosts such as localhost, *.local, *.test, StackBlitz, CodeSandbox and jsdom or happy-dom test runs show no notice at all.',
  },
  {
    id: 'does-it-phone-home',
    question: 'Does the license check contact a server?',
    answer:
      'No. The key is checked offline, in the browser, against a signature — nothing is sent anywhere and no network access is needed. The key is not a secret; shipping it in your bundle is expected.',
  },
  {
    id: 'getting-the-key',
    question: 'How do I get my license key after buying?',
    answer:
      'Open the “Get your key” page and enter the order number from your receipt and the email you bought with. You can come back any time to retrieve the key again, then register it once with ogeSetLicenseKey() before the first Pro component renders.',
  },
];

/** schema.org `FAQPage` for a list of questions. */
export function faqPageJsonLd(entries: readonly FaqEntry[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

/** schema.org `Product` + `Offer` for OGE UI Pro. */
export const PRO_PRODUCT_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'OGE UI Pro',
  description: `Commercial OGE UI component families for Angular and React — ${PRO_NAMES.join(', ')}. Free for evaluation and development; a production license costs $${PRO_PRICE_USD} per developer per year.`,
  brand: { '@type': 'Brand', name: 'OGE UI' },
  url: 'https://www.ogeui.com/pricing',
  offers: {
    '@type': 'Offer',
    url: 'https://www.ogeui.com/pricing',
    price: String(PRO_PRICE_USD),
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: PRO_PRICE_USD,
      priceCurrency: 'USD',
      unitText: 'per developer per year',
      referenceQuantity: {
        '@type': 'QuantitativeValue',
        value: 1,
        unitCode: 'ANN',
      },
    },
  },
} as const;

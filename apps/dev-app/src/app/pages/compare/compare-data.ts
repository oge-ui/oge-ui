import { PRO_PRICE_USD } from '../../shared/pro-license';
import type { FaqEntry } from '../pricing/pricing-data';

/**
 * Content of the `/compare/*` pages.
 *
 * Sources, so the pages stay honest when they are refreshed:
 * - OGE UI facts: the packages themselves, `/license` and `ROADMAP.md` (the
 *   "where they are stronger" lists come from rows still marked Missing or
 *   Partial there — re-check them against `packages/` before reusing one).
 * - Competitor facts: the vendor pages listed in each `sources` array, read on
 *   {@link CHECKED_ON}. Anything a vendor page did not state is written as
 *   "see the vendor's docs", never guessed.
 */

/** When the competitor facts were last checked against the vendor pages. */
export const CHECKED_ON = '15 October 2026';

/** A sentence with an optional link to an OGE docs page at its end. */
export interface LinkedText {
  readonly text: string;
  readonly link?: { readonly label: string; readonly path: string };
}

export interface Competitor {
  /** route segment under `/compare` */
  readonly slug: string;
  readonly name: string;
  /** the search phrase the intro names, e.g. "AG Grid alternative for Angular and React" */
  readonly keyword: string;
  /** one-line summary for the hub card */
  readonly summary: string;
  readonly intro: readonly string[];
  /** where the competitor is the better choice */
  readonly pickThem: readonly string[];
  /** where OGE UI is the better choice */
  readonly pickOge: readonly string[];
  /** [aspect, OGE UI, competitor] */
  readonly rows: readonly (readonly [string, string, string])[];
  readonly migration: readonly LinkedText[];
  readonly faq: readonly FaqEntry[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
  /**
   * The cheapest published per-developer price of the commercial tier, as the
   * `Price` row states it — drawn in the price comparison bars. `basis` says
   * what the money buys (perpetual or subscription), since the models differ.
   */
  readonly entryPrice: { readonly usd: number; readonly basis: string };
}

const OGE_FRAMEWORKS =
  'Angular 21.2+ and React 18+ — two native render layers over one framework-free engine';
const OGE_ANGULAR =
  'Signal inputs, outputs and models; standalone components; zoneless apps supported';
const OGE_LICENSE =
  'MIT core suite (grid, tree list, inputs, forms, editor, upload, navigation, layout, overlay); Pivot, Gantt, Scheduler, Kanban, Charts, BPMN and Spreadsheet are OGE UI Pro';
const OGE_PRICE =
  'Free (MIT); OGE UI Pro $' +
  PRO_PRICE_USD +
  ' per developer per year, free for evaluation and development';
const OGE_A11Y =
  'WAI-ARIA APG keyboard patterns, axe checks in CI, a published self-assessed WCAG 2.2 A/AA conformance report';
const VENDOR_A11Y =
  'Documented keyboard and screen-reader support — see the vendor’s accessibility docs';

export const COMPETITORS: readonly Competitor[] = [
  {
    slug: 'ag-grid',
    entryPrice: {
      usd: 999,
      basis: 'Enterprise, perpetual with one year of updates',
    },
    name: 'AG Grid',
    keyword: 'AG Grid alternative for Angular and React',
    summary:
      'The most widely used JavaScript data grid. OGE UI ships range selection, Excel export and master-detail under MIT; AG Grid has the deeper grid-only feature set.',
    intro: [
      'AG Grid is a dedicated JavaScript data grid with wrappers for Angular, React and Vue, split into a free MIT Community edition and a paid Enterprise edition. OGE UI is a complete component suite for Angular and React whose Data Grid is MIT-licensed in full.',
      'If you are looking for an AG Grid alternative for Angular and React, the main difference is where the paywall sits: features AG Grid sells in Enterprise — row grouping, range selection, clipboard, Excel export, master-detail, server-side operations — are part of the free OGE grid. The comparison below is meant to help you choose, so it starts with where AG Grid is the better pick.',
    ],
    pickThem: [
      'You need a grid-only feature OGE UI does not have yet: integrated charting from a selected range, columns and filters tool panels, a status bar with range aggregates, row numbers, find-without-filtering, or spreadsheet formulas in cells.',
      'You want pivoting or tree data inside the same grid component; OGE UI keeps them in the separate Tree List and Pivot Grid components.',
      'You build with Vue or plain JavaScript; OGE UI targets Angular and React only.',
      'You value a very long track record and a large community over a younger library.',
      'You want AI features in the grid today (AG Grid ships an AI toolkit); OGE UI has none in its components yet.',
    ],
    pickOge: [
      'You need grouping, range selection, Excel/PDF export, master-detail or server-side data without buying a license — they are MIT in OGE UI.',
      'You want more than a grid: inputs, forms, rich-text editor, upload, navigation, layout and overlays from the same suite, on the same engine and theme tokens.',
      'You want Angular components written natively with signals rather than a wrapper around a framework-agnostic core.',
      `You also need a Pivot Grid, Gantt, Scheduler, Kanban, charts or an Excel viewer: OGE UI Pro covers all seven commercial families for $${PRO_PRICE_USD} per developer per year.`,
    ],
    rows: [
      [
        'Frameworks',
        OGE_FRAMEWORKS,
        'JavaScript core with Angular, React and Vue wrappers',
      ],
      [
        'Angular API',
        OGE_ANGULAR,
        'Vendor states full compatibility with zoneless Angular apps',
      ],
      [
        'License',
        OGE_LICENSE,
        'Community edition: MIT. Enterprise: commercial EULA, license key required in production (watermark and console error without one)',
      ],
      [
        'Price',
        OGE_PRICE,
        'Enterprise $999 per developer, perpetual with one year of updates; Enterprise Bundle with AG Charts $1,498',
      ],
      ['Accessibility', OGE_A11Y, VENDOR_A11Y],
      ['Row and column virtualization', 'MIT', 'Community'],
      ['Row grouping and aggregation', 'MIT', 'Enterprise'],
      [
        'Cell range selection, clipboard paste, fill handle',
        'MIT',
        'Enterprise (range selection, Excel-like clipboard)',
      ],
      [
        'Excel export',
        'MIT (XLSX with groups, summaries and styles; PDF too)',
        'Enterprise',
      ],
      ['Master-detail', 'MIT', 'Enterprise'],
      [
        'Server-side sort, filter, group and paging',
        'MIT (`CustomDataSource`, OData)',
        'Enterprise (Server-Side Row Model)',
      ],
      [
        'Pivoting',
        'OGE UI Pro (separate Pivot Grid component)',
        'Enterprise (in the grid)',
      ],
      ['Integrated charts from a selection', 'Not available', 'Enterprise'],
      [
        'Other components',
        'Full suite: inputs, forms, editor, upload, navigation, layout, overlay',
        'Grid and charts only',
      ],
    ],
    migration: [
      {
        text: 'Server-Side Row Model: implement one `load(options)` function on a `CustomDataSource`. It receives serializable `skip`, `take`, `sort`, `filter`, `group` and summary options; the grid handles the windowing.',
        link: {
          label: 'Remote data',
          path: '/components/data-grid/remote-data',
        },
      },
      {
        text: 'Infinite row model: the infinite-scroll mode fetches sparse row blocks around the viewport.',
        link: {
          label: 'Infinite scroll',
          path: '/components/data-grid/infinite-scroll',
        },
      },
      {
        text: "Range selection and clipboard: `selectionMode: 'cell'` with `[(selectedRanges)]` gives Shift+click and drag ranges, Ctrl+C as TSV, paste from Excel and the fill handle.",
        link: {
          label: 'Range selection',
          path: '/components/data-grid/range-selection',
        },
      },
      {
        text: 'Pinned top and bottom rows map to `pinnedTopRows` and `pinnedBottomRows`.',
        link: {
          label: 'Pinned rows',
          path: '/components/data-grid/pinned-rows',
        },
      },
      {
        text: 'Cell class rules map to the `rowClass` and `cellClass` callbacks, and to column `conditionalFormats` for data bars, color scales and icon sets.',
        link: {
          label: 'Conditional formatting',
          path: '/components/data-grid/conditional-formatting',
        },
      },
      {
        text: 'Auto-sizing columns maps to `autoFitColumns()` and `autoFitColumn(field)`; saving column state maps to `stateKey` persistence.',
        link: {
          label: 'Persistence',
          path: '/components/data-grid/persistence',
        },
      },
    ],
    faq: [
      {
        id: 'is-oge-ui-a-free-ag-grid-alternative',
        question: 'Is OGE UI a free AG Grid Enterprise alternative?',
        answer:
          'For many grids, yes: row grouping, range selection, clipboard paste, Excel export, master-detail and server-side operations are MIT-licensed in OGE UI, while AG Grid sells them in Enterprise. AG Grid still has grid features OGE UI lacks, such as integrated charts, tool panels and cell formulas.',
      },
      {
        id: 'ag-grid-frameworks',
        question: 'Does OGE UI support Vue like AG Grid?',
        answer:
          'No. OGE UI ships native render layers for Angular and React only. AG Grid also offers Vue and plain JavaScript.',
      },
      {
        id: 'ag-grid-pivot',
        question: 'Does OGE UI have pivoting like AG Grid Enterprise?',
        answer: `Yes, as a separate Pivot Grid component in OGE UI Pro ($${PRO_PRICE_USD} per developer per year, free for evaluation and development). AG Grid pivots inside its main grid.`,
      },
      {
        id: 'ag-grid-price',
        question: 'How does the price compare with AG Grid Enterprise?',
        answer: `The OGE UI Data Grid costs nothing. AG Grid lists Enterprise at $999 per developer as a perpetual license with one year of updates. OGE UI Pro, needed only for the Pivot Grid, Gantt, Scheduler, Kanban, Charts, BPMN and Spreadsheet families, is $${PRO_PRICE_USD} per developer per year.`,
      },
    ],
    sources: [
      {
        label: 'AG Grid pricing',
        url: 'https://www.ag-grid.com/license-pricing/',
      },
      {
        label: 'AG Grid licensing',
        url: 'https://www.ag-grid.com/javascript-data-grid/licensing/',
      },
      {
        label: 'AG Grid Community vs Enterprise',
        url: 'https://www.ag-grid.com/angular-data-grid/community-vs-enterprise/',
      },
      {
        label: 'AG Grid Angular compatibility',
        url: 'https://www.ag-grid.com/angular-data-grid/compatibility/',
      },
    ],
  },
  {
    slug: 'kendo-ui',
    entryPrice: { usd: 799, basis: 'Yearly subscription, Lite support' },
    name: 'Kendo UI',
    keyword: 'Kendo UI alternative for Angular and React',
    summary:
      'A large commercial suite with paid support. OGE UI covers the data-heavy core under MIT, with signal-based Angular components and a matching React layer.',
    intro: [
      'Kendo UI by Progress Telerik is a commercial component suite with separate libraries for Angular, React, Vue and jQuery, sold as a yearly per-developer subscription with technical support. OGE UI is an open-core suite for Angular and React: the Data Grid, Tree List, inputs, forms and the rest of the core are MIT.',
      'If you are evaluating a Kendo UI alternative for Angular and React, the trade-off is breadth and vendor support against cost and a modern Angular API. Here is where each one wins.',
    ],
    pickThem: [
      'You need a much larger catalogue: Telerik markets more than 110 Angular components, well beyond OGE UI’s.',
      'You need guaranteed response times; Kendo licenses include technical support tiers.',
      'You need Material or Fluent look-alike themes; OGE UI ships its own themes plus Bootstrap and Tailwind bridges.',
      'You need an OLAP/XMLA data source for the pivot grid, or a stacked card layout for the grid on phones.',
      'You want AI components and grid AI assistants today.',
      'You also build in Vue or jQuery.',
    ],
    pickOge: [
      'You want a production-ready Data Grid, Tree List, inputs and forms with no license fee — they are MIT in OGE UI.',
      'You want Angular components built on signal inputs, outputs and models throughout, and zoneless apps supported across the suite.',
      'You ship both Angular and React apps and want the same engine, behaviour and design tokens in both.',
      `You need the enterprise families (Pivot Grid, Gantt, Scheduler, Kanban, Charts, BPMN) at $${PRO_PRICE_USD} per developer per year.`,
    ],
    rows: [
      [
        'Frameworks',
        OGE_FRAMEWORKS,
        'Separate libraries for Angular, React, Vue and jQuery',
      ],
      [
        'Angular API',
        OGE_ANGULAR,
        'Zoneless support being added package by package in 2026 releases — check each package’s release notes',
      ],
      [
        'License',
        OGE_LICENSE,
        'Commercial; Kendo UI for Angular needs a trial or commercial license. KendoReact Free offers 50+ components at no cost',
      ],
      [
        'Price',
        OGE_PRICE,
        'Yearly subscription per developer: $799 (Lite support), $899 (Priority), $1,299 (Ultimate)',
      ],
      ['Accessibility', OGE_A11Y, VENDOR_A11Y],
      [
        'Support',
        'GitHub issues and email',
        'Included in the subscription, by support tier',
      ],
      [
        'Data grid',
        'MIT: virtualization, grouping, editing, range selection, Excel/PDF export, master-detail, server-side data',
        'Commercial',
      ],
      ['Pivot Grid, Gantt, Scheduler', 'OGE UI Pro', 'Commercial'],
      [
        'Component count',
        'A focused suite for data-heavy apps',
        '110+ Angular components',
      ],
    ],
    migration: [
      {
        text: 'The OGE input docs name the Kendo counterpart of each editor. MaskedTextBox maps to the OGE Masked Text Box, and Kendo’s `maskValidation` to its built-in required-slots check.',
        link: {
          label: 'Masked Text Box',
          path: '/components/inputs/masked-text-box',
        },
      },
      {
        text: 'Kendo’s ColorGradient and ColorPalette map to the OGE Color Gradient and Color Palette editors.',
        link: {
          label: 'Color Gradient',
          path: '/components/inputs/color-gradient',
        },
      },
      {
        text: 'OTP Input, Rating, Signature and ListBox have direct OGE equivalents with the same roles.',
        link: { label: 'OTP Input', path: '/components/inputs/otp-input' },
      },
      {
        text: 'A grid detail template maps to the OGE master-detail row.',
        link: {
          label: 'Master-detail',
          path: '/components/data-grid/master-detail',
        },
      },
      {
        text: 'Theming moves to CSS design tokens; the Bootstrap bridge theme picks up an existing Bootstrap look.',
        link: { label: 'Theming', path: '/getting-started/styling' },
      },
    ],
    faq: [
      {
        id: 'is-there-a-free-kendo-alternative',
        question: 'Is there a free alternative to Kendo UI for Angular?',
        answer:
          'OGE UI’s core suite — Data Grid, Tree List, inputs, forms, editor, upload, navigation, layout and overlays — is MIT-licensed and free for commercial use. Kendo UI for Angular components need a trial or commercial license.',
      },
      {
        id: 'kendo-react',
        question: 'Does OGE UI cover React as well as Kendo does?',
        answer:
          'OGE UI ships a React layer for every family on the same engine as the Angular one. KendoReact has a far larger catalogue, including a free tier of 50+ components.',
      },
      {
        id: 'kendo-support',
        question: 'Does OGE UI offer paid support like Telerik?',
        answer:
          'No support tiers are sold. Questions go to GitHub issues or to the licensing email; invoices, purchase orders and volume pricing for OGE UI Pro are handled by email.',
      },
      {
        id: 'kendo-price',
        question: 'How does the price compare with Kendo UI?',
        answer: `Telerik lists Kendo UI at $799 to $1,299 per developer per year depending on the support tier. OGE UI’s core is free, and OGE UI Pro is $${PRO_PRICE_USD} per developer per year.`,
      },
    ],
    sources: [
      {
        label: 'Kendo UI pricing',
        url: 'https://www.telerik.com/purchase/kendo-ui',
      },
      {
        label: 'Kendo UI for Angular FAQ',
        url: 'https://www.telerik.com/kendo-angular-ui/components/faq',
      },
      {
        label: 'KendoReact Free',
        url: 'https://www.telerik.com/kendo-react-ui/components/free',
      },
    ],
  },
  {
    slug: 'devextreme',
    entryPrice: {
      usd: 900,
      basis: 'DevExtreme Complete, renewal about $450 a year',
    },
    name: 'DevExtreme',
    keyword: 'DevExtreme alternative for Angular and React',
    summary:
      'DevExpress’s broad JavaScript suite. OGE UI’s grid follows many DevExtreme option names and is MIT; DevExtreme is wider and backed by a large vendor.',
    intro: [
      'DevExtreme by DevExpress is a commercial JavaScript component suite for Angular, React, Vue and jQuery, licensed as a yearly per-developer subscription. OGE UI is an open-core suite for Angular and React with an MIT Data Grid, Tree List, inputs and forms.',
      'If you need a DevExtreme alternative for Angular and React, you will find much of the grid vocabulary familiar: many OGE grid options and the remote load options deliberately use DevExtreme’s names. Here is an honest look at where each one fits.',
    ],
    pickThem: [
      'You need breadth: DevExtreme ships many more components, plus a long-established vendor behind them.',
      'You use ASP.NET on the server and want DevExpress’s back-end data integration.',
      'You need an OLAP/XMLA pivot data source, Material or Fluent look-alike themes, or AI columns and an AI assistant in the grid.',
      'You also build in Vue or jQuery.',
    ],
    pickOge: [
      'You want the grid, tree list, inputs and forms without a subscription — they are MIT in OGE UI.',
      'You want Angular components built on signals and a React layer that is native React, not a wrapper.',
      'You want to keep DevExtreme-style grid option names while moving to a modern Angular or React codebase.',
      `You need Pivot Grid, Gantt, Scheduler, Kanban, Charts or BPMN at $${PRO_PRICE_USD} per developer per year.`,
    ],
    rows: [
      ['Frameworks', OGE_FRAMEWORKS, 'Angular, React, Vue and jQuery'],
      [
        'Angular API',
        OGE_ANGULAR,
        'Not stated in the vendor pages we checked — see the vendor’s docs',
      ],
      [
        'License',
        OGE_LICENSE,
        'Commercial, 12-month subscription; free trial, no free tier listed',
      ],
      [
        'Price',
        OGE_PRICE,
        'DevExtreme Complete about $900 per developer, renewal about $450 a year',
      ],
      ['Accessibility', OGE_A11Y, VENDOR_A11Y],
      ['Data grid', 'MIT', 'Commercial'],
      ['Tree list', 'MIT', 'Commercial'],
      [
        'Pivot grid',
        'OGE UI Pro (local and remote data; no OLAP/XMLA)',
        'Commercial (includes OLAP/XMLA)',
      ],
      ['Scheduler, Gantt', 'OGE UI Pro', 'Commercial'],
    ],
    migration: [
      {
        text: 'Remote data: a `CustomDataSource` `load(options)` receives `skip`, `take`, `sort`, `filter`, `group`, `groupSummary`, `totalSummary`, `requireTotalCount` and `requireGroupCount`. The names match DevExtreme’s load options, but the filter is a typed expression tree rather than nested arrays, so a server adapter needs a small translation.',
        link: {
          label: 'Remote data',
          path: '/components/data-grid/remote-data',
        },
      },
      {
        text: 'Column options keep DevExtreme names where the behaviour matches: `hidingPriority`, `calculateSortValue`, `calculateFilterExpression`, `cellHintEnabled` and `columnAutoWidth`.',
        link: { label: 'Columns', path: '/components/data-grid/columns' },
      },
      {
        text: '`rowPrepared` and `cellPrepared` events and the `headerFilter` popup work as their DevExtreme namesakes do.',
        link: { label: 'Filtering', path: '/components/data-grid/filtering' },
      },
      {
        text: 'Masked editors: DevExtreme’s `useMaskedValue` corresponds to the Masked Text Box’s `includeLiterals`.',
        link: {
          label: 'Masked Text Box',
          path: '/components/inputs/masked-text-box',
        },
      },
    ],
    faq: [
      {
        id: 'is-there-a-free-devextreme-alternative',
        question: 'Is there a free alternative to the DevExtreme DataGrid?',
        answer:
          'The OGE UI Data Grid and Tree List are MIT-licensed, with grouping, summaries, editing, master-detail, range selection, Excel/PDF export and server-side data. DevExtreme components require a paid subscription.',
      },
      {
        id: 'devextreme-option-names',
        question: 'Will my DevExtreme grid configuration carry over?',
        answer:
          'Partly. Many OGE option and event names follow DevExtreme — hidingPriority, calculateSortValue, cellHintEnabled, columnAutoWidth, rowPrepared, cellPrepared — and the remote load options share their names. It is not a drop-in replacement: templates, the filter expression format and the component markup differ.',
      },
      {
        id: 'devextreme-vue',
        question: 'Does OGE UI support Vue or jQuery like DevExtreme?',
        answer: 'No. OGE UI targets Angular and React only.',
      },
      {
        id: 'devextreme-price',
        question: 'How does the price compare with DevExtreme?',
        answer: `DevExpress lists DevExtreme Complete at about $900 per developer with a yearly renewal of about $450. OGE UI’s core is free, and OGE UI Pro is $${PRO_PRICE_USD} per developer per year.`,
      },
    ],
    sources: [
      { label: 'DevExtreme pricing', url: 'https://js.devexpress.com/Buy/' },
    ],
  },
  {
    slug: 'primeng',
    entryPrice: {
      usd: 599,
      basis: 'Commercial, perpetual with one year of updates',
    },
    name: 'PrimeNG',
    keyword: 'PrimeNG alternative for Angular',
    summary:
      'The popular Angular library, now continuing as part of PrimeUI. OGE UI keeps its core MIT and adds a React layer on the same engine.',
    intro: [
      'PrimeNG is a large Angular component library from PrimeTek. Its GitHub repository now states that it is no longer under active development and receives security fixes only: development continues as part of PrimeUI, and the MIT-licensed releases stay MIT. New releases from PrimeNG 22 on come under the PrimeUI license, with a free Community license for eligible small organizations and a paid Commercial license for everyone else.',
      'If you are looking for a PrimeNG alternative for Angular — whether because of the license change or because you also ship React — here is how OGE UI compares, starting with where PrimeNG is the better pick.',
    ],
    pickThem: [
      'You want the widest catalogue of general-purpose Angular components; PrimeNG has many more than OGE UI.',
      'You qualify for the PrimeUI Community license and want its full component set at no cost.',
      'Your app already uses PrimeNG’s theming presets and you want to keep its look.',
      'You need Vue as well (PrimeVue, a separate library from the same vendor).',
    ],
    pickOge: [
      'You need an MIT-licensed, actively developed suite with no eligibility rules: the OGE UI core is free for organizations of any size.',
      'You need a data-heavy grid: OGE UI’s MIT grid adds grouping with summaries, range selection, fill handle, Excel/PDF export, master-detail and server-side data.',
      'You ship React too and want the same components, engine and design tokens there.',
      `You need a Pivot Grid, Gantt, Scheduler, Kanban, Charts or BPMN editor (OGE UI Pro, $${PRO_PRICE_USD} per developer per year).`,
    ],
    rows: [
      [
        'Frameworks',
        OGE_FRAMEWORKS,
        'Angular only (PrimeReact and PrimeVue are separate libraries)',
      ],
      [
        'Angular API',
        OGE_ANGULAR,
        'Not verified for the PrimeUI releases — see the vendor’s docs',
      ],
      [
        'Project status',
        'Actively developed, MIT core',
        'Repository in security-fix-only mode; development continues under PrimeUI',
      ],
      [
        'License',
        OGE_LICENSE,
        'Releases published under MIT stay MIT. PrimeNG 22+: PrimeUI Community (free if eligible) or Commercial',
      ],
      [
        'Price',
        OGE_PRICE,
        'Community free for individuals, students, non-profits and organizations under $1M revenue, 5 developers, 10 employees and $3M funding. Commercial $599 per developer (perpetual, one year of updates; $799 from 2027), updates $399 per developer per year after',
      ],
      ['Accessibility', OGE_A11Y, VENDOR_A11Y],
      [
        'Data grid',
        'MIT: row and column virtualization, grouping, editing, range selection, Excel/PDF export, master-detail, server-side data',
        'Table component; see the vendor’s docs for its feature set',
      ],
      [
        'Pivot Grid, Gantt, Scheduler, Kanban',
        'OGE UI Pro',
        'Not part of the PrimeNG library',
      ],
    ],
    migration: [
      {
        text: 'Several OGE input pages name their PrimeNG counterpart: the Checkbox group, Listbox, InputOtp and Rating each map to an OGE editor with the same role.',
        link: {
          label: 'Check Box Group',
          path: '/components/inputs/check-box-group',
        },
      },
      {
        text: 'p-table lazy loading maps to a `CustomDataSource`, whose `load(options)` receives paging, sorting, filtering and grouping as one serializable object.',
        link: {
          label: 'Remote data',
          path: '/components/data-grid/remote-data',
        },
      },
      {
        text: 'Every OGE Angular component is standalone, OnPush and signal-based, so it drops into a modern Angular app without NgModules.',
        link: { label: 'Set up your project', path: '/getting-started/setup' },
      },
      {
        text: 'Themes are CSS design tokens; the Theme Builder exports your colors, radius and density as CSS variables.',
        link: {
          label: 'Theme Builder',
          path: '/getting-started/theme-builder',
        },
      },
    ],
    faq: [
      {
        id: 'is-primeng-still-open-source',
        question: 'Is PrimeNG still open source?',
        answer:
          'Releases published under the MIT license remain MIT. The PrimeNG repository now receives security fixes only, and new releases from PrimeNG 22 on are distributed under the PrimeUI license, which has a free Community tier for eligible organizations and a paid Commercial tier.',
      },
      {
        id: 'primeng-mit-alternative',
        question: 'Is there an MIT-licensed alternative to PrimeNG?',
        answer:
          'OGE UI’s core — Data Grid, Tree List, inputs, forms, editor, upload, navigation, layout, overlays, buttons and tabs — is MIT and actively developed, with no eligibility limits. Its catalogue is smaller than PrimeNG’s.',
      },
      {
        id: 'primeng-react',
        question: 'Can I use the same components in React?',
        answer:
          'Yes. Every OGE UI family has a React layer on the same framework-free engine, with the same behaviour and design tokens. PrimeReact is a separate library from PrimeTek.',
      },
      {
        id: 'primeng-price',
        question: 'How does the price compare with PrimeUI Commercial?',
        answer: `PrimeUI lists Commercial at $599 per developer as a perpetual license with one year of updates through 2026, then $799. OGE UI’s core is free for everyone; OGE UI Pro, for the enterprise families only, is $${PRO_PRICE_USD} per developer per year.`,
      },
    ],
    sources: [
      {
        label: 'PrimeNG repository notice',
        url: 'https://github.com/primefaces/primeng',
      },
      { label: 'PrimeUI announcement', url: 'https://primeui.dev/nextchapter' },
    ],
  },
];

export function competitorBySlug(slug: string): Competitor {
  const found = COMPETITORS.find((competitor) => competitor.slug === slug);
  if (!found) throw new Error(`Unknown competitor: ${slug}`);
  return found;
}

/** Backticks mark inline code in this file; JSON-LD wants plain text. */
export function plainText(text: string): string {
  return text.replace(/`/g, '');
}

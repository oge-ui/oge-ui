import type { ApiEntry, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/locales/src/**, packages/ui/src/lib/locale.ts
 * and packages/react/oge/src/lib/locale-provider.tsx — keep in sync with the
 * source TSDoc when the public API changes.
 */

const LANGUAGES: readonly (readonly [string, string, string])[] = [
  ['de', 'de', 'German'],
  ['fr', 'fr', 'French'],
  ['es', 'es', 'Spanish'],
  ['it', 'it', 'Italian'],
  ['ptBR', 'pt-BR', 'Brazilian Portuguese'],
  ['tr', 'tr', 'Turkish'],
  ['ja', 'ja', 'Japanese'],
  ['zhCN', 'zh-CN', 'Simplified Chinese'],
  ['ar', 'ar', "Arabic (<code>dir: 'rtl'</code>)"],
  ['he', 'he', "Hebrew (<code>dir: 'rtl'</code>)"],
];

const PACK_ENTRIES: readonly ApiEntry[] = LANGUAGES.map(
  ([name, code, language]) => ({
    name,
    type: 'OgeLocalePack',
    description: `${language} — every catalog, MIT and commercial. <code>import { ${name} } from '@oge-ui/locales/${code}'</code>.`,
  }),
);

/** The Angular wiring, `provideOgeLocale()` from `oge-ui`. */
export const OGE_LOCALE_PROVIDER_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'provideOgeLocale(pack)',
          type: '(pack: OgeLocalePack | (() => OgeLocalePack)) => Provider[]',
          description:
            'From <code>oge-ui</code>. Provides every MIT family’s config — grid / tree list, inputs, buttons, overlay, tabs, forms, upload, the layout and navigation components — with the pack’s slice merged over the English catalog, plus the pack’s <code>locale</code> for the grid and the editors. A function makes it live: the language follows the signals it reads. It owns those config tokens — provide a family’s own config after it to change other options. <code>LOCALE_ID</code> and the page’s <code>dir</code> stay the app’s job; commercial families take their slice through their own providers.',
        },
        {
          name: 'pack',
          type: 'OgeLocalePack | (() => OgeLocalePack)',
          description:
            'The pack to apply — a static pack, or a function reading a signal for runtime switching (<code>provideOgeLocale(() =&gt; pack())</code>).',
        },
      ],
    },
  ],
};

/** The React wiring, `<OgeLocaleProvider>` from `@oge-ui/react`. */
export const OGE_REACT_LOCALE_PROVIDER_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'OgeLocaleProvider',
          type: '(props: OgeLocaleProviderProps) => JSX.Element',
          description:
            'From <code>@oge-ui/react</code>. Wraps the subtree in every MIT family’s config provider, each with the pack’s slice merged over the English catalog, plus the pack’s <code>locale</code> for the grid and the editors. Family providers nested inside still apply on top. The page’s <code>dir</code> stays the app’s job; commercial families take their slice through their own providers.',
        },
        {
          name: 'pack',
          type: 'OgeLocalePack',
          description:
            'The pack to apply. Pass a different pack (from state) to switch language at runtime — context re-renders every component beneath.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description: 'The localized subtree.',
        },
      ],
    },
  ],
};

/** `@oge-ui/locales` itself — framework-free, the same in both layers. */
export const OGE_LOCALE_PACKS_API: ApiSections = {
  properties: [
    {
      title: 'Language packs',
      entries: PACK_ENTRIES,
    },
    {
      title: 'Primary entry (@oge-ui/locales)',
      entries: [
        {
          name: 'en',
          type: 'OgeLocalePack',
          description:
            "The English baseline — <code>{ locale: 'en', dir: 'ltr' }</code> with no slices, so every catalog keeps its built-in strings. Switch back to it like to any other pack.",
        },
        {
          name: 'ogeLocalePacks',
          type: 'Readonly<Record<OgeLocaleCode, () => Promise<OgeLocalePack>>>',
          description:
            'Lazy loaders, one dynamic <code>import()</code> per language entry — a language switcher downloads only the packs a user picks.',
        },
        {
          name: 'OGE_LOCALE_NAMES',
          type: 'Readonly<Record<OgeLocaleCode, string>>',
          description:
            'Each language’s own name (<code>Deutsch</code>, <code>日本語</code>, <code>العربية</code>…) — the labels of a switcher.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'ogeMergeMessages(defaults, slice)',
          type: '<T extends object>(defaults: T, slice: OgeDeepPartial<T> | undefined) => T',
          description:
            'Lays a pack slice over a complete catalog, nested blocks key by key — every key the slice lacks keeps the English string. Use it to hand a slice to a family provider yourself (commercial families, or a family whose other options you also set): <code>messages: ogeMergeMessages(OGE_DEFAULT_SCHEDULER_MESSAGES, tr.scheduler)</code>.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeLocalePack',
          type: "{ locale; dir: 'ltr' | 'rtl'; grid?; inputs?; buttons?; overlay?; tabs?; forms?; upload?; layout?; navigation?; pivot?; scheduler?; gantt?; kanban?; bpmn?; charts? }",
          description:
            'One language: the BCP 47 <code>locale</code> for <code>Intl</code> formats, the writing direction and a deep-partial slice per message catalog. The tree list reads the grid’s catalog, so <code>grid</code> covers both. The commercial slices are typed with <code>import type</code> from the engines — erased by the build, so the MIT package has no runtime dependency on them.',
        },
        {
          name: 'OgeLocaleLayoutMessages',
          type: '{ accordion?; progressBar?; loadIndicator?; splitter?; toolbar? }',
          description: 'The layout family’s catalogs, one per component.',
        },
        {
          name: 'OgeLocaleNavigationMessages',
          type: '{ breadcrumb?; drawer?; menubar?; pagination?; stepper?; treeView? }',
          description: 'The navigation family’s catalogs, one per component.',
        },
        {
          name: 'OgeDeepPartial<T>',
          type: 'mapped type',
          description:
            'Every key optional, nested blocks included — a key a newer release adds is simply missing from an older pack and falls back to English.',
        },
        {
          name: 'OgeLocaleCode',
          type: "'en' | 'de' | 'fr' | 'es' | 'it' | 'pt-BR' | 'tr' | 'ja' | 'zh-CN' | 'ar' | 'he'",
          description:
            'The languages this package ships, plus the English baseline.',
        },
      ],
    },
  ],
};

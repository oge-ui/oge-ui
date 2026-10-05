/**
 * `@oge-ui/locales` — ready-made translations of every OGE UI message
 * catalog, as framework-free data.
 *
 * Import one language from its own entry point, so the app bundles only that
 * pack:
 *
 * ```ts
 * import { tr } from '@oge-ui/locales/tr';
 * providers: [provideOgeLocale(tr)]; // Angular, from 'oge-ui'
 * // React: <OgeLocaleProvider pack={tr}> from '@oge-ui/react'
 * ```
 *
 * or load packs on demand for a language switcher with
 * {@link ogeLocalePacks}. This entry carries only the types, the merge
 * helper and that lazy map — no translations.
 */
import type { OgeLocalePack } from './lib/locale-pack';

export type {
  OgeDeepPartial,
  OgeLocaleLayoutMessages,
  OgeLocaleNavigationMessages,
  OgeLocalePack,
} from './lib/locale-pack';
export { ogeMergeMessages } from './lib/merge';

/** Every language this package ships, plus `en` — the built-in catalogs. */
export type OgeLocaleCode =
  | 'en'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt-BR'
  | 'tr'
  | 'ja'
  | 'zh-CN'
  | 'ar'
  | 'he';

/**
 * The English baseline: no slices, so every catalog keeps its built-in
 * strings. Switch back to it like to any other pack.
 */
export const en: OgeLocalePack = { locale: 'en', dir: 'ltr' };

/** Each language's own name (endonym) — the labels of a language switcher. */
export const OGE_LOCALE_NAMES: Readonly<Record<OgeLocaleCode, string>> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  'pt-BR': 'Português (Brasil)',
  tr: 'Türkçe',
  ja: '日本語',
  'zh-CN': '简体中文',
  ar: 'العربية',
  he: 'עברית',
};

/**
 * Lazy loaders, one per language — each a dynamic `import()` of that
 * language's entry point, so a runtime switcher downloads only the packs a
 * user actually picks:
 *
 * ```ts
 * const pack = signal<OgeLocalePack>(en);
 * async function use(code: OgeLocaleCode) {
 *   pack.set(await ogeLocalePacks[code]());
 * }
 * ```
 */
export const ogeLocalePacks: Readonly<
  Record<OgeLocaleCode, () => Promise<OgeLocalePack>>
> = {
  en: () => Promise.resolve(en),
  de: () => import('./de').then((m) => m.de),
  fr: () => import('./fr').then((m) => m.fr),
  es: () => import('./es').then((m) => m.es),
  it: () => import('./it').then((m) => m.it),
  'pt-BR': () => import('./pt-BR').then((m) => m.ptBR),
  tr: () => import('./tr').then((m) => m.tr),
  ja: () => import('./ja').then((m) => m.ja),
  'zh-CN': () => import('./zh-CN').then((m) => m.zhCN),
  ar: () => import('./ar').then((m) => m.ar),
  he: () => import('./he').then((m) => m.he),
};

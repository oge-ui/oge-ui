# @oge-ui/locales

Ready-made translations of every [OGE UI](https://www.ogeui.com) message
catalog — the MIT families and the commercial ones alike — as framework-free
data:

| Entry point             | Language             | `locale` | `dir` |
| ----------------------- | -------------------- | -------- | ----- |
| `@oge-ui/locales/de`    | German               | `de`     | `ltr` |
| `@oge-ui/locales/fr`    | French               | `fr`     | `ltr` |
| `@oge-ui/locales/es`    | Spanish              | `es`     | `ltr` |
| `@oge-ui/locales/it`    | Italian              | `it`     | `ltr` |
| `@oge-ui/locales/pt-BR` | Brazilian Portuguese | `pt-BR`  | `ltr` |
| `@oge-ui/locales/tr`    | Turkish              | `tr`     | `ltr` |
| `@oge-ui/locales/ja`    | Japanese             | `ja`     | `ltr` |
| `@oge-ui/locales/zh-CN` | Simplified Chinese   | `zh-CN`  | `ltr` |
| `@oge-ui/locales/ar`    | Arabic               | `ar`     | `rtl` |
| `@oge-ui/locales/he`    | Hebrew               | `he`     | `rtl` |

Each language is its own entry point, so an app bundles only the pack it
imports. Count-bearing messages are ICU plurals with the language's own
plural forms (Arabic `zero one two few many other`, Hebrew `one two other`, …).

```sh
npm install @oge-ui/locales
```

## Angular

```ts
import { provideOgeLocale } from 'oge-ui';
import { tr } from '@oge-ui/locales/tr';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'tr' }, // Angular's own pipes — your job
    provideOgeLocale(tr), // every MIT family: strings + Intl locale
  ],
};
```

## React

```tsx
import { OgeLocaleProvider } from '@oge-ui/react';
import { tr } from '@oge-ui/locales/tr';

<OgeLocaleProvider pack={tr}>
  <App />
</OgeLocaleProvider>;
```

## Switching at runtime

```ts
import { en, ogeLocalePacks, type OgeLocalePack } from '@oge-ui/locales';

const pack = signal<OgeLocalePack>(en);
providers: [provideOgeLocale(() => pack())]; // the live form

pack.set(await ogeLocalePacks['de']()); // one chunk per language, loaded on demand
document.documentElement.dir = pack().dir; // components follow the page's dir
```

## Commercial families

The MIT umbrellas never depend on the commercial packages, so the pivot,
scheduler, Gantt, Kanban, BPMN and charts slices go to their own providers —
merged over the English catalog with `ogeMergeMessages`, so a key a newer
release adds stays English rather than going blank:

```ts
import { ogeMergeMessages } from '@oge-ui/locales';

provideOgeSchedulerConfig({
  locale: tr.locale,
  messages: ogeMergeMessages(OGE_DEFAULT_SCHEDULER_MESSAGES, tr.scheduler),
});
```

## Packaging notes

- **No runtime dependencies.** The packs are typed against the catalogs in
  `@oge-ui/behavior` and the commercial `@oge-ui/*-engine` packages with
  `import type` only — erased by the build. Those packages are optional peer
  dependencies; the declarations reference them, which `skipLibCheck` (the
  Angular CLI and Vite default) keeps silent when one is not installed. No
  commercial code is shipped or required.
- **Partial by design.** Every slice is deep partial: a key a newer release
  adds to a catalog falls back to English instead of breaking your build. CI
  (`docs-tools:locales-check`) fails on unknown keys, mismatched placeholders
  and malformed plurals, and reports the coverage of every pack.

MIT licensed. Docs: <https://www.ogeui.com/getting-started/localization>.

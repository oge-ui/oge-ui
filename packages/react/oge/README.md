# @oge-ui/react

The whole OGE React UI suite in one package — one install, one import path.

```sh
npm install @oge-ui/react
```

```tsx
'use client';

import { OgeButton, OgeTextBox, OgeTabPanel, OgeCard } from '@oge-ui/react';
import '@oge-ui/react/styles.css';
```

OGE is **one component engine with a native render layer per framework**
(see the suite's ADR 0001). These are real React components — props,
callbacks, controlled state, ref handles — over the same framework-free data
and interaction engine the Angular suite runs, and the same CSS design
tokens. Nothing is wrapped: there is no Angular in your bundle.

## What this package re-exports

| Family                     | Components                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@oge-ui/react-buttons`    | `OgeButton`, `OgeButtonGroup`, `OgeDropDownButton`                                                                                                                                                                                                      |
| `@oge-ui/react-inputs`     | `OgeTextBox`, `OgeTextArea`, `OgeNumberBox`, `OgeCheckBox`, `OgeSwitch`, `OgeRadioGroup`, `OgeSelectBox`, `OgeTagBox`, `OgeAutocomplete`, `OgeSlider`, `OgeRangeSlider`, `OgeColorBox`, `OgeCalendar`, `OgeDateBox`, `OgeDateRangeBox`, `OgeTreeSelect` |
| `@oge-ui/react-tabs`       | `OgeTabs`, `OgeTabPanel`                                                                                                                                                                                                                                |
| `@oge-ui/react-layout`     | `OgeCard`, `OgeProgressBar`, `OgeLoadIndicator`, `OgeSkeleton`, `OgeAccordion`, `OgeSplitter`, `OgeToolbar`                                                                                                                                             |
| `@oge-ui/react-navigation` | `OgeTreeView`, `OgeDrawer`, `OgeStepper`, `OgeMenubar`, `OgeBreadcrumb`, `OgePagination`                                                                                                                                                                |
| `@oge-ui/react-overlay`    | `useAnchoredPanel`, `OgePopup`, `OgeMenuList`                                                                                                                                                                                                           |

The scoped packages stay the canonical import paths for size-conscious apps:
installing one family pulls in only that family. This umbrella exists for the
common case where an app uses several.

Requires React 18 or 19.

## Styles

One stylesheet covers every family:

```ts
import '@oge-ui/react/styles.css';
```

It is each Angular package's SCSS compiled verbatim, so a React screen and an
Angular screen in the same design system are pixel-identical and share every
`--oge-*` token.

## Docs

Live demos and the full API reference: <https://ogeui.com/components>
(pick **React** in the header switch). Machine-readable docs ship inside the
package at `node_modules/@oge-ui/react/llms.txt`.

## License

MIT

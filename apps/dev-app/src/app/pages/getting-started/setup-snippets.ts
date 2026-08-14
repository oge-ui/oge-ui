/** Code samples rendered on the setup page. */

export const INSTALL = `# everything at once — one install, one import path
npm install oge-ui

# …or install only what you use — every package is standalone
npm install @oge-ui/grid        # data grid (+ @oge-ui/core)
npm install @oge-ui/tree-list   # hierarchical grid
npm install @oge-ui/pivot       # pivot table
npm install @oge-ui/buttons     # buttons, groups, drop-downs (+ @oge-ui/overlay)
npm install @oge-ui/inputs      # text, textarea, number and select editors`;

export const NG_ADD = `# installs the package and wires the optional extras
ng add @oge-ui/grid

# with the dark theme registered in angular.json
ng add @oge-ui/grid --theme=dark

# without touching AGENTS.md
ng add @oge-ui/inputs --skip-agents-file`;

export const OPTIONAL = `# Excel export (grid + tree list secondary entries)
npm install exceljs

# PDF export (grid secondary entry)
npm install jspdf`;

export const PROVIDERS = `import { ApplicationConfig } from '@angular/core';
import { provideOgeGridConfig } from '@oge-ui/grid';
import { provideOgeInputsConfig } from '@oge-ui/inputs';

export const appConfig: ApplicationConfig = {
  providers: [
    // optional — components work with sensible defaults out of the box
    provideOgeGridConfig({ rowHeight: 32, allowUnsorting: false }),
    provideOgeInputsConfig({ spinRepeatDelayMs: 300 }),
  ],
};`;

export const VERIFY = `import { Component } from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';

@Component({
  selector: 'app-root',
  imports: [OgeButton],
  template: \`<oge-button text="It works" severity="accent" />\`,
})
export class App {}`;

// ── React layer (ADR 0002) ────────────────────────────────────────────────
// Only the samples that genuinely differ get a React twin. Anything shared —
// the token overrides, the theme stylesheets — deliberately has none, because
// implying a difference where there is not one is its own kind of wrong.

export const INSTALL_REACT = `# the React render layer — one package per family
npm install @oge-ui/react-buttons

# react is a peer you already have
# @oge-ui/behavior and @oge-ui/core come along as dependencies`;

export const STYLES_REACT = `// once, at your app entry — the components ship class names, not inline styles
import '@oge-ui/react-buttons/styles.css';

// optional themes, shared with the Angular packages
import '@oge-ui/grid/themes/dark.css';`;

export const PROVIDERS_REACT = `'use client';

import type { ReactNode } from 'react';
import { OgeButtonsConfigProvider } from '@oge-ui/react-buttons';

// optional — components work with sensible defaults out of the box.
// The React counterpart of Angular's provideOgeButtonsConfig().
export function Providers({ children }: { children: ReactNode }) {
  return (
    <OgeButtonsConfigProvider
      config={{ clickGuardMs: 300, messages: { loading: 'Loading…' } }}
    >
      {children}
    </OgeButtonsConfigProvider>
  );
}`;

export const VERIFY_REACT = `'use client';

import { OgeButton } from '@oge-ui/react-buttons';

export function App() {
  return <OgeButton text="It works" severity="accent" />;
}`;

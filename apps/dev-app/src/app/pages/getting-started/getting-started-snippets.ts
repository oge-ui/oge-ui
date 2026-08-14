/** Code samples rendered on the getting-started page. */

export const INSTALL = `# everything at once — one install, one import path
npm install oge-ui

# …or install only what you use — every package is standalone
npm install @oge-ui/grid        # data grid (+ @oge-ui/core)
npm install @oge-ui/tree-list   # hierarchical grid
npm install @oge-ui/pivot       # pivot table
npm install @oge-ui/buttons     # buttons, groups, drop-downs (+ @oge-ui/overlay)
npm install @oge-ui/inputs      # text, textarea, number and select editors`;

export const QUICK_START = `import { Component, signal } from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import { OgeTextBox } from '@oge-ui/inputs';

@Component({
  selector: 'app-search-bar',
  imports: [OgeTextBox, OgeButton],
  template: \`
    <oge-text-box
      label="Search"
      [(value)]="query"
      [showClearButton]="true"
      (enterKey)="load()"
    />
    <oge-button text="Search" severity="accent" [action]="load" />
  \`,
})
export class SearchBar {
  readonly query = signal('');

  // async action: the button manages its own loading spinner
  readonly load = () => fetch('/api/search?q=' + this.query());
}`;

/**
 * The React layer's counterpart of `QUICK_START` (ADR 0002) — the same search
 * bar, in React idiom: a controlled editor and an async action button.
 */
export const QUICK_START_REACT = `'use client';

import { useState } from 'react';
import { OgeButton, OgeTextBox } from '@oge-ui/react';

export function SearchBar() {
  const [query, setQuery] = useState('');

  // async action: the button manages its own loading spinner
  const load = () => fetch('/api/search?q=' + query);

  return (
    <>
      <OgeTextBox
        label="Search"
        value={query}
        onValueChange={setQuery}
        showClearButton
        onEnterKey={load}
      />
      <OgeButton text="Search" severity="accent" action={load} />
    </>
  );
}`;

export const INSTALL_REACT_INTRO = `# everything at once — one install, one import path
npm install @oge-ui/react

# …or install only what you use — every package is standalone
npm install @oge-ui/react-buttons  # buttons, groups, drop-downs
npm install @oge-ui/react-inputs   # text, number, select, date, color editors
npm install @oge-ui/react-tabs     # tab strip and tab panel
npm install @oge-ui/react-layout   # card, accordion, splitter, toolbar, loaders
npm install @oge-ui/react-navigation # tree view, drawer, stepper, menubar, breadcrumb
npm install @oge-ui/react-overlay  # anchored popups and menus`;

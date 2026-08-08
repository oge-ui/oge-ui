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

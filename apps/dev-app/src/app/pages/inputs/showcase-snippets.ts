import { demoSource } from '../../shared/demo-source';

export const COUNTER_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTextArea', 'OgeTextBox'] },
  template: `<!-- grapheme-accurate: a family emoji counts as 1 character, not 8 code units -->
<oge-text-box label="Bio" [(value)]="bio" [showCounter]="true" [maxLength]="40" />

<!-- soft mode: typing past the limit is allowed, the counter turns red -->
<oge-text-area label="Tweet" [showCounter]="true" [maxLength]="140" counterMode="soft" />`,
  body: `protected readonly bio = signal('');`,
});

export const PASSWORD_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTextBox'] },
  template: `<oge-text-box label="Password" mode="password" [(value)]="password" />
<oge-text-box label="API token" [(value)]="token" [showCopyButton]="true" [readonly]="true" />`,
  body: `protected readonly password = signal('');
protected readonly token = signal('oge_live_9f0b01cf');`,
});

export const NUMBER_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeNumberBox'] },
  template: `<!-- Intl.NumberFormat display on blur, raw editing on focus -->
<oge-number-box
  label="Price (de-DE)"
  locale="de-DE"
  [format]="{ style: 'currency', currency: 'EUR' }"
  [(value)]="price"
/>
<oge-number-box label="Percentage" [format]="{ style: 'percent' }" [step]="0.01" />`,
  body: `protected readonly price = signal<number | null>(1249.9);`,
});

export const DEBOUNCE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTextBox'] },
  template: `<oge-text-box
  label="Search"
  [(value)]="query"
  [debounce]="400"
  (inputChange)="keystrokes = keystrokes + 1"
/>
<!-- value commits 400ms after the last keystroke; blur/Enter flush instantly -->`,
  body: `protected readonly query = signal('');
protected keystrokes = 0;`,
});

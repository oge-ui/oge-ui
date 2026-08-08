import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeNumberBox', 'OgeTextArea', 'OgeTextBox'],
  },
  template: `<oge-text-box label="Name" [(value)]="name" placeholder="Jane Doe" />
<oge-text-box label="E-mail" mode="email" hint="We never share it" [showClearButton]="true" />
<oge-number-box label="Amount" [(value)]="amount" [min]="0" [showSpinButtons]="true" />
<oge-text-area label="Notes" [(value)]="notes" [autoResize]="true" [maxRows]="6" />`,
  body: `protected readonly name = signal('');
protected readonly amount = signal<number | null>(null);
protected readonly notes = signal('');`,
});

export const STYLING_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTextBox'] },
  template: `<oge-text-box label="Outlined" stylingMode="outlined" />
<oge-text-box label="Filled" stylingMode="filled" />
<oge-text-box label="Underlined" stylingMode="underlined" />

<!-- sizes match the button scale: 28 / 34 / 42px -->
<oge-text-box label="Small" size="sm" />
<oge-text-box label="Large" size="lg" />`,
});

export const LABEL_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTextBox'] },
  template: `<oge-text-box label="Static (default)" labelMode="static" />
<oge-text-box label="Floating" labelMode="floating" />
<oge-text-box label="Outside" labelMode="outside" />
<oge-text-box label="Hidden (aria-label)" labelMode="hidden" placeholder="Search…" />`,
});

export const PREFIX_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeInputPrefix', 'OgeTextBox'] },
  template: `<oge-text-box label="Price">
  <span ogeInputPrefix>€</span>
</oge-text-box>

<oge-text-box label="Website" placeholder="example.com">
  <span ogeInputPrefix>https://</span>
</oge-text-box>`,
});

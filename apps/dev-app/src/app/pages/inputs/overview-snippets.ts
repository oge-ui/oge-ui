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

export const NUMBER_ENTRY_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeNumberBox'] },
  template: `<!-- formatWhileTyping groups thousands as you type (caret kept in
     place); maxFractionDigits refuses a third decimal; format is the
     blur-time display (focus swaps in the editable number). -->
<oge-number-box
  label="Budget"
  [(value)]="budget"
  [formatWhileTyping]="true"
  [maxFractionDigits]="2"
  [format]="{ style: 'currency', currency: 'EUR' }"
/>

<!-- wheelStep opts into mouse-wheel stepping — only while focused, so a
     page scrolling past the field never changes it. -->
<oge-number-box
  label="Quantity"
  [(value)]="quantity"
  [min]="0"
  [max]="99"
  [wheelStep]="1"
  [showSpinButtons]="true"
/>`,
  body: `protected readonly budget = signal<number | null>(1234567.5);
protected readonly quantity = signal<number | null>(10);`,
});

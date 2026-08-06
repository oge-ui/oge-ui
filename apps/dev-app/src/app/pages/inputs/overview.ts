import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeInputPrefix,
  OgeNumberBox,
  OgeTextArea,
  OgeTextBox,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';

const SECTIONS = [
  'The three editors',
  'Styling modes & sizes',
  'Label modes',
  'Prefix & suffix slots',
] as const;

const BASIC_SNIPPET = `<oge-text-box label="Name" [(value)]="name" placeholder="Jane Doe" />
<oge-text-box label="E-mail" mode="email" hint="We never share it" [showClearButton]="true" />
<oge-number-box label="Amount" [(value)]="amount" [min]="0" [showSpinButtons]="true" />
<oge-text-area label="Notes" [(value)]="notes" [autoResize]="true" [maxRows]="6" />`;

const STYLING_SNIPPET = `<oge-text-box label="Outlined" stylingMode="outlined" />
<oge-text-box label="Filled" stylingMode="filled" />
<oge-text-box label="Underlined" stylingMode="underlined" />

<!-- sizes match the button scale: 28 / 34 / 42px -->
<oge-text-box label="Small" size="sm" />
<oge-text-box label="Large" size="lg" />`;

const LABEL_SNIPPET = `<oge-text-box label="Static (default)" labelMode="static" />
<oge-text-box label="Floating" labelMode="floating" />
<oge-text-box label="Outside" labelMode="outside" />
<oge-text-box label="Hidden (aria-label)" labelMode="hidden" placeholder="Search…" />`;

const PREFIX_SNIPPET = `<oge-text-box label="Price">
  <span ogeInputPrefix>€</span>
</oge-text-box>

<oge-text-box label="Website" placeholder="example.com">
  <span ogeInputPrefix>https://</span>
</oge-text-box>`;

@Component({
  selector: 'app-inputs-overview',
  imports: [
    OgeTextBox,
    OgeTextArea,
    OgeNumberBox,
    OgeInputPrefix,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Inputs"
      [chips]="[
        'labelMode',
        'stylingMode',
        'size',
        'hint',
        'showClearButton',
        'fluid',
      ]"
    >
      <p>
        <code>&lt;oge-text-box&gt;</code>,
        <code>&lt;oge-text-area&gt;</code> and
        <code>&lt;oge-number-box&gt;</code> share one field chrome: four label
        modes (including floating), three styling modes, prefix/suffix slots, a
        clear button and a fixed-height subscript for hints and validation
        errors that never shifts your layout. All three work standalone via
        <code>[(value)]</code>, with Signal Forms via
        <code>[formField]</code> and with reactive forms via
        <code>formControl</code>.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['three editors', '[(value)]', 'clear button', 'auto-resize']"
      heading="The three editors"
      description="<code>oge-text-box</code>, <code>oge-text-area</code> and <code>oge-number-box</code> share one field chrome, so labels, hints, errors and adornments behave identically. All three bind three ways: standalone <code>[(value)]</code>, Signal Forms via <code>[formField]</code>, or classic reactive forms via <code>formControl</code>. The number editor treats empty as <code>null</code> — never <code>0</code>."
      [code]="basicSnippet"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box label="Name" [(value)]="name" placeholder="Jane Doe" />
        <oge-text-box
          label="E-mail"
          mode="email"
          hint="We never share it"
          [showClearButton]="true"
        />
        <oge-number-box
          label="Amount"
          [(value)]="amount"
          [min]="0"
          [showSpinButtons]="true"
        />
        <oge-text-area
          label="Notes"
          [(value)]="notes"
          [autoResize]="true"
          [maxRows]="6"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['stylingMode ×3', 'size: sm | md | lg']"
      heading="Styling modes & sizes"
      description="<code>outlined</code> (default), <code>filled</code> and <code>underlined</code> cover the common form aesthetics; all derive from the design tokens and adapt to every theme. Sizes <code>sm</code>/<code>md</code>/<code>lg</code> (28/34/42px) match the button scale exactly, so mixed button-and-field rows align without manual tweaks."
      [code]="stylingSnippet"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box label="Outlined" stylingMode="outlined" />
        <oge-text-box label="Filled" stylingMode="filled" />
        <oge-text-box label="Underlined" stylingMode="underlined" />
        <oge-text-box label="Small" size="sm" />
        <oge-text-box label="Large" size="lg" />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['labelMode: static | floating | hidden | outside']"
      heading="Label modes"
      description="Four placements: <code>static</code> renders a compact caption above the field, <code>outside</code> a conventional block label, <code>floating</code> starts in the placeholder position and lifts on focus or content, and <code>hidden</code> keeps the field visually clean while exposing the label to screen readers via <code>aria-label</code>. Avoid mixing modes within one row — floating fields are taller."
      [code]="labelSnippet"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box label="Static (default)" labelMode="static" />
        <oge-text-box label="Floating" labelMode="floating" />
        <oge-text-box label="Outside" labelMode="outside" />
        <oge-text-box
          label="Hidden (aria-label)"
          labelMode="hidden"
          placeholder="Search…"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['[ogeInputPrefix] / [ogeInputSuffix] slots']"
      heading="Prefix & suffix slots"
      description="Project any content — symbols, icons, units — into the leading or trailing slot with the <code>ogeInputPrefix</code> / <code>ogeInputSuffix</code> attributes. Custom suffixes render at the end of the built-in rail, after the clear, reveal and copy buttons, so the ordering stays predictable."
      [code]="prefixSnippet"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box label="Price">
          <span ogeInputPrefix>€</span>
        </oge-text-box>
        <oge-text-box label="Website" placeholder="example.com">
          <span ogeInputPrefix>https://</span>
        </oge-text-box>
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        The subscript region defaults to <code>subscriptSizing="fixed"</code> —
        appearing errors never push the layout. Use <code>'none'</code> for
        compact/grid-cell usage.
      </li>
      <li>
        <code>fluid</code> stretches to 100% width; the default width comes from
        <code>--oge-input-width</code> (240px).
      </li>
      <li>
        Number values are <code>number | null</code> — empty is
        <code>null</code>, never <code>0</code>.
      </li>
    </ul>
  `,
})
export class InputsOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly name = signal('');
  protected readonly amount = signal<number | null>(null);
  protected readonly notes = signal('');

  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly stylingSnippet = STYLING_SNIPPET;
  protected readonly labelSnippet = LABEL_SNIPPET;
  protected readonly prefixSnippet = PREFIX_SNIPPET;
}

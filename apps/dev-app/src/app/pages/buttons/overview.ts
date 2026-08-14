import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OgeButton, OgeButtonIcon } from '@oge-ui/buttons';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import {
  REACT_BUTTONS_SECTIONS,
  ReactButtonsDemos,
} from '../react-buttons/overview';
import { PageToc } from '../../shared/page-toc';
import {
  BADGE_SNIPPET,
  COLOR_SNIPPET,
  ICON_SNIPPET,
  SIZES_SNIPPET,
  VARIANTS_SNIPPET,
} from './overview-snippets';

const SECTIONS = [
  'Severities & styling modes',
  'Sizes',
  'Icons',
  'Custom colors',
  'Badges',
] as const;

@Component({
  selector: 'app-buttons-overview',
  imports: [
    OgeButton,
    OgeButtonIcon,
    DemoCard,
    DocHeader,
    ReactButtonsDemos,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Buttons"
      [chips]="[
        'severity',
        'stylingMode',
        'size',
        'badge',
        'hint',
        'useSubmitBehavior',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeButton /&gt;</code> from
          <code>&#64;oge-ui/react-buttons</code> is a token-themed action button
          with semantic severities, three fill styles, badges and gesture
          superpowers (async actions, click guarding, hold-to-confirm,
          auto-repeat). It runs the same press machine and loads the same
          stylesheet as the Angular button, so the timings and the visuals are
          shared code rather than a re-implementation — only the API is React's:
          props, <code>onClick</code>, and a context provider for defaults.
        </p>
      } @else {
        <p>
          <code>&lt;oge-button&gt;</code> is a token-themed action button with
          semantic severities, three fill styles, badges and gesture superpowers
          (async actions, click guarding, hold-to-confirm, auto-repeat — see the
          Interactions page). Bind <code>(clicked)</code> for the guarded
          pipeline; every state is driven by design tokens, so dark mode and the
          bridge themes work out of the box.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-buttons-demos />
    } @else {
      <app-demo-card
        [chips]="['severity', 'stylingMode: contained | outlined | text']"
        heading="Severities & styling modes"
        description="Five semantic severities (<code>normal</code>, <code>accent</code>, <code>success</code>, <code>warning</code>, <code>danger</code>) map straight to the design tokens, so every theme restyles them automatically. Each severity combines with three fill styles — <code>contained</code> (solid, the default), <code>outlined</code> and <code>text</code> — giving you the full action hierarchy of a page from one component."
        [code]="variantsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button text="Contained" severity="accent" />
          <oge-button
            text="Outlined"
            severity="accent"
            stylingMode="outlined"
          />
          <oge-button text="Text" severity="accent" stylingMode="text" />
          <oge-button text="Success" severity="success" />
          <oge-button text="Warning" severity="warning" />
          <oge-button text="Danger" severity="danger" />
          <oge-button text="Normal" />
          <oge-button text="Disabled" [disabled]="true" />
        </div>
      </app-demo-card>

      <app-demo-card
        heading="Sizes"
        description="Three presets — <code>sm</code> (28px), <code>md</code> (34px, default) and <code>lg</code> (42px). The scale is shared with the input editors, so a button placed next to a text box of the same size lines up pixel-perfect in form rows."
        [chips]="['size: sm | md | lg']"
        [code]="sizesSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button text="Small" size="sm" />
          <oge-button text="Medium" />
          <oge-button text="Large" size="lg" />
          <oge-button
            text="Small outlined"
            size="sm"
            severity="accent"
            stylingMode="outlined"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['[ogeButtonIcon] projection', 'iconPosition']"
        heading="Icons"
        description="There is no icon-font dependency: project any inline SVG with the <code>ogeButtonIcon</code> attribute and it inherits the button's color. <code>iconPosition</code> places it before or after the label. Icon-only buttons must provide an accessible name via <code>ariaLabel</code> (or a <code>hint</code> tooltip)."
        [code]="iconSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button text="Download" severity="accent">
            <svg
              ogeButtonIcon
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </oge-button>
          <oge-button text="Next" iconPosition="after" stylingMode="outlined">
            <svg
              ogeButtonIcon
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </oge-button>
          <oge-button hint="Settings" stylingMode="text">
            <svg
              ogeButtonIcon
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
              />
            </svg>
          </oge-button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['[color] input', 'per-instance token override']"
        heading="Custom colors"
        description="The <code>color</code> input accepts any CSS color and overrides the severity palette for that one button — the hover shade and focus ring derive automatically. For brand-wide changes, override the <code>--oge-*</code> tokens instead: globally, per theme file, or inline on a single element."
        [code]="colorSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button text="Purple" color="#7c3aed" />
          <oge-button text="Teal" color="#0d9488" stylingMode="outlined" />
          <oge-button text="Pink" color="#db2777" stylingMode="text" />
          <oge-button
            text="Brand token"
            severity="accent"
            style="--oge-accent: #ea580c; --oge-accent-soft: rgba(234, 88, 12, 0.14)"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['badge: number | string | true (dot)', '99+ capping']"
        heading="Badges"
        description="A number or string renders a pill in the button's corner; numbers cap at <code>99+</code>. The value joins the button's accessible name through a visually hidden span, so screen readers announce it. Passing <code>true</code> renders a plain attention dot instead."
        [code]="badgeSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-4">
          <oge-button text="Inbox" [badge]="7" />
          <oge-button
            text="Alerts"
            [badge]="120"
            severity="accent"
            stylingMode="outlined"
          />
          <oge-button text="Live" [badge]="true" stylingMode="text" />
        </div>
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          Bind <code>(clicked)</code>, not native <code>(click)</code> — only
          the component output goes through <code>clickGuard</code>, the
          gestures and the single-flight <code>action</code> protection.
        </li>
        <li>
          <code>useSubmitBehavior</code> renders <code>type="submit"</code> so
          the button submits its enclosing form; the default is always
          <code>type="button"</code>.
        </li>
        <li>
          Numeric badges join the accessible name via a visually hidden span;
          the dot variant is decorative (<code>aria-hidden</code>).
        </li>
        <li>
          RTL needs no configuration — layout uses logical properties and
          follows the surrounding <code>dir</code> attribute.
        </li>
      </ul>
    }
  `,
})
export class ButtonsOverviewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_BUTTONS_SECTIONS;
  protected readonly variantsSnippet = VARIANTS_SNIPPET;
  protected readonly sizesSnippet = SIZES_SNIPPET;
  protected readonly iconSnippet = ICON_SNIPPET;
  protected readonly colorSnippet = COLOR_SNIPPET;
  protected readonly badgeSnippet = BADGE_SNIPPET;
}

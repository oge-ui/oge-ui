import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeAppBar } from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_APP_BAR_DEMOS } from './app-bar-snippets';

/**
 * TOC of the React view — the same five sections as the Angular app bar page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_APP_BAR_SECTIONS = [
  'Sections',
  'Colors & sizes',
  'Sticky & fixed (safe areas)',
  'Bottom bar',
  'Landmarks',
] as const;

const ARTICLE = Array.from(
  { length: 8 },
  (_, i) =>
    `Paragraph ${i + 1}: scroll inside this box — the bar stays on top.`,
);
const MESSAGES = Array.from({ length: 8 }, (_, i) => `Message ${i + 1}`);
const TABS = ['home', 'search', 'me'] as const;

const button = (key: string, label: string, onClick?: () => void) =>
  createElement(
    'button',
    { key, type: 'button', className: 'demo-app-bar-btn', onClick },
    label,
  );

const paragraphs = (lines: readonly string[]) =>
  lines.map((line) =>
    createElement('p', { key: line, className: 'px-4 py-2' }, line),
  );

function SectionsDemo(): ReactNode {
  const [last, setLast] = useState('—');
  return createElement(
    'div',
    null,
    createElement(
      OgeAppBar,
      {
        key: 'bar',
        start: createElement(
          'button',
          {
            type: 'button',
            className: 'demo-app-bar-btn',
            'aria-label': 'Open menu',
            onClick: () => setLast('menu'),
          },
          '☰',
        ),
        end: [
          button('search', 'Search', () => setLast('search')),
          button('profile', 'Profile', () => setLast('profile')),
        ],
      },
      createElement('strong', null, 'Inbox'),
    ),
    createElement(
      'p',
      { key: 'last', className: 'mt-2 text-sm', 'data-testid': 'app-bar-last' },
      `last action → ${last}`,
    ),
  );
}

function BottomDemo(): ReactNode {
  const [tab, setTab] = useState<string>('home');
  return createElement(
    'div',
    {
      className: 'demo-app-bar-scroll',
      role: 'region',
      'aria-label': 'Phone screen',
      tabIndex: 0,
    },
    ...paragraphs(MESSAGES),
    createElement(
      OgeAppBar,
      {
        key: 'bar',
        position: 'bottom',
        positionMode: 'sticky',
        centerAlign: 'center',
      },
      ...TABS.map((option) =>
        createElement(
          'button',
          {
            key: option,
            type: 'button',
            className: 'demo-app-bar-btn',
            'aria-pressed': tab === option,
            onClick: () => setTab(option),
          },
          option,
        ),
      ),
    ),
  );
}

/**
 * The React half of the app bar page — rendered inside `/components/app-bar`
 * when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-app-bar-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React bar carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/layout/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['start', 'end', 'children → center']"
      heading="Sections"
      description="<code>start</code> and <code>end</code> size to their content; <code>children</code> go to the center section, which takes the remaining width and lets a long title truncate instead of pushing the actions off a phone screen."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="sections" />
    </app-demo-card>

    <app-demo-card
      [chips]="['color', 'size', 'elevated', 'centerAlign']"
      heading="Colors & sizes"
      description="<code>default</code> is the page surface with a hairline on the content edge, <code>primary</code> the accent, <code>inverse</code> the dark tooltip surface, <code>transparent</code> none. <code>size</code> is the 48 / 56 / 64 px density and <code>elevated</code> adds the card shadow — all tokens, so a theme re-tunes every bar."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="colors" />
    </app-demo-card>

    <app-demo-card
      [chips]="['positionMode: sticky', 'fixed', 'env(safe-area-inset-*)']"
      heading="Sticky & fixed (safe areas)"
      description="<code>sticky</code> sticks to the top of the nearest scroll container; <code>fixed</code> pins to the viewport instead (not shown live — it would cover these docs). Both pad with <code>env(safe-area-inset-*)</code> as a floor, so the bar clears a notch once the app opts into <code>viewport-fit=cover</code>, and sit on the <code>--oge-z-app-bar</code> layer, below FABs, popups and dialogs."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="sticky" />
    </app-demo-card>

    <app-demo-card
      [chips]="['position: bottom', 'sticky']"
      heading="Bottom bar"
      description='<code>position="bottom"</code> moves the hairline and the shadow to the top edge and the safe-area padding to the home-indicator edge — a phone&rsquo;s bottom navigation.'
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="bottom" />
    </app-demo-card>

    <app-demo-card
      [chips]="['landmark', 'ariaLabel', 'banner / contentinfo']"
      heading="Landmarks"
      description="A landmark only on request: <code>banner</code> for the one page header, <code>contentinfo</code> for a page footer, <code>navigation</code> / <code>region</code> plus an <code>ariaLabel</code> for a named secondary bar. <code>ariaLabel</code> is written only when a landmark is set — on a role-less element it would be invalid ARIA."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="landmarks" />
    </app-demo-card>
  `,
  styles: `
    .demo-app-bar-btn {
      min-block-size: 32px;
      padding: 4px 10px;
      border: 1px solid currentColor;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: inherit;
      text-transform: capitalize;
    }
    .demo-app-bar-btn[aria-pressed='true'] {
      background: var(--oge-accent-soft);
      font-weight: 600;
    }
    .demo-app-bar-link {
      color: inherit;
      text-decoration: underline;
    }
    .demo-app-bar-scroll {
      max-block-size: 240px;
      overflow: auto;
      border: 1px solid var(--oge-border-color);
      border-radius: 8px;
    }
  `,
})
export class ReactLayoutAppBarDemos {
  protected readonly demos = LAYOUT_APP_BAR_DEMOS;

  protected readonly sections = () => createElement(SectionsDemo);
  protected readonly bottom = () => createElement(BottomDemo);

  protected readonly colors = () =>
    createElement(
      'div',
      { className: 'flex flex-col gap-3' },
      createElement(
        OgeAppBar,
        { key: 'default', size: 'sm' },
        createElement('strong', null, 'Default · sm'),
      ),
      createElement(
        OgeAppBar,
        {
          key: 'primary',
          color: 'primary',
          elevated: true,
          end: button('action', 'Action'),
        },
        createElement('strong', null, 'Primary · elevated'),
      ),
      createElement(
        OgeAppBar,
        { key: 'inverse', color: 'inverse', size: 'lg', centerAlign: 'center' },
        createElement('strong', null, 'Inverse · lg · centered'),
      ),
      createElement(
        OgeAppBar,
        { key: 'transparent', color: 'transparent' },
        createElement('strong', null, 'Transparent'),
      ),
    );

  protected readonly sticky = () =>
    createElement(
      'div',
      {
        className: 'demo-app-bar-scroll',
        role: 'region',
        'aria-label': 'Scrolling article',
        tabIndex: 0,
      },
      createElement(
        OgeAppBar,
        {
          key: 'bar',
          positionMode: 'sticky',
          elevated: true,
          end: button('share', 'Share'),
        },
        createElement('strong', null, 'Article'),
      ),
      ...paragraphs(ARTICLE),
    );

  protected readonly landmarks = () =>
    createElement(
      OgeAppBar,
      {
        landmark: 'navigation',
        ariaLabel: 'Project',
        color: 'inverse',
        size: 'sm',
        start: createElement('strong', null, 'Project'),
      },
      ...['Overview', 'Issues', 'Settings'].map((label) =>
        createElement(
          'a',
          { key: label, className: 'demo-app-bar-link', href: '#landmarks' },
          label,
        ),
      ),
    );
}

import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement } from 'react';
import { OgeDropDownButton } from '@oge-ui/react-buttons';
import type { OgeMenuItem } from '@oge-ui/behavior';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { DROP_DOWN_DEMOS } from './react-buttons-snippets';

/** TOC of the React view — consumed by the Drop Down Button page shell. */
export const REACT_DROP_DOWN_SECTIONS = [
  'Menu button',
  'Lazy items',
  'Split button',
] as const;

const EXPORT_ITEMS: readonly OgeMenuItem[] = [
  { text: 'CSV', value: 'csv' },
  { text: 'Excel', value: 'xlsx' },
  { separator: true, text: '' },
  { text: 'PDF', value: 'pdf', disabled: true },
];

const RUN_TARGETS: readonly OgeMenuItem[] = [
  { text: 'Run tests', action: () => undefined },
  { text: 'Run lint', action: () => undefined },
  { text: 'Run build', action: () => undefined },
];

const LAZY_ITEMS: readonly OgeMenuItem[] = [
  { text: 'Production' },
  { text: 'Staging' },
  { text: 'Preview' },
];

// Module-level so the reference is stable: the drop-down caches a function
// source until its reference changes.
const loadTargets = () =>
  new Promise<readonly OgeMenuItem[]>((resolve) =>
    setTimeout(() => resolve(LAZY_ITEMS), 900),
  );

/**
 * The React half of the drop-down button page — renders inside
 * `/components/buttons/drop-down-button` when the reader has chosen React
 * (ADR 0002: one route, the header switch picks the layer).
 */
@Component({
  selector: 'app-react-drop-down-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Same rationale as the React buttons overview: the docs pull the packages'
  // SCSS sources so the demos are styled without a second stylesheet.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/buttons/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      heading="Menu button"
      [chips]="['items', 'onItemClick']"
      description="The WAI-ARIA menu-button pattern: the trigger toggles an anchored menu with full keyboard support (arrows, Home/End, type-ahead). <code>onItemClick</code> reports the pick and the panel closes."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="menuButton" />
    </app-demo-card>

    <app-demo-card
      heading="Lazy items"
      [chips]="['items: () => Promise', 'loading | empty | error rows']"
      description="A function source is invoked on first open and cached until its reference changes — the panel shows a loading row while it settles."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="lazy" />
    </app-demo-card>

    <app-demo-card
      heading="Split button"
      [chips]="['splitButton', 'rememberLastAction']"
      description="An independent action main button beside the chevron toggle; <code>rememberLastAction</code> turns the last picked item into the main button’s label and action — the IDE “Run” pattern."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="split" />
    </app-demo-card>
  `,
})
export class ReactDropDownDemos {
  protected readonly demos = DROP_DOWN_DEMOS;

  protected readonly menuButton = () =>
    createElement(OgeDropDownButton, {
      text: 'Export',
      items: EXPORT_ITEMS,
    });

  protected readonly lazy = () =>
    createElement(OgeDropDownButton, {
      text: 'Deploy',
      items: loadTargets,
    });

  protected readonly split = () =>
    createElement(OgeDropDownButton, {
      text: 'Run',
      severity: 'accent',
      splitButton: true,
      rememberLastAction: true,
      items: RUN_TARGETS,
    });
}

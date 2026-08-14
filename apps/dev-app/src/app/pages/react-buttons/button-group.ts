import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeButton,
  OgeButtonGroup,
  type OgeButtonGroupItem,
} from '@oge-ui/react-buttons';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { BUTTON_GROUP_DEMOS } from './react-buttons-snippets';

/** TOC of the React view — the same three sections as the Angular page. */
export const REACT_BUTTON_GROUP_SECTIONS = [
  'Single selection (radio pattern)',
  'Multiple selection (toggle buttons)',
  'Data-driven items',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row' }, ...children);

const PERIODS: readonly OgeButtonGroupItem[] = [
  { value: 'day', text: 'Day' },
  { value: 'week', text: 'Week' },
  { value: 'month', text: 'Month' },
  { value: 'year', text: 'Year', disabled: true },
];

function SingleSelectionPreview() {
  const [align, setAlign] = useState<readonly string[]>(['left']);
  return row(
    createElement(
      OgeButtonGroup,
      {
        key: 'g',
        selectionMode: 'single',
        selectedKeys: align,
        onSelectionChange: ({ selectedKeys }) => setAlign(selectedKeys),
        ariaLabel: 'Text alignment',
      },
      createElement(OgeButton, { key: 'l', value: 'left', text: 'Left' }),
      createElement(OgeButton, { key: 'c', value: 'center', text: 'Center' }),
      createElement(OgeButton, { key: 'r', value: 'right', text: 'Right' }),
    ),
    createElement(
      'span',
      { key: 'o', className: 'text-sm opacity-70' },
      `selected: ${align.join(', ') || '—'}`,
    ),
  );
}

function MultipleSelectionPreview() {
  const [styles, setStyles] = useState<readonly string[]>(['bold']);
  return row(
    createElement(
      OgeButtonGroup,
      {
        key: 'g',
        selectionMode: 'multiple',
        selectedKeys: styles,
        onSelectionChange: ({ selectedKeys }) => setStyles(selectedKeys),
        stylingMode: 'outlined',
        ariaLabel: 'Text styles',
      },
      createElement(OgeButton, {
        key: 'b',
        value: 'bold',
        text: 'B',
        hint: 'Bold',
      }),
      createElement(OgeButton, {
        key: 'i',
        value: 'italic',
        text: 'I',
        hint: 'Italic',
      }),
      createElement(OgeButton, {
        key: 'u',
        value: 'underline',
        text: 'U',
        hint: 'Underline',
      }),
    ),
    createElement(
      'span',
      { key: 'o', className: 'text-sm opacity-70' },
      `active: ${styles.join(', ') || '—'}`,
    ),
  );
}

function DataDrivenPreview() {
  const [period, setPeriod] = useState<readonly string[]>(['week']);
  return row(
    createElement(OgeButtonGroup, {
      key: 'g',
      selectionMode: 'single',
      items: PERIODS,
      selectedKeys: period,
      onSelectionChange: ({ selectedKeys }) => setPeriod(selectedKeys),
      size: 'sm',
      ariaLabel: 'Period',
    }),
    createElement(
      'span',
      { key: 'o', className: 'text-sm opacity-70' },
      `period: ${period.join(', ') || '—'}`,
    ),
  );
}

/**
 * The React half of the button-group page — the same three demo sections as
 * the Angular page, same example content, real React state in the previews.
 */
@Component({
  selector: 'app-react-button-group-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/buttons/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['single = radiogroup', 'arrows select']"
      heading="Single selection (radio pattern)"
      description="One segment stays selected at all times, exactly like a radio group: the group takes <code>role='radiogroup'</code>, children become <code>role='radio'</code> with <code>aria-checked</code>, and arrow keys move focus <em>and</em> selection together. Control the state with <code>selectedKeys</code> + <code>onSelectionChange</code>, or start uncontrolled from <code>defaultSelectedKeys</code>."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="single" />
    </app-demo-card>

    <app-demo-card
      [chips]="['multiple = toggle buttons', 'aria-pressed']"
      heading="Multiple selection (toggle buttons)"
      description="Each segment toggles independently (<code>aria-pressed</code> semantics) — the classic text-formatting toolbar. <code>onSelectionChange</code> reports the full state plus <code>addedKeys</code>/<code>removedKeys</code> diffs, so you never have to compute what changed."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="multiple" />
    </app-demo-card>

    <app-demo-card
      [chips]="['data-driven items', 'cascaded size']"
      heading="Data-driven items"
      description="When the segments come from data, pass an <code>items</code> array instead of (or in addition to) declarative children — each entry carries <code>value</code>, <code>text</code>, optional <code>hint</code>/<code>disabled</code>/<code>severity</code>/<code>badge</code>. The group's <code>stylingMode</code>, <code>severity</code> and <code>size</code> cascade into every child unless the child overrides them."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="dataDriven" />
    </app-demo-card>
  `,
})
export class ReactButtonGroupDemos {
  protected readonly demos = BUTTON_GROUP_DEMOS;

  protected readonly single = () => createElement(SingleSelectionPreview);
  protected readonly multiple = () => createElement(MultipleSelectionPreview);
  protected readonly dataDriven = () => createElement(DataDrivenPreview);
}

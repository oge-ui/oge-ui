import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeChip,
  OgeChipList,
  type OgeChipItem,
  type OgeChipKey,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_CHIP_DEMOS } from './chip-snippets';

/** TOC of the React view — the same seven sections as the Angular chip page. */
export const REACT_LAYOUT_CHIP_SECTIONS = [
  'Chips',
  'Selectable chips',
  'Removable chips',
  'Chip list — single selection',
  'Chip list — multiple selection (filters)',
  'Removable list (APG grid)',
  'Custom chip template',
] as const;

const STAR =
  'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.8 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z';

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row' }, ...children);

const SIZES: OgeChipItem[] = [
  { key: 's', label: 'Small' },
  { key: 'm', label: 'Medium' },
  { key: 'l', label: 'Large' },
  { key: 'xl', label: 'X-Large', disabled: true },
];
const FILTERS: OgeChipItem[] = [
  { key: 'open', label: 'Open' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'bug', label: 'Bug', severity: 'danger' },
  { key: 'docs', label: 'Docs', severity: 'accent' },
];
const PEOPLE: OgeChipItem[] = [
  { key: 1, label: 'Ada Lovelace', avatar: { name: 'Ada Lovelace' } },
  { key: 2, label: 'Grace Hopper', avatar: { name: 'Grace Hopper' } },
  { key: 3, label: 'Alan Turing', avatar: { name: 'Alan Turing' } },
  { key: 4, label: 'Katherine Johnson', avatar: { name: 'Katherine Johnson' } },
];
const LANGUAGES: OgeChipItem[] = [
  { key: 'ts', label: 'TypeScript' },
  { key: 'rs', label: 'Rust' },
  { key: 'go', label: 'Go' },
];
const COUNTS: Record<string, number> = { ts: 128, rs: 42, go: 37 };

function SelectableDemo(): ReactNode {
  const [remote, setRemote] = useState(true);
  const [fullTime, setFullTime] = useState(false);
  return createElement(
    'div',
    null,
    row(
      createElement(OgeChip, {
        key: 'r',
        label: 'Remote',
        selectable: true,
        selected: remote,
        onSelectedChange: setRemote,
      }),
      createElement(OgeChip, {
        key: 'f',
        label: 'Full-time',
        selectable: true,
        selected: fullTime,
        onSelectedChange: setFullTime,
      }),
    ),
    createElement(
      'p',
      { className: 'mt-2 text-sm', 'data-testid': 'chip-selected' },
      `remote: ${remote} · full-time: ${fullTime}`,
    ),
  );
}

const TAGS = ['Design', 'Research', 'Writing'];

function RemovableDemo(): ReactNode {
  const [tags, setTags] = useState(TAGS);
  return row(
    ...(tags.length
      ? tags.map((tag) =>
          createElement(OgeChip, {
            key: tag,
            label: tag,
            removable: true,
            onRemoved: () =>
              setTags((current) => current.filter((t) => t !== tag)),
          }),
        )
      : [
          createElement(
            'button',
            {
              key: 'reset',
              type: 'button',
              className: 'demo-btn',
              onClick: () => setTags(TAGS),
            },
            'Reset tags',
          ),
        ]),
  );
}

function SingleDemo(): ReactNode {
  const [size, setSize] = useState<readonly OgeChipKey[]>(['m']);
  return createElement(
    'div',
    null,
    createElement(OgeChipList, {
      items: SIZES,
      selectionMode: 'single',
      selectedKeys: size,
      onSelectedKeysChange: setSize,
      ariaLabel: 'Size',
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm' },
      `size: ${size.join(', ') || 'none'}`,
    ),
  );
}

function MultipleDemo(): ReactNode {
  const [active, setActive] = useState<readonly OgeChipKey[]>(['open']);
  const [last, setLast] = useState('—');
  return createElement(
    'div',
    null,
    createElement(OgeChipList, {
      items: FILTERS,
      selectionMode: 'multiple',
      selectedKeys: active,
      onSelectedKeysChange: setActive,
      ariaLabel: 'Filters',
      onSelectionChanged: (event) => setLast(event.item.label),
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm', 'data-testid': 'chip-filters' },
      `active: ${active.join(', ') || 'none'} · last: ${last}`,
    ),
  );
}

function GridDemo(): ReactNode {
  const [people, setPeople] = useState(PEOPLE);
  return createElement(
    'div',
    null,
    createElement(OgeChipList, {
      items: people,
      removable: true,
      ariaLabel: 'Recipients',
      onItemRemoved: (event) =>
        setPeople((current) => current.filter((p) => p.key !== event.item.key)),
    }),
    people.length === 0
      ? createElement(
          'button',
          {
            type: 'button',
            className: 'demo-btn mt-2',
            onClick: () => setPeople(PEOPLE),
          },
          'Reset recipients',
        )
      : null,
  );
}

function TemplateDemo(): ReactNode {
  const [picked, setPicked] = useState<readonly OgeChipKey[]>(['ts']);
  return createElement(OgeChipList, {
    items: LANGUAGES,
    selectionMode: 'multiple',
    selectedKeys: picked,
    onSelectedKeysChange: setPicked,
    ariaLabel: 'Languages',
    renderChip: ({ item }) => [
      createElement('strong', { key: 'l' }, item.label),
      ' ',
      createElement(
        'span',
        { key: 'c', className: 'opacity-70' },
        String(COUNTS[item.key]),
      ),
    ],
  });
}

/**
 * The React half of the chip page — the same seven sections as the Angular
 * page, rendered as real React trees inside `/components/chip` when the
 * reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-chip-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/layout/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['icon', 'avatar', 'severity', 'stylingMode', 'size']"
      heading="Chips"
      description="A plain chip is static text — no role and nothing focusable. A leading icon takes SVG path data; an avatar renders the image, then the initials, and is always <code>aria-hidden</code> because the label is the name."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['selectable', 'onSelectedChange', 'aria-pressed']"
      heading="Selectable chips"
      description="<code>selectable</code> renders a toggle <code>&amp;lt;button aria-pressed&amp;gt;</code>. The selected state is a tint, an accent frame <strong>and</strong> a check glyph — it never rides on colour alone."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="selectable" />
    </app-demo-card>

    <app-demo-card
      [chips]="['removable', 'onRemoved', '24px target']"
      heading="Removable chips"
      description="<code>removable</code> adds a separate, real remove button named &ldquo;Remove {label}&rdquo; from the messages catalog. The chip moves no data — drop it in <code>onRemoved</code>."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="removable" />
    </app-demo-card>

    <app-demo-card
      [chips]="['selectionMode: single', 'APG listbox', 'roving tabindex']"
      heading="Chip list — single selection"
      description="Selectable chips form an APG listbox with one tab stop: Left / Right (mirrored in RTL), Up / Down, Home and End move; Space or Enter toggles. Disabled chips are skipped."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="single" />
    </app-demo-card>

    <app-demo-card
      [chips]="['selectionMode: multiple', 'aria-multiselectable']"
      heading="Chip list — multiple selection (filters)"
      description="<code>multiple</code> adds <code>aria-multiselectable</code>; <code>onSelectionChanged</code> carries the previous and the next keys plus the toggled chip."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="multiple" />
    </app-demo-card>

    <app-demo-card
      [chips]="['APG grid', 'Delete / Backspace', 'focus after removal']"
      heading="Removable list (APG grid)"
      description="Chips that can only be removed form an APG layout grid: each chip is a row with a label cell and a cell holding a real remove button. Delete focuses the chip that took its place, Backspace the previous one. A cancelable <code>onItemRemoving</code> precedes <code>onItemRemoved</code>."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="grid" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderChip', 'context']"
      heading="Custom chip template"
      description="<code>renderChip</code> replaces the label only: the list keeps the role, the focus, the check glyph and the remove affordance, so keep it non-interactive."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="template" />
    </app-demo-card>
  `,
})
export class ReactLayoutChipDemos {
  protected readonly demos = LAYOUT_CHIP_DEMOS;

  protected readonly basics = () =>
    row(
      createElement(OgeChip, { key: 'a', label: 'Angular' }),
      createElement(OgeChip, {
        key: 'f',
        label: 'Featured',
        icon: STAR,
        severity: 'accent',
      }),
      createElement(OgeChip, {
        key: 'p',
        label: 'Ada Lovelace',
        avatar: { name: 'Ada Lovelace' },
      }),
      createElement(OgeChip, {
        key: 's',
        label: 'Passed',
        severity: 'success',
        stylingMode: 'outlined',
      }),
      createElement(OgeChip, {
        key: 'b',
        label: 'Blocked',
        severity: 'danger',
        size: 'sm',
      }),
    );
  protected readonly selectable = () => createElement(SelectableDemo);
  protected readonly removable = () => createElement(RemovableDemo);
  protected readonly single = () => createElement(SingleDemo);
  protected readonly multiple = () => createElement(MultipleDemo);
  protected readonly grid = () => createElement(GridDemo);
  protected readonly template = () => createElement(TemplateDemo);
}

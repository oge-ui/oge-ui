import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeChip,
  OgeChipList,
  OgeChipTemplate,
  type OgeChipItem,
  type OgeChipItemRemovedEvent,
  type OgeChipKey,
} from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_CHIP_SECTIONS,
  ReactLayoutChipDemos,
} from '../react-layout/chip';
import {
  CHIPS_SNIPPET,
  GRID_SNIPPET,
  MULTIPLE_SNIPPET,
  REMOVABLE_SNIPPET,
  SELECTABLE_SNIPPET,
  SINGLE_SNIPPET,
  TEMPLATE_SNIPPET,
} from './chip-snippets';

const SECTIONS = [
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

export const CHIP_PEOPLE: readonly OgeChipItem[] = [
  { key: 1, label: 'Ada Lovelace', avatar: { name: 'Ada Lovelace' } },
  { key: 2, label: 'Grace Hopper', avatar: { name: 'Grace Hopper' } },
  { key: 3, label: 'Alan Turing', avatar: { name: 'Alan Turing' } },
  {
    key: 4,
    label: 'Katherine Johnson',
    avatar: { name: 'Katherine Johnson' },
  },
];

@Component({
  selector: 'app-layout-chip',
  imports: [
    OgeChip,
    OgeChipList,
    OgeChipTemplate,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutChipDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Chip"
      category="Layout"
      categoryLink="/components/chip"
      [chips]="['APG listbox', 'APG grid', 'aria-pressed', 'removable', 'RTL']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeChip&gt;</code> and <code>&lt;OgeChipList&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> render the same markup and the
          same APG shapes as the Angular pair, on the shared chip core in
          <code>&#64;oge-ui/behavior</code>.
        </p>
      } @else {
        <p>
          <code>oge-chip</code> is a compact tag, filter or person token; a
          selectable one is a toggle button, a removable one carries a real
          remove button. <code>oge-chip-list</code> groups chips behind one tab
          stop and picks its WAI-ARIA shape from what the chips can do.
        </p>
      }
      <p>
        <strong>The role follows the capability:</strong> selectable chips are a
        <strong>listbox</strong> (options with <code>aria-selected</code>),
        chips that can only be removed are a <strong>layout grid</strong> (so
        the remove button is a real, reachable control), and static chips are a
        plain <strong>list</strong>. A button inside an option would be a nested
        interactive control, so in a listbox the ✕ is decoration and Delete /
        Backspace — advertised with <code>aria-keyshortcuts</code> — is the
        keyboard path.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-chip-demos />
    } @else {
      <app-demo-card
        [chips]="['icon', 'avatar', 'severity', 'stylingMode', 'size']"
        heading="Chips"
        description="A plain chip is static text — no role and nothing focusable. A leading icon takes SVG path data; an avatar renders the image, then the initials, and is always <code>aria-hidden</code> because the label is the name."
        [code]="chipsSnippet"
        language="ts"
      >
        <div class="demo-row">
          <oge-chip label="Angular" />
          <oge-chip label="Featured" [icon]="star" severity="accent" />
          <oge-chip label="Ada Lovelace" [avatar]="{ name: 'Ada Lovelace' }" />
          <oge-chip label="Passed" severity="success" stylingMode="outlined" />
          <oge-chip label="Blocked" severity="danger" size="sm" />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['selectable', '[(selected)]', 'aria-pressed']"
        heading="Selectable chips"
        description="<code>selectable</code> renders a toggle <code>&amp;lt;button aria-pressed&amp;gt;</code>. The selected state is a tint, an accent frame <strong>and</strong> a check glyph — it never rides on colour alone, and forced colors repaint it as a Highlight fill."
        [code]="selectableSnippet"
        language="ts"
      >
        <div class="demo-row">
          <oge-chip label="Remote" [selectable]="true" [(selected)]="remote" />
          <oge-chip
            label="Full-time"
            [selectable]="true"
            [(selected)]="fullTime"
          />
        </div>
        <p class="mt-2 text-sm" data-testid="chip-selected">
          remote: {{ remote() }} · full-time: {{ fullTime() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['removable', '(removed)', '24px target']"
        heading="Removable chips"
        description="<code>removable</code> adds a separate, real remove button named &ldquo;Remove {label}&rdquo; from the messages catalog. The chip moves no data — drop it in <code>(removed)</code>."
        [code]="removableSnippet"
        language="ts"
      >
        <div class="demo-row">
          @for (tag of tags(); track tag) {
            <oge-chip [label]="tag" [removable]="true" (removed)="drop(tag)" />
          } @empty {
            <button type="button" class="demo-btn" (click)="resetTags()">
              Reset tags
            </button>
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['selectionMode: single', 'APG listbox', 'roving tabindex']"
        heading="Chip list — single selection"
        description="Selectable chips form an APG listbox with one tab stop: Left / Right (mirrored in RTL), Up / Down, Home and End move; Space or Enter toggles. Disabled chips are skipped. A second press clears a single selection — chips are filters."
        [code]="singleSnippet"
        language="ts"
      >
        <oge-chip-list
          [items]="sizes"
          selectionMode="single"
          [(selectedKeys)]="size"
          ariaLabel="Size"
        />
        <p class="mt-2 text-sm">size: {{ size().join(', ') || 'none' }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['selectionMode: multiple', 'aria-multiselectable']"
        heading="Chip list — multiple selection (filters)"
        description="<code>multiple</code> adds <code>aria-multiselectable</code>; <code>selectionChanged</code> carries the previous and the next keys plus the toggled chip."
        [code]="multipleSnippet"
        language="ts"
      >
        <oge-chip-list
          [items]="filters"
          selectionMode="multiple"
          [(selectedKeys)]="active"
          ariaLabel="Filters"
          (selectionChanged)="last.set($event.item.label)"
        />
        <p class="mt-2 text-sm" data-testid="chip-filters">
          active: {{ active().join(', ') || 'none' }} · last: {{ last() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['APG grid', 'Delete / Backspace', 'focus after removal']"
        heading="Removable list (APG grid)"
        description="Chips that can only be removed form an APG layout grid: each chip is a row with a label cell and a cell holding a real remove button. Arrows walk the cells, Delete removes and focuses the chip that took its place, Backspace the previous one. A cancelable <code>itemRemoving</code> precedes <code>itemRemoved</code>."
        [code]="gridSnippet"
        language="ts"
      >
        <oge-chip-list
          [items]="people()"
          [removable]="true"
          ariaLabel="Recipients"
          (itemRemoved)="removePerson($event)"
        />
        @if (people().length === 0) {
          <button type="button" class="demo-btn mt-2" (click)="resetPeople()">
            Reset recipients
          </button>
        }
      </app-demo-card>

      <app-demo-card
        [chips]="['[ogeChipTemplate]', 'context']"
        heading="Custom chip template"
        description="<code>[ogeChipTemplate]</code> replaces the label only: the list keeps the role, the focus, the check glyph and the remove affordance, so keep the template non-interactive."
        [code]="templateSnippet"
        language="ts"
      >
        <oge-chip-list
          [items]="languages"
          selectionMode="multiple"
          [(selectedKeys)]="picked"
          ariaLabel="Languages"
        >
          <ng-template ogeChipTemplate let-item>
            <strong>{{ item.label }}</strong>
            <span class="text-(--oge-muted-color)">{{ counts[item.key] }}</span>
          </ng-template>
        </oge-chip-list>
      </app-demo-card>
    }
  `,
})
export class LayoutChipPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_CHIP_SECTIONS;
  protected readonly chipsSnippet = CHIPS_SNIPPET;
  protected readonly selectableSnippet = SELECTABLE_SNIPPET;
  protected readonly removableSnippet = REMOVABLE_SNIPPET;
  protected readonly singleSnippet = SINGLE_SNIPPET;
  protected readonly multipleSnippet = MULTIPLE_SNIPPET;
  protected readonly gridSnippet = GRID_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;

  protected readonly star = STAR;
  protected readonly remote = signal(true);
  protected readonly fullTime = signal(false);
  protected readonly tags = signal(['Design', 'Research', 'Writing']);

  protected readonly sizes: OgeChipItem[] = [
    { key: 's', label: 'Small' },
    { key: 'm', label: 'Medium' },
    { key: 'l', label: 'Large' },
    { key: 'xl', label: 'X-Large', disabled: true },
  ];
  protected readonly size = signal<readonly OgeChipKey[]>(['m']);

  protected readonly filters: OgeChipItem[] = [
    { key: 'open', label: 'Open' },
    { key: 'mine', label: 'Assigned to me' },
    { key: 'bug', label: 'Bug', severity: 'danger' },
    { key: 'docs', label: 'Docs', severity: 'accent' },
  ];
  protected readonly active = signal<readonly OgeChipKey[]>(['open']);
  protected readonly last = signal('—');

  protected readonly people = signal<OgeChipItem[]>([...CHIP_PEOPLE]);

  protected readonly languages: OgeChipItem[] = [
    { key: 'ts', label: 'TypeScript' },
    { key: 'rs', label: 'Rust' },
    { key: 'go', label: 'Go' },
  ];
  protected readonly counts: Record<string, number> = {
    ts: 128,
    rs: 42,
    go: 37,
  };
  protected readonly picked = signal<readonly OgeChipKey[]>(['ts']);

  protected drop(tag: string): void {
    this.tags.update((tags) => tags.filter((t) => t !== tag));
  }

  protected resetTags(): void {
    this.tags.set(['Design', 'Research', 'Writing']);
  }

  protected removePerson(event: OgeChipItemRemovedEvent): void {
    this.people.update((people) =>
      people.filter((p) => p.key !== event.item.key),
    );
  }

  protected resetPeople(): void {
    this.people.set([...CHIP_PEOPLE]);
  }
}

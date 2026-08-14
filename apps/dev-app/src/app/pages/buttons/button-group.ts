import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeButton,
  OgeButtonGroup,
  type OgeButtonGroupItem,
} from '@oge-ui/buttons';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_BUTTON_GROUP_SECTIONS,
  ReactButtonGroupDemos,
} from '../react-buttons/button-group';
import {
  ITEMS_SNIPPET,
  MULTI_SNIPPET,
  SINGLE_SNIPPET,
} from './button-group-snippets';

const SECTIONS = [
  'Single selection (radio pattern)',
  'Multiple selection (toggle buttons)',
  'Data-driven items',
] as const;

@Component({
  selector: 'app-buttons-group',
  imports: [
    OgeButton,
    OgeButtonGroup,
    DemoCard,
    DocHeader,
    PageToc,
    ReactButtonGroupDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Button Group"
      [chips]="
        fw.isReact()
          ? ['selectionMode', 'selectedKeys', 'items', 'roving tabindex']
          : ['selectionMode', '[(selectedKeys)]', 'items', 'roving tabindex']
      "
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeButtonGroup&gt;</code> lays out buttons as one segmented
          control and optionally tracks selection. Children inherit the group's
          <code>stylingMode</code>, <code>severity</code> and <code>size</code>;
          arrow keys move focus with a roving tabindex — in
          <code>single</code> mode they move the selection too, exactly like a
          radio group.
        </p>
      } @else {
        <p>
          <code>&lt;oge-button-group&gt;</code> lays out buttons as one
          segmented control and optionally tracks selection. Children inherit
          the group's <code>stylingMode</code>, <code>severity</code> and
          <code>size</code>; arrow keys move focus with a roving tabindex — in
          <code>single</code> mode they move the selection too, exactly like a
          radio group.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-button-group-demos />

      <h3>Notes</h3>
      <ul>
        <li>
          Roles adapt to the mode: <code>toolbar</code> (none),
          <code>radiogroup</code> + <code>role="radio"</code> children (single),
          <code>group</code> + <code>aria-pressed</code> children (multiple).
        </li>
        <li>
          Declarative children and the <code>items</code> array can be mixed;
          items render after the projected buttons. Icons need declarative
          children.
        </li>
        <li>
          Selection is a controlled/uncontrolled pair:
          <code>selectedKeys</code> + <code>onSelectionChange</code>, or start
          uncontrolled from <code>defaultSelectedKeys</code>. The change payload
          always carries a fresh array.
        </li>
        <li>
          A group-level <code>disabled</code> disables every child; individual
          buttons can still opt out of selection by omitting <code>value</code>.
        </li>
      </ul>
    } @else {
      <app-demo-card
        [chips]="['single = radiogroup', 'arrows select']"
        heading="Single selection (radio pattern)"
        description="One segment stays selected at all times, exactly like a radio group: the group takes <code>role='radiogroup'</code>, children become <code>role='radio'</code> with <code>aria-checked</code>, and arrow keys move focus <em>and</em> selection together. <code>selectedKeys</code> is a two-way model, so presets and programmatic changes flow both ways."
        [code]="singleSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-4">
          <oge-button-group
            selectionMode="single"
            [(selectedKeys)]="align"
            ariaLabel="Text alignment"
          >
            <oge-button value="left" text="Left" />
            <oge-button value="center" text="Center" />
            <oge-button value="right" text="Right" />
          </oge-button-group>
          <span class="text-sm opacity-70"
            >selected: {{ align().join(', ') || '—' }}</span
          >
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['multiple = toggle buttons', 'aria-pressed']"
        heading="Multiple selection (toggle buttons)"
        description="Each segment toggles independently (<code>aria-pressed</code> semantics) — the classic text-formatting toolbar. <code>selectionChanged</code> reports the full state plus <code>addedKeys</code>/<code>removedKeys</code> diffs, so you never have to compute what changed."
        [code]="multiSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-4">
          <oge-button-group
            selectionMode="multiple"
            [(selectedKeys)]="styles"
            stylingMode="outlined"
            ariaLabel="Text styles"
          >
            <oge-button value="bold" text="B" hint="Bold" />
            <oge-button value="italic" text="I" hint="Italic" />
            <oge-button value="underline" text="U" hint="Underline" />
          </oge-button-group>
          <span class="text-sm opacity-70"
            >active: {{ styles().join(', ') || '—' }}</span
          >
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['data-driven [items]', 'cascaded size']"
        heading="Data-driven items"
        description="When the segments come from data, pass an <code>items</code> array instead of (or in addition to) declarative children — each entry carries <code>value</code>, <code>text</code>, optional <code>hint</code>/<code>disabled</code>/<code>severity</code>/<code>badge</code>. The group's <code>stylingMode</code>, <code>severity</code> and <code>size</code> cascade into every child unless the child overrides them."
        [code]="itemsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-4">
          <oge-button-group
            selectionMode="single"
            [items]="periods"
            [(selectedKeys)]="period"
            size="sm"
            ariaLabel="Period"
          />
          <span class="text-sm opacity-70"
            >period: {{ period().join(', ') || '—' }}</span
          >
        </div>
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          Roles adapt to the mode: <code>toolbar</code> (none),
          <code>radiogroup</code> + <code>role="radio"</code> children (single),
          <code>group</code> + <code>aria-pressed</code> children (multiple).
        </li>
        <li>
          Declarative children and the <code>items</code> array can be mixed;
          items render after the projected buttons. Icons need declarative
          children.
        </li>
        <li>
          <code>selectedKeys</code> always receives a fresh array — safe for
          OnPush change detection and <code>computed()</code> consumers.
        </li>
        <li>
          A group-level <code>disabled</code> disables every child; individual
          buttons can still opt out of selection by omitting <code>value</code>.
        </li>
      </ul>
    }
  `,
})
export class ButtonsGroupPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_BUTTON_GROUP_SECTIONS;
  protected readonly align = signal<readonly string[]>(['left']);
  protected readonly styles = signal<readonly string[]>(['bold']);
  protected readonly period = signal<readonly string[]>(['week']);

  protected readonly periods: OgeButtonGroupItem[] = [
    { value: 'day', text: 'Day' },
    { value: 'week', text: 'Week' },
    { value: 'month', text: 'Month' },
    { value: 'year', text: 'Year', disabled: true },
  ];

  protected readonly singleSnippet = SINGLE_SNIPPET;
  protected readonly multiSnippet = MULTI_SNIPPET;
  protected readonly itemsSnippet = ITEMS_SNIPPET;
}

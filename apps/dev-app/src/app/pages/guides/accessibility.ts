import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { slugify } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import keyboard from './generated/keyboard.json';
import { GuideTable } from './guide-table';

const SECTIONS = [
  'Patterns per family',
  'Keyboard maps',
  'Grid and tree list keyboard',
  'Screen readers',
  'Forced colors, motion and direction',
  'Automated checks',
] as const;

interface KeyboardMap {
  readonly family: string;
  readonly npm: string;
  readonly title: string;
  readonly rows: readonly (readonly string[])[];
}

/**
 * `/guides/accessibility` — the WAI-ARIA patterns, keyboard maps (generated
 * from the API reference data), screen-reader behaviour, user preferences and
 * the automated checks behind them.
 */
@Component({
  selector: 'app-guide-accessibility',
  imports: [DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Accessibility"
      category="Guides"
      categoryLink="/guides"
      [chips]="['WCAG 2.2 AA', 'WAI-ARIA APG', 'axe']"
    >
      <p>
        Every family follows a WAI-ARIA Authoring Practices pattern where one
        exists, works from the keyboard alone, announces what changes, and
        respects forced colors, reduced motion and right-to-left text. Both
        render layers share one implementation of each, so what is true below is
        true in Angular and in React. The criterion-by-criterion view is the
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/guides/accessibility/conformance"
          >conformance report</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="patterns-per-family" class="scroll-mt-20">Patterns per family</h2>
    <app-guide-table
      caption="WAI-ARIA patterns and the end-to-end specs that drive them"
      [head]="['Component', 'Pattern', 'Keyboard covered by']"
      [rows]="patterns"
    />

    <h2 id="keyboard-maps" class="scroll-mt-20">Keyboard maps</h2>
    <p>
      Generated from the API reference tables, so they cannot disagree with the
      component pages.
    </p>
    @for (map of maps; track map.family + map.title) {
      <h3 [id]="anchor(map)" class="scroll-mt-20">
        {{ map.family }} <span class="font-normal">— {{ map.title }}</span>
      </h3>
      <p class="text-[13px] text-gray-500 dark:text-gray-400">
        <code>{{ map.npm }}</code>
      </p>
      <app-guide-table
        [caption]="map.family + ' — ' + map.title"
        [head]="['Key or item', 'Scope', 'Behaviour']"
        [rows]="map.rows"
      />
    }

    <h2 id="grid-and-tree-list-keyboard" class="scroll-mt-20">
      Grid and tree list keyboard
    </h2>
    <p>
      The grid is an APG grid (a treegrid when it groups or shows detail rows);
      the tree list is a treegrid. Every pointer gesture has a keyboard
      alternative (WCAG 2.1.1 and 2.5.7):
    </p>
    <app-guide-table
      caption="Keyboard alternatives to dragging in the grid and tree list"
      [head]="['Keys', 'Where', 'Does']"
      [rows]="gridKeys"
    />

    <h2 id="screen-readers" class="scroll-mt-20">Screen readers</h2>
    <ul>
      <li>
        <strong>One announcer per document.</strong> Families announce through a
        shared pair of visually hidden live regions (<code
          >[data-oge-live-announcer="polite"]</code
        >
        and <code>"assertive"</code>), so two grids on a page never talk over
        each other. Messages are debounced (100 ms), de-duplicated within a
        second and cleared after five.
      </li>
      <li>
        <strong>What the grid and tree list announce:</strong> sort changes, the
        row count after filtering or searching, page changes, group and row
        expansion, selection counts, range selection, paste / fill, undo / redo
        and validation errors (assertive). Turn them off per instance or
        app-wide with <code>announcements</code>; translate them with the
        message catalog.
      </li>
      <li>
        <strong>Errors are tied to their field:</strong> an invalid cell or form
        field sets <code>aria-invalid</code>, <code>aria-errormessage</code> and
        <code>aria-describedby</code>.
      </li>
      <li>
        Charts, the pivot grid, kanban, pagination, the carousel and badges keep
        their own polite regions for changes that only they can describe.
      </li>
      <li>
        <strong>Not yet done:</strong> there is no recorded manual test with a
        screen reader (NVDA, JAWS, VoiceOver, TalkBack). Everything on this page
        is checked by automated tests of the ARIA output; a report from a
        screen-reader user is a bug like any other.
      </li>
    </ul>

    <h2 id="forced-colors-motion-and-direction" class="scroll-mt-20">
      Forced colors, motion and direction
    </h2>
    <app-guide-table
      caption="User preferences the components follow"
      [head]="['Preference', 'What the components do', 'Checked by']"
      [rows]="preferences"
    />

    <h2 id="automated-checks" class="scroll-mt-20">Automated checks</h2>
    <app-guide-table
      caption="Accessibility checks in CI"
      [head]="['Check', 'Runs', 'Covers']"
      [rows]="checks"
    />
    <p>
      Two axe rules are switched off in the per-component specs, with the reason
      in the spec: <code>heading-order</code> (the docs pages put demo headings
      under the page title by design) and, for leading utility columns that
      carry an <code>aria-label</code> but no visible text,
      <code>empty-table-header</code> — a best-practice rule, not a WCAG
      criterion. <code>color-contrast</code> is scanned separately, on the
      components only, so a demo's own colours cannot hide a component failure.
    </p>
  `,
})
export class GuideAccessibilityPage {
  protected readonly sections = SECTIONS;
  protected readonly maps: readonly KeyboardMap[] = keyboard.maps;

  protected anchor(map: KeyboardMap): string {
    return 'keys-' + slugify(map.family);
  }

  protected readonly patterns = [
    [
      'Data grid',
      'APG grid; treegrid when grouped or with detail rows',
      '`grid-keyboard-drag.spec.ts`, `selection.spec.ts`, `editing.spec.ts`',
    ],
    ['Tree list', 'APG treegrid', '`tree-list-keyboard-drag.spec.ts`'],
    [
      'Pivot grid',
      'APG grid (one tab stop) + reorderable field chips',
      '`pivot-keyboard.spec.ts`',
    ],
    [
      'Select box, tag box, autocomplete',
      'APG combobox + listbox',
      '`select-box.spec.ts`, `list-editors-g4b.spec.ts`',
    ],
    ['Tabs', 'APG tabs', '`tabs.spec.ts`'],
    [
      'Tree view',
      'APG treeview',
      '`tree-view.spec.ts`, `tree-view-depth.spec.ts`',
    ],
    [
      'Menubar, context menu, drop-down button',
      'APG menubar / menu / menu button',
      '`menubar.spec.ts`, `context-menu.spec.ts`',
    ],
    ['Speed dial (FAB)', 'APG menu button', '`fab.spec.ts`'],
    [
      'Modal, action sheet',
      'Modal dialog with focus containment',
      '`overlay.spec.ts`, `action-sheet.spec.ts`',
    ],
    [
      'Accordion, panel bar, expansion panel',
      'APG accordion / disclosure',
      '`accordion.spec.ts`',
    ],
    ['Slider, range slider', 'APG slider', '`slider.spec.ts`'],
    [
      'Kanban',
      'Keyboard card moves between columns, announced',
      '`kanban.spec.ts`',
    ],
    [
      'BPMN editor',
      '`role="application"` canvas with its own key map',
      '`bpmn.spec.ts`',
    ],
  ];

  protected readonly gridKeys = [
    [
      '`Alt` + `←` / `→`',
      'Column header',
      'Resize the column (the resize handle is a `separator`)',
    ],
    [
      '`Ctrl` + `Shift` + `←` / `→`',
      'Column header',
      'Move the column, announced',
    ],
    ['`Ctrl` + `↑` / `↓`', 'Row (row drag on)', 'Move the row'],
    ['`Ctrl` + `↑` / `↓`', 'Column chooser', 'Reorder the list'],
    [
      'Keyboard on the chips',
      'Group panel',
      'Group, ungroup and reorder groups',
    ],
    [
      '`Ctrl` + `→` / `←` (tree list)',
      'Row (row drag on)',
      'Indent / outdent under a sibling',
    ],
  ];

  protected readonly preferences = [
    [
      'Forced colors (Windows High Contrast)',
      'System colours only; the focus ring is an outline that survives; selection paints `Highlight`; on/off states are not colour alone',
      '`forced-colors.spec.ts`',
    ],
    [
      'Reduced motion',
      'CSS transitions drop to zero; scripted motion asks `prefersReducedMotion()` first',
      '`reduced-motion.spec.ts`',
    ],
    [
      'Right-to-left',
      'Logical CSS properties; arrow keys mirror; charts, Gantt and the BPMN chrome flip (the BPMN canvas stays left-to-right)',
      '`rtl.spec.ts`',
    ],
    [
      'Contrast',
      'Default, dark and high-contrast themes hold text and controls to WCAG AA',
      '`contrast.spec.ts`, `themes.spec.ts`, `high-contrast.spec.ts`',
    ],
    [
      'Target size',
      'Small controls get a 24 px hit area, 44 px on coarse pointers',
      'Stylesheet mixin (`hit-area`); no dedicated spec',
    ],
  ];

  protected readonly checks = [
    [
      'axe crawl',
      'Nightly',
      'Every sitemap route in both layers, `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, plus colour contrast on every component',
    ],
    [
      'Component axe specs',
      'Every pull request',
      'About 95 spec files scan the components they drive, in both layers',
    ],
    [
      'Contrast',
      'Every pull request',
      'A dozen representative pages, light and dark, components only',
    ],
    [
      'Announcements and errors',
      'Every pull request',
      '`grid-announcements.spec.ts` — live region text, `aria-sort`, error wiring',
    ],
    [
      'Forced colors, reduced motion, RTL',
      'Every pull request',
      'Emulated media and `dir="rtl"`; computed styles and key handling',
    ],
  ];
}

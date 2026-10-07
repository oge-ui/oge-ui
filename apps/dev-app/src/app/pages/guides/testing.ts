import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  ANGULAR_SPEC,
  HARNESS_COMPONENT,
  HARNESS_SPEC,
  JSDOM_STUBS,
  PLAYWRIGHT,
  REACT_SPEC,
  RTL_COMPONENT,
  RTL_SPEC,
  VITEST_SETUP,
} from './testing-snippets';

const SECTIONS = [
  'Unit tests',
  'Harnesses and helpers',
  'Querying OGE components',
  'jsdom gaps',
  'End-to-end with Playwright',
] as const;

/** `/guides/testing` — testing apps built on OGE UI. */
@Component({
  selector: 'app-guide-testing',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Testing"
      category="Guides"
      categoryLink="/guides"
      [chips]="
        fw.isReact()
          ? ['React Testing Library', 'vitest', 'Playwright']
          : ['TestBed', 'vitest', 'Playwright']
      "
    >
      <p>
        How the suite tests its own components, and the same recipes for your
        app: render, query by role and by the stable <code>.oge-*</code> class
        names, drive with the keyboard, and stub only the browser APIs jsdom
        lacks.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="unit-tests" class="scroll-mt-20">Unit tests</h2>
    @if (fw.isReact()) {
      <p>
        The React packages are tested with vitest, jsdom and React Testing
        Library (<code>render</code>, <code>screen</code>,
        <code>fireEvent</code>, <code>act</code>), plus
        <code>&#64;testing-library/jest-dom</code> matchers. Nothing
        OGE-specific is needed — the components render real ARIA roles, so
        <code>getByRole</code> finds them.
      </p>
      <app-code-block [code]="vitestSetup" language="ts" />
      <app-code-block [code]="reactSpec" language="tsx" />
    } @else {
      <p>
        The Angular packages are tested with vitest and
        <code>TestBed</code>: a small host component binds the inputs, the
        fixture is <em>settled</em> (render, wait for signals and effects,
        render again), and assertions read the DOM. The same pattern works under
        Karma or Jest.
      </p>
      <app-code-block [code]="angularSpec" language="ts" />
    }

    <h2 id="harnesses-and-helpers" class="scroll-mt-20">
      Harnesses and helpers
    </h2>
    @if (fw.isReact()) {
      <p>
        The grid, the select box, date box, text box and number box, the modal
        and the tabs ship <strong>React Testing Library helpers</strong> in a
        <code>/testing</code> entry of their package. Each
        <code>get*()</code> finds one component in a container and returns a
        typed object — the same member names as the Angular CDK harnesses —
        whose reads are synchronous and whose actions fire events through
        Testing Library, so <code>&#64;testing-library/react</code> wraps them
        in <code>act</code>. Work a component finishes later (the grid's filter
        debounce, an async close guard) is asserted with
        <code>await waitFor(…)</code>, as anywhere in RTL. The main entries
        never import these, and <code>&#64;testing-library/dom</code> is an
        optional peer only the testing entries need. Each helper has its own
        spec against the real component under <code>&lt;StrictMode&gt;</code>.
      </p>
      <app-guide-table
        caption="Testing Library helper entry points"
        [head]="['Import from', 'Helpers', 'Drives']"
        [rows]="reactHelpers"
      />
      <app-code-block [code]="rtlComponent" language="tsx" />
      <app-code-block [code]="rtlSpec" language="tsx" />
    } @else {
      <p>
        The grid, the select box, date box, text box and number box, the modal
        and the tabs ship <strong>Angular CDK component harnesses</strong> in a
        <code>/testing</code> secondary entry point of their package. A harness
        reads the component through the same ARIA roles and
        <code>.oge-*</code> classes a user's assistive technology sees, and
        waits for the fixture to settle after every action. Install
        <code>&#64;angular/cdk</code> as a dev dependency: it is an optional
        peer that only the testing entries import, and the main entries never
        import a testing entry. Every harness has a spec against the real
        component with <code>TestbedHarnessEnvironment</code>, and the grid's
        also runs in a zoneless TestBed.
      </p>
      <app-guide-table
        caption="Component harness entry points"
        [head]="['Import from', 'Harnesses', 'Drives']"
        [rows]="angularHarnesses"
      />
      <p>
        Modals opened by <code>OgeModalService</code> (alert, confirm, prompt
        included) render into <code>document.body</code>: find them with
        <code>TestbedHarnessEnvironment.documentRootLoader(fixture)</code>. In a
        zoneless TestBed the harness waits for change detection but not for
        timers, so give the grid's filter row
        <code>provideOgeGridConfig({{ '{' }} filterDebounce: 0 {{ '}' }})</code
        >.
      </p>
      <app-code-block [code]="harnessComponent" language="ts" />
      <app-code-block [code]="harnessSpec" language="ts" />
    }

    <h2 id="querying-oge-components" class="scroll-mt-20">
      Querying OGE components
    </h2>
    <app-guide-table
      caption="Stable selectors for tests"
      [head]="['Target', 'Prefer', 'Fallback']"
      [rows]="queries"
    />

    <h2 id="jsdom-gaps" class="scroll-mt-20">jsdom gaps</h2>
    <p>
      The components guard every browser API they call, so a missing one
      degrades instead of throwing. Stub what your spec actually exercises — the
      suite does it per spec, not in a global setup file:
    </p>
    <app-guide-table
      caption="Browser APIs jsdom does not provide"
      [head]="['Missing in jsdom', 'Used by', 'Workaround']"
      [rows]="gaps"
    />
    <app-code-block [code]="jsdomStubs" language="ts" />

    <h2 id="end-to-end-with-playwright" class="scroll-mt-20">
      End-to-end with Playwright
    </h2>
    <ul>
      <li>
        <strong>Poll, don't read once.</strong> Components re-render after
        signals settle; web-first assertions (<code>toHaveValue</code>,
        <code>toBeFocused</code>, <code>toContainText</code>) retry, and
        <code>expect.poll()</code> covers values that are not a locator state.
        The suite's CI fails a test that only passes on retry.
      </li>
      <li>
        <strong>Drive the keyboard.</strong> Every family has a keyboard path
        (see the accessibility guide); <code>locator.press('ArrowDown')</code>
        on the focused element is closer to a user than clicking options.
      </li>
      <li>
        <strong>Pin the locale and time zone.</strong> Number, date and pager
        text follow the browser locale; a machine in another locale formats
        <code>1,500</code> as <code>1.500</code>.
      </li>
      <li>
        <strong>Live regions.</strong> Grid and tree list announcements go to
        one shared region per document,
        <code>[data-oge-live-announcer="polite"]</code> (and
        <code>"assertive"</code> for validation errors).
      </li>
    </ul>
    <app-code-block [code]="playwright" language="ts" />
  `,
})
export class GuideTestingPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly angularSpec = ANGULAR_SPEC;
  protected readonly reactSpec = REACT_SPEC;
  protected readonly vitestSetup = VITEST_SETUP;
  protected readonly jsdomStubs = JSDOM_STUBS;
  protected readonly playwright = PLAYWRIGHT;
  protected readonly harnessComponent = HARNESS_COMPONENT;
  protected readonly harnessSpec = HARNESS_SPEC;
  protected readonly rtlComponent = RTL_COMPONENT;
  protected readonly rtlSpec = RTL_SPEC;

  protected readonly angularHarnesses = [
    [
      '`@oge-ui/grid/testing`',
      '`OgeGridHarness`, `OgeGridRowHarness`',
      'Rows and cells as text, header sorting and `aria-sort`, the filter row, the pager, row selection, F2 cell editing',
    ],
    [
      '`@oge-ui/inputs/testing`',
      '`OgeSelectBoxHarness`, `OgeDateBoxHarness`, `OgeTextBoxHarness`, `OgeNumberBoxHarness`',
      'Value, label, disabled / invalid / required state, open and close, options and `selectOption(text)`, calendar days, keyboard spin',
    ],
    [
      '`@oge-ui/overlay/testing`',
      '`OgeModalHarness`',
      'Open state, title, role, content, action buttons, close via ✕, Escape or backdrop; harnesses inside the panel',
    ],
    [
      '`@oge-ui/tabs/testing`',
      '`OgeTabsHarness`',
      'Tab labels, the selected tab, `selectTab(label)`, disabled and closable tabs, the visible panel',
    ],
  ];

  protected readonly reactHelpers = [
    [
      '`@oge-ui/react-grid/testing`',
      '`getGrid()`, `getAllGrids()`',
      'Rows and cells as text, header sorting and `aria-sort`, the filter row, the pager, row selection, F2 cell editing',
    ],
    [
      '`@oge-ui/react-inputs/testing`',
      '`getSelectBox()`, `getDateBox()`, `getTextBox()`, `getNumberBox()` (and `getAll*`), `selectOption()`',
      'Value, label, disabled / invalid / required state, open and close, options, calendar days, keyboard spin',
    ],
    [
      '`@oge-ui/react-overlay/testing`',
      '`getModal()`, `getAllModals()`',
      'Title, role, content, action buttons, close via ✕, Escape or backdrop — dialogs from `useOgeModals()` included',
    ],
    [
      '`@oge-ui/react-tabs/testing`',
      '`getTabs()`, `getAllTabs()`, `selectTab()`',
      'Tab labels, the selected tab, selecting by label, disabled and closable tabs, the visible panel',
    ],
  ];

  protected readonly queries = [
    [
      'Buttons, editors, menus, tabs, trees',
      "`getByRole('button' | 'combobox' | 'menuitem' | 'tab' | 'treeitem', { name })`",
      'The host tag plus a class: `oge-select-box .oge-input-native`',
    ],
    [
      'Grid rows and cells',
      "`getByRole('row')`, `getByRole('gridcell')`, `getByRole('columnheader', { name })`",
      '`.oge-row`, `.oge-group-row`',
    ],
    [
      'Dialogs and toasts',
      "`getByRole('dialog', { name })`, `getByRole('status')`",
      '—',
    ],
    [
      'One instance among several',
      'Scope to its container (`within(…)` / `locator(…).filter({ hasText })`)',
      'An `id` or `data-testid` you set on the host',
    ],
  ];

  protected readonly gaps = [
    [
      '`HTMLCanvasElement.getContext`',
      'Signature pad, chart and Gantt image export',
      'Spy on it and return `null` (or a fake context)',
    ],
    [
      '`URL.createObjectURL` / `revokeObjectURL`',
      'Upload thumbnails, file downloads',
      'Assign a fake, restore it after the spec',
    ],
    [
      '`ResizeObserver`',
      'Toolbar and breadcrumb overflow, chart sizing',
      'A no-op class via `vi.stubGlobal`',
    ],
    [
      '`matchMedia`',
      'Reduced motion, adaptive popups',
      'A stub answering `matches: false`',
    ],
    [
      '`PointerEvent`, `elementFromPoint`',
      'Drags (kanban, grid column and row moves, sliders)',
      'Dispatch a `MouseEvent` named `pointerdown` / `pointermove` / `pointerup` with `pointerId` and `pointerType` defined on it, on the element under the pointer',
    ],
    [
      '`requestAnimationFrame` timing',
      'Popup placement (Angular)',
      'Stub it asynchronously (`setTimeout(cb, 0)`), never synchronously',
    ],
  ];
}

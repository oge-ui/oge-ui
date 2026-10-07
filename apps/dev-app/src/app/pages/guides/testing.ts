import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  ANGULAR_SPEC,
  JSDOM_STUBS,
  PLAYWRIGHT,
  REACT_SPEC,
  VITEST_SETUP,
} from './testing-snippets';

const SECTIONS = [
  'Unit tests',
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
    <p>
      <strong>Component harnesses are not shipped yet.</strong> There is no
      <code>&#64;oge-ui/&lt;pkg&gt;/testing</code> entry point today; query the
      DOM as above. Planned: CDK harnesses for the grid, select box, date box,
      modal and tabs, plus React Testing Library helpers.
    </p>

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

/**
 * The WCAG 2.2 table of the accessibility conformance report
 * (`/guides/accessibility/conformance`), in the VPAT 2.5 vocabulary.
 *
 * Self-assessed. A level is only "Supports" when the behaviour is built in
 * and, where the remark names one, checked by a test; anything the suite
 * cannot decide for the host application is "Not Applicable" with the reason.
 * Update a row in the same change that alters what it describes.
 */

export type ConformanceLevel =
  'Supports' | 'Partially Supports' | 'Does Not Support' | 'Not Applicable';

export interface CriterionRow {
  /** `1.4.3` */
  readonly id: string;
  readonly name: string;
  readonly level: 'A' | 'AA';
  readonly conformance: ConformanceLevel;
  /** Text with backtick code runs. */
  readonly remarks: string;
}

const APP =
  'A page-level requirement the host application meets; the components do not prevent it.';
const MEDIA = 'No component plays audio or video.';

export const CRITERIA: readonly CriterionRow[] = [
  // ── Level A ───────────────────────────────────────────────────────────────
  {
    id: '1.1.1',
    name: 'Non-text Content',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Icons are decorative (`aria-hidden`) or labelled; icon-only buttons take your label. Charts expose `role="img"` with a generated label, an accessible legend and a screen-reader data table of the plotted values.',
  },
  {
    id: '1.2.1',
    name: 'Audio-only and Video-only (Prerecorded)',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: MEDIA,
  },
  {
    id: '1.2.2',
    name: 'Captions (Prerecorded)',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: MEDIA,
  },
  {
    id: '1.2.3',
    name: 'Audio Description or Media Alternative (Prerecorded)',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: MEDIA,
  },
  {
    id: '1.3.1',
    name: 'Info and Relationships',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Grid, treegrid, listbox, tree, tab and menu roles with their owned and labelled relationships; form fields are labelled and errors referenced. Checked by the axe crawl (`wcag2a`…`wcag22aa`, both layers).',
  },
  {
    id: '1.3.2',
    name: 'Meaningful Sequence',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'DOM order follows reading order; popups render after their trigger in the accessibility tree.',
  },
  {
    id: '1.3.3',
    name: 'Sensory Characteristics',
    level: 'A',
    conformance: 'Supports',
    remarks: 'Built-in messages name controls, never their shape or position.',
  },
  {
    id: '1.4.1',
    name: 'Use of Color',
    level: 'A',
    conformance: 'Partially Supports',
    remarks:
      'Switch and selection states are not colour alone (`forced-colors.spec.ts`). Chart series are told apart by colour unless you set dash styles or markers; legends and tooltips name every series.',
  },
  {
    id: '1.4.2',
    name: 'Audio Control',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: MEDIA,
  },
  {
    id: '2.1.1',
    name: 'Keyboard',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Every family is operable from the keyboard, including the alternatives to dragging (grid, tree list, pivot, kanban, tile layout). Freehand drawing in the signature pad falls under the path-dependent exception.',
  },
  {
    id: '2.1.2',
    name: 'No Keyboard Trap',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Modal dialogs contain focus by design and close with Escape; every popup returns focus to its trigger.',
  },
  {
    id: '2.1.4',
    name: 'Character Key Shortcuts',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Single-character shortcuts exist only on the focused BPMN canvas (`C`, `A`, `F`, `H`, `L`, `S`), which the criterion allows.',
  },
  {
    id: '2.2.1',
    name: 'Timing Adjustable',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Toast timers are configurable and pause on hover, on focus and while the tab is hidden; hold-to-confirm durations are configurable.',
  },
  {
    id: '2.2.2',
    name: 'Pause, Stop, Hide',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Carousel auto-rotation always shows a rotation control, pauses on hover, stops on keyboard focus and starts stopped under reduced motion.',
  },
  {
    id: '2.3.1',
    name: 'Three Flashes or Below Threshold',
    level: 'A',
    conformance: 'Supports',
    remarks: 'Nothing flashes.',
  },
  {
    id: '2.4.1',
    name: 'Bypass Blocks',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: APP,
  },
  {
    id: '2.4.2',
    name: 'Page Titled',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: APP,
  },
  {
    id: '2.4.3',
    name: 'Focus Order',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Composite widgets use one roving tab stop; popups move focus in and back out in order.',
  },
  {
    id: '2.4.4',
    name: 'Link Purpose (In Context)',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Breadcrumbs, menus and pagination render the link text you supply; pagination links are labelled.',
  },
  {
    id: '2.5.1',
    name: 'Pointer Gestures',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'No multipoint or path-based gesture is required: swipes (carousel, action sheet) have button alternatives.',
  },
  {
    id: '2.5.2',
    name: 'Pointer Cancellation',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Activation happens on release; drags cancel with Escape or on `pointercancel`.',
  },
  {
    id: '2.5.3',
    name: 'Label in Name',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Visible labels are the accessible names. Not checked by a dedicated test.',
  },
  {
    id: '2.5.4',
    name: 'Motion Actuation',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: 'No component responds to device motion.',
  },
  {
    id: '3.1.1',
    name: 'Language of Page',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: APP,
  },
  {
    id: '3.2.1',
    name: 'On Focus',
    level: 'A',
    conformance: 'Supports',
    remarks: 'Focus never commits a value or navigates.',
  },
  {
    id: '3.2.2',
    name: 'On Input',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Choosing a value commits it to the component only; navigation on change is the application’s decision.',
  },
  {
    id: '3.2.6',
    name: 'Consistent Help',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: APP,
  },
  {
    id: '3.3.1',
    name: 'Error Identification',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Invalid cells and fields set `aria-invalid`, reference the message with `aria-errormessage` / `aria-describedby` and announce it (`grid-announcements.spec.ts`).',
  },
  {
    id: '3.3.2',
    name: 'Labels or Instructions',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Editors render a visible or floating label; filter-row editors are labelled by their column.',
  },
  {
    id: '3.3.7',
    name: 'Redundant Entry',
    level: 'A',
    conformance: 'Not Applicable',
    remarks: 'A process-level requirement of the application.',
  },
  {
    id: '4.1.2',
    name: 'Name, Role, Value',
    level: 'A',
    conformance: 'Supports',
    remarks:
      'Checked by axe in every component spec and the nightly crawl, and by explicit ARIA assertions in the keyboard specs.',
  },
  // ── Level AA ──────────────────────────────────────────────────────────────
  {
    id: '1.2.4',
    name: 'Captions (Live)',
    level: 'AA',
    conformance: 'Not Applicable',
    remarks: MEDIA,
  },
  {
    id: '1.2.5',
    name: 'Audio Description (Prerecorded)',
    level: 'AA',
    conformance: 'Not Applicable',
    remarks: MEDIA,
  },
  {
    id: '1.3.4',
    name: 'Orientation',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'No orientation lock; popups can switch to phone presentations (`adaptiveMode`).',
  },
  {
    id: '1.3.5',
    name: 'Identify Input Purpose',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Text boxes forward `autocomplete`; the OTP input sets `autocomplete="one-time-code"`. Setting the right token is yours.',
  },
  {
    id: '1.4.3',
    name: 'Contrast (Minimum)',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Default, dark and high-contrast themes: component text is scanned on every pull request (`contrast.spec.ts`, `themes.spec.ts`, `high-contrast.spec.ts`) and every page nightly. Tailwind and Bootstrap bridge themes take your palette.',
  },
  {
    id: '1.4.4',
    name: 'Resize Text',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Browser zoom to 200 % scales the components. Not covered by an automated test.',
  },
  {
    id: '1.4.5',
    name: 'Images of Text',
    level: 'AA',
    conformance: 'Supports',
    remarks: 'All text, chart labels included, is real text.',
  },
  {
    id: '1.4.10',
    name: 'Reflow',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Editors and layout components fit 320 px; grids, pivot, scheduler and Gantt are two-dimensional content the criterion exempts and scroll inside themselves. Phone-width checks run on the docs pages.',
  },
  {
    id: '1.4.11',
    name: 'Non-text Contrast',
    level: 'AA',
    conformance: 'Partially Supports',
    remarks:
      'The focus ring and selected states are tested to be present, also under forced colours; borders and icons are not measured against 3:1 by any check.',
  },
  {
    id: '1.4.12',
    name: 'Text Spacing',
    level: 'AA',
    conformance: 'Partially Supports',
    remarks:
      'Not tested. Virtualized rows have a fixed height, so increased line height can clip cell text unless `autoRowHeight` is on.',
  },
  {
    id: '1.4.13',
    name: 'Content on Hover or Focus',
    level: 'AA',
    conformance: 'Partially Supports',
    remarks:
      'Tooltips show on hover and focus, hide with Escape and stay while the trigger is hovered or focused; keeping a tooltip open while the pointer moves onto it is not verified.',
  },
  {
    id: '2.4.5',
    name: 'Multiple Ways',
    level: 'AA',
    conformance: 'Not Applicable',
    remarks: APP,
  },
  {
    id: '2.4.6',
    name: 'Headings and Labels',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Column headers, dialog titles and field labels describe their content; the texts come from the message catalogs or from you.',
  },
  {
    id: '2.4.7',
    name: 'Focus Visible',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'One focus ring on `:focus-visible` in every component, kept under forced colours (`forced-colors.spec.ts`).',
  },
  {
    id: '2.4.11',
    name: 'Focus Not Obscured (Minimum)',
    level: 'AA',
    conformance: 'Partially Supports',
    remarks:
      'Composite widgets scroll the focused item into their viewport; sticky app chrome, toasts and the FAB can still cover focus and are not tested for it.',
  },
  {
    id: '2.5.7',
    name: 'Dragging Movements',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Every drag has a keyboard or single-pointer alternative: column resize and move, row moves, pivot fields, kanban cards, tiles, splitters, sliders (`grid-keyboard-drag.spec.ts`, `tree-list-keyboard-drag.spec.ts`, `pivot-keyboard.spec.ts`).',
  },
  {
    id: '2.5.8',
    name: 'Target Size (Minimum)',
    level: 'AA',
    conformance: 'Partially Supports',
    remarks:
      'Small controls get a 24 px hit area (44 px on coarse pointers) through a shared stylesheet mixin; target sizes are not measured across every control.',
  },
  {
    id: '3.1.2',
    name: 'Language of Parts',
    level: 'AA',
    conformance: 'Not Applicable',
    remarks:
      'Component strings come from the catalog you provide, in your page’s language.',
  },
  {
    id: '3.2.3',
    name: 'Consistent Navigation',
    level: 'AA',
    conformance: 'Not Applicable',
    remarks: APP,
  },
  {
    id: '3.2.4',
    name: 'Consistent Identification',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Shared message catalogs give the same function the same name in every family and both layers.',
  },
  {
    id: '3.3.3',
    name: 'Error Suggestion',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Validation messages are shown and announced as written; the built-in rules ship descriptive defaults.',
  },
  {
    id: '3.3.4',
    name: 'Error Prevention (Legal, Financial, Data)',
    level: 'AA',
    conformance: 'Not Applicable',
    remarks:
      'Whether a submission is reversible is the application’s decision; the suite supplies the means (batch editing with cancel, undo / redo, `confirm()` dialogs).',
  },
  {
    id: '3.3.8',
    name: 'Accessible Authentication (Minimum)',
    level: 'AA',
    conformance: 'Not Applicable',
    remarks:
      'No authentication component. The OTP input accepts paste and SMS autofill.',
  },
  {
    id: '4.1.3',
    name: 'Status Messages',
    level: 'AA',
    conformance: 'Supports',
    remarks:
      'Sorting, filtering, paging, selection, moves and errors are announced through shared polite / assertive live regions; toasts are status messages (`grid-announcements.spec.ts`).',
  },
];

/** Count of rows per conformance level, in report order. */
export function summarize(
  rows: readonly CriterionRow[],
): readonly (readonly [ConformanceLevel, number])[] {
  const order: ConformanceLevel[] = [
    'Supports',
    'Partially Supports',
    'Does Not Support',
    'Not Applicable',
  ];
  return order.map(
    (level) =>
      [level, rows.filter((row) => row.conformance === level).length] as const,
  );
}

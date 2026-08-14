import { describe, expect, it } from 'vitest';
import * as behavior from './index';

/**
 * The barrel is the whole contract with the React render layer: it imports
 * `@oge-ui/behavior` and nothing else (ADR 0001), so an entry point that
 * silently stops being exported here breaks a render layer without breaking
 * a single family spec. One list, one guard.
 */
const ENTRY_POINTS = [
  // button
  'OgeButtonPress',
  'resolveOgeButtonsConfig',
  'applyButtonGroupSelection',
  'buttonGroupRole',
  'buttonGroupNavIndex',
  'resolveClickGuard',
  // overlay
  'OgeAnchoredPanelCore',
  'resolvePopupPosition',
  'getTabbableElements',
  'trapTabKey',
  'pushOverlay',
  'isTopOverlay',
  'lockBodyScroll',
  'OGE_DEFAULT_OVERLAY_TIMINGS',
  // menu
  'menuMoveIndex',
  'OgeMenuTypeAhead',
  // inputs
  'OgeInputCommit',
  'OgeSelectListCore',
  'OgeListVirtualizerCore',
  'createNumberFormatter',
  'parseDateText',
  'monthCells',
  'sliderKeyboardTarget',
  'startSliderDrag',
  'graphemeCount',
  'resolveOgeInputsConfig',
  // tabs
  'resolveOgeTabsConfig',
  'canSelectTab',
  // layout
  'resolveOgeAccordionConfig',
  'splitterKeyAction',
  'fitToolbarDescriptors',
  'resolveOgeCardConfig',
  // navigation
  'buildTreeViewModel',
  'planTreeViewKey',
  'fitBreadcrumbDescriptors',
  'resolveDrawerMode',
  'menubarBarKeys',
  'paginationIsCompact',
  'stepperKeyTarget',
] as const;

describe('the @oge-ui/behavior barrel', () => {
  for (const name of ENTRY_POINTS) {
    it(`exports ${name}`, () => {
      expect(behavior).toHaveProperty(name);
      expect(
        (behavior as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    });
  }

  it('re-exports the shared engine tables the two layers must agree on', () => {
    expect(behavior.OGE_DEFAULT_OVERLAY_TIMINGS.menuHideDelayMs).toBe(300);
    expect(behavior.OGE_SELECT_OPTION_HEIGHT).toEqual({
      sm: 28,
      md: 34,
      lg: 40,
    });
    expect(behavior.OGE_DEFAULT_COLOR_PALETTE.length).toBe(50);
  });
});

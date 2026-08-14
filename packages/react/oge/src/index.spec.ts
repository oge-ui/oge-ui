/**
 * Smoke test for the umbrella barrel: ambiguous star re-exports are silently
 * dropped by ESM, so every family's key symbol is asserted to survive.
 *
 * The React families each re-export a handful of the same `@oge-ui/behavior`
 * vocabulary, which is exactly the collision this guards — a symbol exported
 * by two stars disappears without a build error.
 */
import {
  OgeAutocomplete,
  OgeBreadcrumb,
  OgeButton,
  OgeButtonGroup,
  OgeCalendar,
  OgeCard,
  OgeCheckBox,
  OgeColorBox,
  OgeDateBox,
  OgeDateRangeBox,
  OgeDrawer,
  OgeDropDownButton,
  OgeLoadIndicator,
  OgeMenubar,
  OgeMenuList,
  OgeNumberBox,
  OgePagination,
  OgePopup,
  OgeProgressBar,
  OgeRadioGroup,
  OgeRangeSlider,
  OgeSelectBox,
  OgeSkeleton,
  OgeSlider,
  OgeStepper,
  OgeSwitch,
  OgeTabPanel,
  OgeTabs,
  OgeTagBox,
  OgeTextArea,
  OgeTextBox,
  OgeTreeView,
  OgeButtonsConfigProvider,
  OgeInputsConfigProvider,
  OgeTabsConfigProvider,
  OgeCardConfigProvider,
  OgeOverlayConfigProvider,
  OgeTreeViewConfigProvider,
  useAnchoredPanel,
} from './index';

describe('@oge-ui/react umbrella barrel', () => {
  it('re-exports every family without star-export collisions', () => {
    for (const symbol of [
      // buttons
      OgeButton,
      OgeButtonGroup,
      OgeDropDownButton,
      // inputs
      OgeTextBox,
      OgeTextArea,
      OgeNumberBox,
      OgeCheckBox,
      OgeSwitch,
      OgeRadioGroup,
      OgeSelectBox,
      OgeTagBox,
      OgeAutocomplete,
      OgeSlider,
      OgeRangeSlider,
      OgeColorBox,
      OgeCalendar,
      OgeDateBox,
      OgeDateRangeBox,
      // tabs
      OgeTabs,
      OgeTabPanel,
      // layout
      OgeCard,
      OgeProgressBar,
      OgeLoadIndicator,
      OgeSkeleton,
      // navigation
      OgeTreeView,
      OgeDrawer,
      OgeStepper,
      OgeMenubar,
      OgeBreadcrumb,
      OgePagination,
      // overlay
      OgePopup,
      OgeMenuList,
      useAnchoredPanel,
    ]) {
      expect(symbol).toBeDefined();
    }
  });

  it('re-exports every family config provider', () => {
    for (const provider of [
      OgeButtonsConfigProvider,
      OgeInputsConfigProvider,
      OgeTabsConfigProvider,
      OgeCardConfigProvider,
      OgeOverlayConfigProvider,
      OgeTreeViewConfigProvider,
    ]) {
      expect(provider).toBeTypeOf('function');
    }
  });
});

/**
 * Smoke test for the umbrella barrel: ambiguous star re-exports are silently
 * dropped by ESM, so every family's key symbol is asserted to survive.
 */
import {
  OgeAnchoredPanel,
  OgeAutocomplete,
  OgeButton,
  OgeCheckBox,
  OgeColumn,
  OgeDropDownButton,
  OgeGrid,
  OgeNumberBox,
  OgeRadioGroup,
  OgeSelectBox,
  OgeSwitch,
  OgeTextBox,
  OgeTreeList,
  provideOgeGridConfig,
  provideOgeInputsConfig,
} from './index';

describe('oge-ui umbrella barrel', () => {
  it('re-exports every family without star-export collisions', () => {
    // @oge-ui/pivot is deliberately absent — the commercial package is not
    // part of the MIT umbrella.
    for (const symbol of [
      OgeGrid,
      OgeColumn,
      OgeTreeList,
      OgeButton,
      OgeDropDownButton,
      OgeTextBox,
      OgeNumberBox,
      OgeSelectBox,
      OgeAutocomplete,
      OgeCheckBox,
      OgeSwitch,
      OgeRadioGroup,
      OgeAnchoredPanel,
      provideOgeGridConfig,
      provideOgeInputsConfig,
    ]) {
      expect(symbol).toBeDefined();
    }
  });
});

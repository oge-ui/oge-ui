/**
 * Smoke test for the umbrella barrel: ambiguous star re-exports are silently
 * dropped by ESM, so every family's key symbol is asserted to survive.
 */
import {
  OgeAnchoredPanel,
  OgeButton,
  OgeColumn,
  OgeDropDownButton,
  OgeGrid,
  OgeNumberBox,
  OgePivotGrid,
  OgeSelectBox,
  OgeTextBox,
  OgeTreeList,
  provideOgeGridConfig,
  provideOgeInputsConfig,
} from './index';

describe('oge-ui umbrella barrel', () => {
  it('re-exports every family without star-export collisions', () => {
    for (const symbol of [
      OgeGrid,
      OgeColumn,
      OgeTreeList,
      OgePivotGrid,
      OgeButton,
      OgeDropDownButton,
      OgeTextBox,
      OgeNumberBox,
      OgeSelectBox,
      OgeAnchoredPanel,
      provideOgeGridConfig,
      provideOgeInputsConfig,
    ]) {
      expect(symbol).toBeDefined();
    }
  });
});

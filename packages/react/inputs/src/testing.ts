// @oge-ui/react-inputs/testing — React Testing Library helpers for the input
// editors, the counterpart of Angular's `@oge-ui/inputs/testing` harnesses.
// Test-only: the main entry never imports this one, and
// `@testing-library/dom` is an optional peer that only this entry needs.
export {
  getTextBox,
  getAllTextBoxes,
  getNumberBox,
  getAllNumberBoxes,
  getSelectBox,
  getAllSelectBoxes,
  getDateBox,
  getAllDateBoxes,
  selectOption,
  type OgeInputQueries,
  type OgeInputQueryFilters,
  type OgeNumberBoxQueries,
  type OgeSelectBoxQueries,
  type OgeSelectOptionFilter,
  type OgeDateBoxQueries,
} from './lib/testing/input-queries';

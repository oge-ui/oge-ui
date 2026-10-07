// @oge-ui/react-tabs/testing — React Testing Library helpers for the tabs,
// the counterpart of Angular's `@oge-ui/tabs/testing` harness. Test-only:
// the main entry never imports this one, and `@testing-library/dom` is an
// optional peer that only this entry needs.
export {
  getTabs,
  getAllTabs,
  selectTab,
  type OgeTabQuery,
  type OgeTabsQueries,
  type OgeTabsQueryFilters,
} from './lib/testing/tabs-queries';

// @oge-ui/react-overlay/testing — React Testing Library helpers for the
// overlay family, the counterpart of Angular's `@oge-ui/overlay/testing`
// harnesses. Test-only: the main entry never imports this one, and
// `@testing-library/dom` is an optional peer that only this entry needs.
export {
  getModal,
  getAllModals,
  type OgeModalQueries,
  type OgeModalQueryFilters,
} from './lib/testing/modal-queries';

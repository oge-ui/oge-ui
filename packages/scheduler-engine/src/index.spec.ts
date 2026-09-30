import * as engine from './index';

/**
 * The barrel is both render layers' whole import surface (ADR 0003): an
 * export that quietly disappears breaks `@oge-ui/scheduler` or
 * `@oge-ui/react-scheduler` without failing one engine spec.
 */
describe('@oge-ui/scheduler-engine barrel', () => {
  it.each([
    'OgeSchedulerCore',
    'OGE_DEFAULT_SCHEDULER_CONFIG',
    'OGE_DEFAULT_SCHEDULER_MESSAGES',
    'resolveOgeSchedulerConfig',
    'beginPointerGesture',
    'buildTimeGrid',
    'buildMonthGrid',
    'layoutDayColumn',
    'packLanes',
    'parseRecurrenceRule',
    'serializeRecurrenceRule',
    'expandRecurrence',
    'buildSchedulerEditorItems',
    'layoutDayWeekSegments',
    'buildMonthWeekLayouts',
    'buildTimelineRows',
    'buildAgendaDays',
    'buildYearMonths',
    'timeGridCellKey',
    'chipKey',
    'timeGridChipCtrlKey',
    'timelineBarCtrlKey',
    'visibleSchedulerAppointments',
  ])('exports %s', (name) => {
    expect((engine as Record<string, unknown>)[name]).toBeDefined();
  });
});

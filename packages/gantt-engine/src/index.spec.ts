import * as engine from './index';

// The barrel IS both render layers' import surface: an export that quietly
// disappears breaks the Angular or the React Gantt without failing a single
// engine spec (ARCHITECTURE, "behavior carries its own specs").
describe('@oge-ui/gantt-engine barrel', () => {
  it('exports the controller, the config and the kernel', () => {
    for (const name of [
      'OgeGanttCore',
      'beginGanttGesture',
      'buildGanttDialogItems',
      'resolveGanttConfig',
      'OGE_DEFAULT_GANTT_CONFIG',
      'OGE_DEFAULT_GANTT_MESSAGES',
      'buildGanttTasks',
      'buildGanttDependencies',
      'buildGanttScale',
      'autoScheduleForward',
      'criticalPathKeys',
      'routeDependency',
      'proposeTaskMove',
      'buildResourceWorkload',
      'isWorkingDay',
      'widenGanttRange',
      'ganttWindowRange',
      'fitGanttScaleType',
    ]) {
      expect(engine[name as keyof typeof engine], name).toBeDefined();
    }
  });
});

import {
  OGE_DEFAULT_SCHEDULER_CONFIG,
  OGE_DEFAULT_SCHEDULER_MESSAGES,
  resolveOgeSchedulerConfig,
} from './config';

describe('resolveOgeSchedulerConfig', () => {
  it('fills every key from the defaults', () => {
    expect(resolveOgeSchedulerConfig(undefined)).toEqual(
      OGE_DEFAULT_SCHEDULER_CONFIG,
    );
  });

  it('merges messages one block deep (a partial block replaces it whole)', () => {
    const resolved = resolveOgeSchedulerConfig({
      locale: 'de',
      messages: {
        popup: { edit: 'Bearbeiten', deleteAppointment: 'Löschen', close: 'X' },
      },
    });
    expect(resolved.locale).toBe('de');
    expect(resolved.messages.popup.edit).toBe('Bearbeiten');
    expect(resolved.messages.toolbar).toBe(
      OGE_DEFAULT_SCHEDULER_MESSAGES.toolbar,
    );
    expect(resolved.minAppointmentMinutes).toBe(15);
  });

  it('merges over an enclosing resolved config (nested providers)', () => {
    const outer = resolveOgeSchedulerConfig({ locale: 'fr' });
    const inner = resolveOgeSchedulerConfig(
      { minAppointmentMinutes: 30 },
      outer,
    );
    expect(inner.locale).toBe('fr');
    expect(inner.minAppointmentMinutes).toBe(30);
  });
});

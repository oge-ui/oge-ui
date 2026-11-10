import {
  OGE_DEV_WARNINGS,
  OGE_DEV_WARNINGS_URL,
  ogeDevWarn,
  ogeIsDevMode,
} from './dev-warnings';

describe('ogeDevWarn', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('prints the code, the detail and the link to its entry', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    ogeDevWarn('OGE3101', 'oge-select-box: virtualScroll ignores groupBy.');
    expect(warn).toHaveBeenCalledWith(
      `[OGE3101] oge-select-box: virtualScroll ignores groupBy. — ${OGE_DEV_WARNINGS_URL}#oge3101`,
    );
  });

  it('uses console.error on request', () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    ogeDevWarn('OGE3001', 'both', { level: 'error' });
    expect(String(error.mock.calls[0][0])).toMatch(/^\[OGE3001\] both/);
  });

  it('prints a once-keyed warning a single time per key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    ogeDevWarn('OGE1002', 'a', { once: 'spec-key-a' });
    ogeDevWarn('OGE1002', 'a', { once: 'spec-key-a' });
    ogeDevWarn('OGE1002', 'b', { once: 'spec-key-b' });
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('follows ngDevMode when the app defines it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('ngDevMode', false);
    expect(ogeIsDevMode()).toBe(false);
    ogeDevWarn('OGE3302', 'silent');
    expect(warn).not.toHaveBeenCalled();
    vi.stubGlobal('ngDevMode', {});
    expect(ogeIsDevMode()).toBe(true);
  });

  it('otherwise warns only for NODE_ENV development or test', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(ogeIsDevMode()).toBe(false);
    vi.stubEnv('NODE_ENV', 'development');
    expect(ogeIsDevMode()).toBe(true);
    vi.stubEnv('NODE_ENV', 'test');
    expect(ogeIsDevMode()).toBe(true);
  });

  it('documents every code with a title, cause, fix and package list', () => {
    for (const [code, info] of Object.entries(OGE_DEV_WARNINGS)) {
      expect(code).toMatch(/^OGE\d{4}$/);
      expect(info.title.length).toBeGreaterThan(0);
      expect(info.cause.length).toBeGreaterThan(0);
      expect(info.fix.length).toBeGreaterThan(0);
      expect(info.packages.length).toBeGreaterThan(0);
    }
  });
});

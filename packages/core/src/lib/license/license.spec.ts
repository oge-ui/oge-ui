// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  OGE_LICENSE_WATERMARK_CLASS,
  ogeCheckLicense,
  ogeGetLicenseInfo,
  ogeIsLicenseExemptHost,
  ogeLicenseStatus,
  ogeSetLicenseKey,
  resetOgeLicenseForTests,
} from './license';
import {
  ogeDecodeLicenseKey,
  ogeLicenseCoversFamily,
  ogeLicenseCoversRelease,
  type OgeLicenseInfo,
} from './license-key';
import { OGE_RELEASE_DATE } from './release-info';

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

let pair: CryptoKeyPair;
let publicKey: string;

async function issue(overrides: Partial<OgeLicenseInfo> = {}): Promise<string> {
  const info: OgeLicenseInfo = {
    id: 'test-1',
    licensee: 'Acme',
    seats: 2,
    families: ['all'],
    issued: '2026-01-01',
    expires: '2099-12-31',
    ...overrides,
  };
  const signed = `OGE1.${b64url(new TextEncoder().encode(JSON.stringify(info)))}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'Ed25519' },
      pair.privateKey,
      new TextEncoder().encode(signed),
    ),
  );
  return `${signed}.${b64url(signature)}`;
}

/** Pretends to be a production page (jsdom is otherwise exempt). */
function production(): void {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Chrome');
  vi.stubGlobal('location', {
    hostname: 'app.example.com',
    protocol: 'https:',
  });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const watermark = () =>
  document.querySelector(`.${OGE_LICENSE_WATERMARK_CLASS}`);

beforeAll(async () => {
  pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  publicKey = b64url(
    new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)),
  );
});

afterEach(() => {
  resetOgeLicenseForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('license keys', () => {
  it('decodes a well-formed key and rejects anything else', async () => {
    const key = await issue();
    expect(ogeDecodeLicenseKey(key)?.info.licensee).toBe('Acme');
    // pasted with line breaks
    expect(ogeDecodeLicenseKey(key.replace(/(.{40})/g, '$1\n'))).not.toBeNull();
    expect(ogeDecodeLicenseKey('')).toBeNull();
    expect(ogeDecodeLicenseKey('OGE1.abc.def')).toBeNull();
    expect(ogeDecodeLicenseKey(key.replace('OGE1', 'OGE2'))).toBeNull();
  });

  it('covers families and releases inside the update window', () => {
    const info = ogeDecodeLicenseKey('x')?.info;
    expect(info).toBeUndefined();
    const base = {
      id: 'a',
      licensee: 'b',
      seats: 1,
      issued: '2026-01-01',
      expires: '2026-06-30',
    };
    expect(
      ogeLicenseCoversFamily({ ...base, families: ['all'] }, 'gantt'),
    ).toBe(true);
    expect(
      ogeLicenseCoversFamily({ ...base, families: ['pivot'] }, 'gantt'),
    ).toBe(false);
    expect(
      ogeLicenseCoversRelease({ ...base, families: ['all'] }, '2026-06-30'),
    ).toBe(true);
    expect(
      ogeLicenseCoversRelease({ ...base, families: ['all'] }, '2026-07-01'),
    ).toBe(false);
  });
});

describe('license status', () => {
  it('is "development" without a key on an exempt host', async () => {
    resetOgeLicenseForTests(publicKey);
    expect(await ogeLicenseStatus('gantt')).toBe('development');
  });

  it('is "missing" without a key in production', async () => {
    resetOgeLicenseForTests(publicKey);
    production();
    expect(await ogeLicenseStatus('gantt')).toBe('missing');
  });

  it('accepts a signed key and exposes its payload', async () => {
    resetOgeLicenseForTests(publicKey);
    ogeSetLicenseKey(await issue());
    expect(await ogeLicenseStatus('charts')).toBe('licensed');
    expect((await ogeGetLicenseInfo())?.seats).toBe(2);
  });

  it('rejects a tampered or foreign key', async () => {
    resetOgeLicenseForTests(publicKey);
    const key = await issue();
    const [prefix, , signature] = key.split('.');
    const forged = b64url(
      new TextEncoder().encode(
        JSON.stringify({
          id: 'x',
          licensee: 'Mallory',
          seats: 999,
          families: ['all'],
          issued: '2026-01-01',
          expires: '2099-12-31',
        }),
      ),
    );
    ogeSetLicenseKey(`${prefix}.${forged}.${signature}`);
    expect(await ogeLicenseStatus('pivot')).toBe('invalid');
    expect(await ogeGetLicenseInfo()).toBeNull();
    // signed by someone else: the shipped public key does not verify it
    resetOgeLicenseForTests();
    ogeSetLicenseKey(key);
    expect(await ogeLicenseStatus('pivot')).toBe('invalid');
  });

  it('reports expired and not-covered keys', async () => {
    resetOgeLicenseForTests(publicKey);
    ogeSetLicenseKey(await issue({ expires: '2020-01-01' }));
    expect(OGE_RELEASE_DATE > '2020-01-01').toBe(true);
    expect(await ogeLicenseStatus('kanban')).toBe('expired');
    ogeSetLicenseKey(await issue({ families: ['pivot'] }));
    expect(await ogeLicenseStatus('kanban')).toBe('not-covered');
  });
});

describe('ogeCheckLicense', () => {
  it('pins one notice and warns once in production without a key', async () => {
    resetOgeLicenseForTests(publicKey);
    production();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    ogeCheckLicense('gantt');
    ogeCheckLicense('gantt');
    ogeCheckLicense('charts');
    await flush();
    await flush();
    expect(
      document.querySelectorAll(`.${OGE_LICENSE_WATERMARK_CLASS}`),
    ).toHaveLength(1);
    expect(watermark()?.getAttribute('href')).toBe(
      'https://www.ogeui.com/license',
    );
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('removes the notice once a valid key is set', async () => {
    resetOgeLicenseForTests(publicKey);
    production();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    ogeCheckLicense('scheduler');
    await flush();
    await flush();
    expect(watermark()).not.toBeNull();
    ogeSetLicenseKey(await issue());
    await flush();
    await flush();
    expect(watermark()).toBeNull();
  });

  it('shows nothing on development hosts', async () => {
    resetOgeLicenseForTests(publicKey);
    ogeCheckLicense('bpmn');
    await flush();
    expect(watermark()).toBeNull();
  });
});

describe('exempt hosts', () => {
  it('knows local, sandbox and docs hosts from production ones', () => {
    production();
    const host = (hostname: string, protocol = 'https:') =>
      ogeIsLicenseExemptHost({ hostname, protocol });
    for (const h of [
      'localhost',
      '127.0.0.1',
      'app.localhost',
      'box.local',
      'x.test',
      'abc.webcontainer.io',
      'www.ogeui.com',
      'ogeui.com',
    ]) {
      expect(host(h)).toBe(true);
    }
    expect(host('anything', 'file:')).toBe(true);
    for (const h of [
      'app.example.com',
      'notogeui.com',
      '10.0.0.5',
      'intranet.corp',
    ]) {
      expect(host(h)).toBe(false);
    }
  });
});

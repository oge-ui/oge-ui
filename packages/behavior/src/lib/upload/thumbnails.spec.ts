import { ObjectUrlRegistry, isPreviewable } from './thumbnails';

/**
 * jsdom implements neither `URL.createObjectURL` nor `revokeObjectURL`, so the
 * save/restore stub from `grid-events-parity.spec.ts` is the pattern here —
 * not `vi.stubGlobal('URL', …)`, which would replace the whole `URL` global
 * and break `new URL(...)` for everything else in the file.
 */
function stubObjectUrls() {
  const created: string[] = [];
  const revoked: string[] = [];
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let next = 0;

  URL.createObjectURL = () => {
    const url = `blob:test/${(next += 1)}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url);
  };

  return {
    created,
    revoked,
    restore: () => {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    },
  };
}

const image = (name = 'a.png') => new File(['x'], name, { type: 'image/png' });
const document_ = () => new File(['x'], 'a.pdf', { type: 'application/pdf' });

describe('isPreviewable', () => {
  it('accepts the raster and vector types a browser can render', () => {
    for (const type of [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/svg+xml',
    ]) {
      expect(isPreviewable(type)).toBe(true);
    }
  });

  it('rejects everything else', () => {
    expect(isPreviewable('application/pdf')).toBe(false);
    expect(isPreviewable('video/mp4')).toBe(false);
    expect(isPreviewable('')).toBe(false);
  });
});

describe('ObjectUrlRegistry', () => {
  let urls: ReturnType<typeof stubObjectUrls>;

  beforeEach(() => {
    urls = stubObjectUrls();
  });

  afterEach(() => {
    urls.restore();
  });

  it('mints one URL per image', () => {
    const registry = new ObjectUrlRegistry();
    expect(registry.create('a', image())).toBe('blob:test/1');
    expect(registry.size).toBe(1);
  });

  it('returns the same URL for a repeated uid instead of leaking a second', () => {
    const registry = new ObjectUrlRegistry();
    const first = registry.create('a', image());
    const second = registry.create('a', image());
    expect(second).toBe(first);
    expect(urls.created).toHaveLength(1);
  });

  it('mints nothing for a type with no preview', () => {
    const registry = new ObjectUrlRegistry();
    expect(registry.create('a', document_())).toBeNull();
    expect(registry.size).toBe(0);
  });

  it('revokes exactly what it created', () => {
    const registry = new ObjectUrlRegistry();
    registry.create('a', image());
    registry.create('b', image('b.png'));
    registry.revokeAll();

    // The leak regression: every minted URL is handed back, none twice.
    expect(urls.revoked).toEqual(urls.created);
    expect(registry.size).toBe(0);
  });

  it('revoking one uid leaves the others alone', () => {
    const registry = new ObjectUrlRegistry();
    const a = registry.create('a', image());
    registry.create('b', image('b.png'));
    registry.revoke('a');

    expect(urls.revoked).toEqual([a]);
    expect(registry.size).toBe(1);
  });

  it('ignores a revoke for a uid that never had a URL', () => {
    const registry = new ObjectUrlRegistry();
    registry.revoke('missing');
    expect(urls.revoked).toEqual([]);
  });

  it('does not revoke the same URL twice', () => {
    const registry = new ObjectUrlRegistry();
    registry.create('a', image());
    registry.revoke('a');
    registry.revoke('a');
    registry.revokeAll();
    expect(urls.revoked).toHaveLength(1);
  });

  it('degrades to no preview when the API is absent', () => {
    urls.restore();
    const originalCreate = URL.createObjectURL;
    // @ts-expect-error — deliberately removing the API.
    delete URL.createObjectURL;

    const registry = new ObjectUrlRegistry();
    expect(registry.create('a', image())).toBeNull();

    URL.createObjectURL = originalCreate;
  });

  it('degrades to no preview when the API throws', () => {
    // Not hypothetical: this environment *has* `URL.createObjectURL`, and it
    // rejects a jsdom `File` with "must be an instance of Blob" — but only
    // sometimes, so the throw is stubbed here rather than provoked, which
    // would make the spec depend on the runtime's mood.
    URL.createObjectURL = () => {
      throw new TypeError('must be an instance of Blob');
    };

    const registry = new ObjectUrlRegistry();
    expect(registry.create('a', image())).toBeNull();
    expect(registry.size).toBe(0);
  });

  it('survives a revoke that throws', () => {
    const registry = new ObjectUrlRegistry();
    registry.create('a', image());
    URL.revokeObjectURL = () => {
      throw new Error('nope');
    };

    expect(() => registry.revokeAll()).not.toThrow();
    expect(registry.size).toBe(0);
  });
});

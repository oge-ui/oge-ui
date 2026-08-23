/**
 * Object-URL bookkeeping for image previews.
 *
 * These are the first long-lived object URLs in the suite — everywhere else
 * (grid/pivot/tree-list export) a URL is created and revoked inside one
 * function. A preview outlives its creating call by definition, so the
 * lifetime needs an owner: this registry is it, and the component ties it to
 * `DestroyRef`.
 *
 * Framework-free by contract — see the `src/lib/engine` lint block.
 */

/** Types that get a real preview; anything else falls back to a file glyph. */
const PREVIEWABLE =
  /^image\/(png|jpeg|jpg|gif|webp|avif|bmp|x-icon|svg\+xml)$/i;

/** `true` when the browser can render this file straight into an `<img>`. */
export function isPreviewable(type: string): boolean {
  return PREVIEWABLE.test(type);
}

/**
 * Mints object URLs and guarantees each one is revoked exactly once.
 *
 * Never call {@link create} from a `computed()` or a template expression: each
 * evaluation would mint a fresh URL and orphan the previous one. Mint once,
 * when the file joins the list.
 */
export class ObjectUrlRegistry {
  private readonly urls = new Map<string, string>();

  /**
   * Returns a preview URL for `file`, or `null` when the type has no preview.
   *
   * Calling twice with the same `uid` returns the first URL rather than
   * leaking a second one.
   */
  create(uid: string, file: File): string | null {
    const existing = this.urls.get(uid);
    if (existing !== undefined) {
      return existing;
    }
    if (!isPreviewable(file.type)) {
      return null;
    }
    // A preview is a nicety, so nothing here may take the uploader down with
    // it. Two failure modes are real: the API can be missing outright, and
    // under jsdom it exists but throws on a jsdom `File` ("must be an instance
    // of Blob"), which would otherwise fail every spec that renders a row.
    if (typeof URL.createObjectURL !== 'function') {
      return null;
    }
    let url: string;
    try {
      url = URL.createObjectURL(file);
    } catch {
      return null;
    }
    this.urls.set(uid, url);
    return url;
  }

  /** Revokes one file's URL. Safe to call for a uid that never had one. */
  revoke(uid: string): void {
    const url = this.urls.get(uid);
    if (url === undefined) {
      return;
    }
    this.urls.delete(uid);
    try {
      URL.revokeObjectURL?.(url);
    } catch {
      // Nothing to do: the URL is already off the books either way.
    }
  }

  /** Revokes everything. The remove-all, clear and destroy paths all land here. */
  revokeAll(): void {
    for (const uid of Array.from(this.urls.keys())) {
      this.revoke(uid);
    }
  }

  /** How many URLs are outstanding — the hook the leak regression test reads. */
  get size(): number {
    return this.urls.size;
  }
}

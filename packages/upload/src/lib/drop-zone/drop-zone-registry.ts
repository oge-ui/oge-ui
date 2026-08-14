import { Injectable, signal } from '@angular/core';
import type { OgeFileUploader } from '../file-uploader/file-uploader';

/**
 * How `[ogeUploadDropZone]` and `[ogeUploadTrigger]` find their uploader.
 *
 * A registry rather than a template reference because the whole point of an
 * external zone is that it lives somewhere else in the DOM — often in a
 * different component entirely, where no template variable can reach.
 *
 * Internal: not exported from the package barrel.
 */
@Injectable({ providedIn: 'root' })
export class OgeUploadDropZoneRegistry {
  /**
   * A signal, not a bare `Map`: registration order is not guaranteed — a zone
   * declared above its uploader initializes first and would otherwise capture
   * `null` for good, and a trigger's disabled state would never update.
   */
  private readonly uploaders = signal<ReadonlyMap<string, OgeFileUploader>>(
    new Map(),
  );

  register(zone: string, uploader: OgeFileUploader): void {
    this.uploaders.update((current) => {
      const next = new Map(current);
      next.set(zone, uploader);
      return next;
    });
  }

  unregister(zone: string, uploader: OgeFileUploader): void {
    this.uploaders.update((current) => {
      // Guarded so a destroyed uploader cannot unregister its replacement,
      // which is the order Angular uses when a route swaps one for another.
      if (current.get(zone) !== uploader) {
        return current;
      }
      const next = new Map(current);
      next.delete(zone);
      return next;
    });
  }

  get(zone: string): OgeFileUploader | null {
    return this.uploaders().get(zone) ?? null;
  }
}

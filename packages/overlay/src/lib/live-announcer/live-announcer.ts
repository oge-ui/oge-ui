import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import {
  getOgeLiveAnnouncer,
  type OgeLiveAnnounceOptions,
  type OgeLivePoliteness,
} from '@oge-ui/behavior';

/**
 * Speaks a message to screen readers through the document's shared live
 * regions — one polite and one assertive, owned by `@oge-ui/behavior`'s
 * `OgeLiveAnnouncerCore`, so components never render their own. Identical
 * messages inside a second are dropped, a newer message inside the write
 * delay supersedes the pending one, and each message is cleared after a few
 * seconds so the same text is announced again next time. A no-op on the
 * server.
 *
 * ```ts
 * private readonly announcer = inject(OgeLiveAnnouncer);
 * save(): void {
 *   this.announcer.announce('Changes saved');
 *   this.announcer.announce('Upload failed', 'assertive');
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class OgeLiveAnnouncer {
  private readonly core = isPlatformBrowser(inject(PLATFORM_ID))
    ? getOgeLiveAnnouncer(inject(DOCUMENT))
    : getOgeLiveAnnouncer(null);

  /** Announces `message` politely (default) or assertively. */
  announce(
    message: string,
    options?: OgeLiveAnnounceOptions | OgeLivePoliteness,
  ): void {
    this.core.announce(message, options);
  }

  /** Empties one region (or both) and drops anything still pending. */
  clear(politeness?: OgeLivePoliteness): void {
    this.core.clear(politeness);
  }
}

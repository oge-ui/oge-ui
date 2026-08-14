import { Directive, computed, inject, input } from '@angular/core';
import { OgeUploadDropZoneRegistry } from './drop-zone-registry';

/**
 * Opens an uploader's file dialog from a button somewhere else on the page.
 *
 * dx's `dialogTrigger`. Put it on a real `<button>`: the directive listens for
 * `click` only, and relies on the host element supplying the keyboard
 * behaviour — which a `<button>` does and a `<div>` does not.
 *
 * ```html
 * <button type="button" [ogeUploadTrigger]="'attachments'">Attach files</button>
 * <oge-file-uploader dropZone="attachments" />
 * ```
 */
@Directive({
  selector: '[ogeUploadTrigger]',
  host: {
    '[attr.disabled]': 'unavailable() ? "" : null',
    '(click)': 'open()',
  },
})
export class OgeUploadTrigger {
  private readonly registry = inject(OgeUploadDropZoneRegistry);

  /** The `dropZone` name of the uploader to open. */
  readonly ogeUploadTrigger = input.required<string>();
  readonly disabled = input(false);

  private readonly uploader = computed(() =>
    this.registry.get(this.ogeUploadTrigger()),
  );

  /** `true` when there is no uploader registered under that name yet. */
  protected readonly unavailable = computed(
    () => this.disabled() || this.uploader() === null,
  );

  protected open(): void {
    if (!this.unavailable()) {
      this.uploader()?.openFileDialog();
    }
  }
}

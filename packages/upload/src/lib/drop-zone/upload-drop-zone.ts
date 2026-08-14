import {
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  DragDepthCounter,
  dataTransferHasFiles,
  dropEffectFor,
  readDataTransferFiles,
} from '../engine/upload-dnd';
import { OgeUploadDropZoneRegistry } from './drop-zone-registry';

/**
 * Turns any element into a drop target for an uploader elsewhere on the page.
 *
 * dx calls it `dropZone`, Kendo `zoneId`, Syncfusion `dropArea`; all three
 * exist because the drop surface is often the whole page or a panel that has
 * nothing to do with the uploader's own markup. That is a *different element*,
 * which no `uploadMode` value can express — hence a directive rather than an
 * option.
 *
 * ```html
 * <div [ogeUploadDropZone]="'attachments'">Drop anywhere in this panel</div>
 * <oge-file-uploader dropZone="attachments" />
 * ```
 */
@Directive({
  selector: '[ogeUploadDropZone]',
  host: {
    class: 'oge-upload-external-zone',
    '[class.oge-upload-external-zone-over]': 'over()',
    '(dragenter)': 'onDragEnter($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave()',
    '(drop)': 'onDrop($event)',
  },
})
export class OgeUploadDropZone {
  private readonly registry = inject(OgeUploadDropZoneRegistry);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly depth = new DragDepthCounter();

  /** The `dropZone` name of the uploader that should receive the files. */
  readonly ogeUploadDropZone = input.required<string>();
  readonly disabled = input(false);

  /** `true` while files hover this element — bind it to your own styling. */
  readonly over = signal(false);

  private readonly uploader = computed(() =>
    this.registry.get(this.ogeUploadDropZone()),
  );

  protected onDragEnter(event: DragEvent): void {
    if (!this.accepts(event)) {
      return;
    }
    event.preventDefault();
    if (this.depth.enter()) {
      this.over.set(true);
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.accepts(event)) {
      return;
    }
    // Without this the browser never fires `drop` on the element at all.
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dropEffectFor('copy');
    }
  }

  protected onDragLeave(): void {
    if (this.depth.leave()) {
      this.over.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    if (!this.accepts(event)) {
      return;
    }
    event.preventDefault();
    this.depth.reset();
    this.over.set(false);

    const target = this.uploader();
    if (!target) {
      return;
    }
    void readDataTransferFiles(event.dataTransfer, {
      directory: target.directory(),
    }).then((files) => {
      if (files.length > 0) {
        target.addFiles(files);
      }
    });
  }

  private accepts(event: DragEvent): boolean {
    return (
      !this.disabled() &&
      this.uploader() !== null &&
      dataTransferHasFiles(event.dataTransfer)
    );
  }

  /** The element this zone covers, for consumers that need to measure it. */
  get element(): HTMLElement {
    return this.host.nativeElement;
  }
}

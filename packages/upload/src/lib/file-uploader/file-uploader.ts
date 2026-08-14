import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  NgControl,
  type ControlValueAccessor,
  type ValidationErrors,
} from '@angular/forms';
import { edgeEnabledIndex, stepEnabledIndex } from '@oge-ui/core';
import { OgeProgressBar } from '@oge-ui/layout';
import { OgeModal } from '@oge-ui/overlay';
import { OGE_UPLOAD_CONFIG, type OgeUploadMessages } from '../config';
import { formatFileSize } from '../engine/file-size';
import type { OgeUploadAdapter } from '../engine/transport-types';
import {
  UploadQueue,
  type OgeUploadQueueEvent,
  type OgeUploadTask,
} from '../engine/upload-queue';
import { OgeUploadDropZoneRegistry } from '../drop-zone/drop-zone-registry';
import { OGE_UPLOAD_TRANSPORT } from '../transport';
import {
  validateSelection,
  type OgeUploadRestrictions,
} from '../engine/file-validation';
import { ObjectUrlRegistry } from '../engine/thumbnails';
import {
  DragDepthCounter,
  dataTransferHasFiles,
  dropEffectFor,
  readClipboardFiles,
  readDataTransferFiles,
} from '../engine/upload-dnd';
import {
  OgeUploadDropZoneTemplate,
  OgeUploadEmptyTemplate,
  OgeUploadFileTemplate,
  OgeUploadHeaderTemplate,
  OgeUploadIconTemplate,
  OgeUploadToolbarTemplate,
} from '../templates/upload-templates';
import type {
  OgeUploadAbortReason,
  OgeUploadAbortedEvent,
  OgeUploadActionsLayout,
  OgeUploadAllUploadedEvent,
  OgeUploadChunkFailedEvent,
  OgeUploadChunkOptions,
  OgeUploadChunkUploadedEvent,
  OgeUploadChunkUploadingEvent,
  OgeUploadClearedEvent,
  OgeUploadClearingEvent,
  OgeUploadDisplayMode,
  OgeUploadDropEffect,
  OgeUploadDropZoneEvent,
  OgeUploadErrorKind,
  OgeUploadFieldError,
  OgeUploadFile,
  OgeUploadFileDownloadingEvent,
  OgeUploadFileError,
  OgeUploadFileListOptions,
  OgeUploadFileRejectedEvent,
  OgeUploadFileRemovedEvent,
  OgeUploadFileRemovingEvent,
  OgeUploadFilesDroppedEvent,
  OgeUploadFilesSelectedEvent,
  OgeUploadFilesSelectingEvent,
  OgeUploadFailedEvent,
  OgeUploadListType,
  OgeUploadMode,
  OgeUploadPausedEvent,
  OgeUploadPausingEvent,
  OgeUploadPreviewHiddenEvent,
  OgeUploadPreviewShowingEvent,
  OgeUploadPreloadedFile,
  OgeUploadProgressEvent,
  OgeUploadResumedEvent,
  OgeUploadResumingEvent,
  OgeUploadRetryOptions,
  OgeUploadSelectionSource,
  OgeUploadStartedEvent,
  OgeUploadThumbnailFailedEvent,
  OgeUploadUploadedEvent,
  OgeUploadUploadingEvent,
} from '../upload-types';

/** Expands `{token}` placeholders in a message. */
function format(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key)
      ? (tokens[key] ?? match)
      : match,
  );
}

let uidCounter = 0;

/**
 * File uploader: a drop zone, a real file input, a list of what was chosen,
 * and the transfers that follow.
 *
 * Transport is optional. With no `uploadUrl` the component is a file picker
 * with restrictions and previews, and everything the user chose lands in
 * `value` as plain `File` objects — enough for an app that already owns its
 * own uploading. With one, transfers run through a pluggable adapter: XHR by
 * default (the only API that reports request-body progress), chunked and
 * resumable on request, with concurrency, batching, abort and retry.
 *
 * Angular forms are supported three ways at once, the house arrangement:
 * standalone `[(value)]`, reactive forms through `ControlValueAccessor`, and
 * Signal Forms through the `FormValueControl` member names. The restrictions
 * are attached to the bound control as a plain `ValidatorFn`, so a form goes
 * invalid without restating `maxFileSize` — and without the DI cycle an
 * `NG_VALIDATORS` provider would create next to a `self`-injected `NgControl`.
 */
@Component({
  selector: 'oge-file-uploader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeModal, OgeProgressBar],
  host: {
    class: 'oge-upload',
    role: 'group',
    '[class.oge-upload-disabled]': 'effectiveDisabled()',
    '[class.oge-upload-readonly]': 'readonly()',
    '[class.oge-upload-invalid]': 'effectiveInvalid()',
    '[class.oge-upload-dragging]': 'dragOver()',
    '[class.oge-upload-list-picture]': "listType() === 'picture'",
    '[class.oge-upload-list-card]': "listType() === 'pictureCard'",
    '[attr.aria-label]': 'msg().uploaderLabel',
    '[attr.aria-describedby]': 'hintId()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? true : null',
    '(paste)': 'onPaste($event)',
  },
  template: `
    <input
      #native
      type="file"
      class="oge-upload-input"
      tabindex="-1"
      [attr.id]="inputId()"
      [attr.name]="fieldName()"
      [attr.aria-label]="selectLabel()"
      [attr.accept]="accept() || null"
      [attr.multiple]="multiple() ? '' : null"
      [attr.webkitdirectory]="directory() ? '' : null"
      [attr.capture]="captureAttr()"
      [attr.disabled]="effectiveDisabled() || readonly() ? '' : null"
      (change)="onNativeChange($event)"
    />

    @if (displayMode() === 'button' || !openFileDialogOnClick()) {
      <button
        type="button"
        class="oge-upload-select"
        [disabled]="effectiveDisabled() || readonly()"
        [attr.tabindex]="tabIndex()"
        (click)="openFileDialog()"
      >
        <ng-container
          *ngTemplateOutlet="
            iconTpl()?.templateRef ?? defaultSelectIcon;
            context: iconCtx('select')
          "
        />
        {{ selectLabel() }}
      </button>
    }

    @if (displayMode() === 'button') {
      <!-- browse button only; no drop surface -->
    } @else if (!openFileDialogOnClick()) {
      <!-- Drop-only: a plain region, because a button that does nothing on
           Enter is worse than no button. The browse path is the button above. -->
      <div
        class="oge-upload-dropzone oge-upload-dropzone-passive"
        [class.oge-upload-dropzone-over]="dragOver()"
        [attr.aria-describedby]="hintId()"
        (dragenter)="onDragEnter($event)"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        @if (dropZoneTpl(); as tpl) {
          <ng-container
            *ngTemplateOutlet="
              tpl.templateRef;
              context: { $implicit: dragOver(), disabled: effectiveDisabled() }
            "
          />
        } @else {
          <ng-container
            *ngTemplateOutlet="
              iconTpl()?.templateRef ?? defaultDropIcon;
              context: iconCtx('dropZone')
            "
          />
          <span class="oge-upload-dropzone-label">{{ dropZoneLabel() }}</span>
          @if (restrictionHint(); as hint) {
            <span class="oge-upload-dropzone-hint" [attr.id]="hintId()">{{
              hint
            }}</span>
          }
        }
      </div>
    } @else {
      <button
        type="button"
        class="oge-upload-dropzone"
        [class.oge-upload-dropzone-over]="dragOver()"
        [class.oge-upload-dropzone-compact]="displayMode() === 'compact'"
        [disabled]="effectiveDisabled() || readonly()"
        [attr.tabindex]="tabIndex()"
        [attr.aria-label]="msg().dropZone.ariaLabel"
        [attr.aria-describedby]="hintId()"
        (click)="openFileDialog()"
        (dragenter)="onDragEnter($event)"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        @if (dropZoneTpl(); as tpl) {
          <ng-container
            *ngTemplateOutlet="
              tpl.templateRef;
              context: { $implicit: dragOver(), disabled: effectiveDisabled() }
            "
          />
        } @else {
          <ng-container
            *ngTemplateOutlet="
              iconTpl()?.templateRef ?? defaultDropIcon;
              context: iconCtx('dropZone')
            "
          />
          <span class="oge-upload-dropzone-label">{{ dropZoneLabel() }}</span>
          @if (restrictionHint(); as hint) {
            <span class="oge-upload-dropzone-hint" [attr.id]="hintId()">{{
              hint
            }}</span>
          }
        }
      </button>
    }

    @if (showList()) {
      @if (headerTpl(); as tpl) {
        <ng-container
          *ngTemplateOutlet="tpl.templateRef; context: headerContext()"
        />
      }

      @if (files().length > 0) {
        <ul
          class="oge-upload-list"
          role="list"
          [attr.aria-label]="listLabel()"
          (keydown)="onListKeydown($event)"
        >
          @for (file of files(); track file.uid; let i = $index) {
            <li
              class="oge-upload-file"
              [class]="'oge-upload-file-' + file.status"
              [class.oge-upload-file-invalid]="file.errors.length > 0"
              [attr.data-uid]="file.uid"
              [attr.aria-labelledby]="file.uid + '-name'"
              [attr.aria-invalid]="file.errors.length > 0 ? true : null"
              [attr.aria-describedby]="
                file.errors.length > 0 ? file.uid + '-error' : null
              "
              [attr.aria-keyshortcuts]="rowShortcuts()"
              [tabindex]="file.uid === activeUid() ? 0 : -1"
              (focus)="activeUid.set(file.uid)"
            >
              @if (fileTpl(); as tpl) {
                <ng-container
                  *ngTemplateOutlet="
                    tpl.templateRef;
                    context: fileContext(file, i)
                  "
                />
              } @else {
                @if (thumbnailOf(file); as thumb) {
                  <img
                    class="oge-upload-file-thumb"
                    alt=""
                    [src]="thumb"
                    [width]="previewWidth()"
                    [attr.crossorigin]="file.crossOrigin ?? null"
                    (error)="onThumbnailError(file, $event)"
                  />
                } @else {
                  <span class="oge-upload-file-glyph" aria-hidden="true">
                    <ng-container
                      *ngTemplateOutlet="
                        iconTpl()?.templateRef ?? defaultFileIcon;
                        context: iconCtx('file')
                      "
                    />
                  </span>
                }

                <span class="oge-upload-file-main">
                  <span
                    class="oge-upload-file-name"
                    [attr.id]="file.uid + '-name'"
                    >{{ file.name }}</span
                  >
                  <span class="oge-upload-file-meta">{{ metaOf(file) }}</span>

                  @if (showsProgress(file)) {
                    <oge-progress-bar
                      class="oge-upload-file-progress"
                      [value]="file.progress"
                      [severity]="severityOf(file)"
                      [chunkCount]="file.chunk?.total"
                      [ariaLabel]="progressLabel(file)"
                    />
                  }

                  @for (error of file.errors; track error.kind) {
                    <span
                      class="oge-upload-file-error"
                      [attr.id]="file.uid + '-error'"
                    >
                      <ng-container
                        *ngTemplateOutlet="
                          iconTpl()?.templateRef ?? defaultErrorIcon;
                          context: iconCtx('error')
                        "
                      />
                      {{ error.message }}
                    </span>
                  }
                </span>

                @if (canPreview(file)) {
                  <button
                    type="button"
                    class="oge-upload-file-action"
                    [attr.aria-label]="fileActionLabel('preview', file)"
                    (click)="preview(file.uid)"
                  >
                    <ng-container
                      *ngTemplateOutlet="
                        iconTpl()?.templateRef ?? defaultPreviewIcon;
                        context: iconCtx('preview')
                      "
                    />
                  </button>
                }
                @if (canDownload(file)) {
                  <button
                    type="button"
                    class="oge-upload-file-action"
                    [attr.aria-label]="fileActionLabel('download', file)"
                    (click)="download(file.uid)"
                  >
                    <ng-container
                      *ngTemplateOutlet="
                        iconTpl()?.templateRef ?? defaultDownloadIcon;
                        context: iconCtx('download')
                      "
                    />
                  </button>
                }
                @if (canPause(file)) {
                  <button
                    type="button"
                    class="oge-upload-file-action"
                    [attr.aria-label]="actionLabel('pause', file)"
                    (click)="pause(file.uid)"
                  >
                    {{ msg().buttons.pause }}
                  </button>
                }
                @if (canResume(file)) {
                  <button
                    type="button"
                    class="oge-upload-file-action"
                    [attr.aria-label]="actionLabel('resume', file)"
                    (click)="resume(file.uid)"
                  >
                    {{ msg().buttons.resume }}
                  </button>
                }
                @if (canCancel(file)) {
                  <button
                    type="button"
                    class="oge-upload-file-action"
                    [attr.aria-label]="actionLabel('cancel', file)"
                    (click)="abort(file.uid)"
                  >
                    {{ msg().buttons.cancel }}
                  </button>
                }
                @if (canRetry(file)) {
                  <button
                    type="button"
                    class="oge-upload-file-action"
                    [attr.aria-label]="actionLabel('retry', file)"
                    (click)="retry(file.uid)"
                  >
                    {{ msg().buttons.retry }}
                  </button>
                }
                @if (listOptions().showRemove !== false) {
                  <button
                    type="button"
                    class="oge-upload-file-action"
                    [disabled]="effectiveDisabled() || readonly()"
                    [attr.aria-label]="removeLabel(file)"
                    (click)="removeFile(file.uid)"
                  >
                    <ng-container
                      *ngTemplateOutlet="
                        iconTpl()?.templateRef ?? defaultRemoveIcon;
                        context: iconCtx('remove')
                      "
                    />
                  </button>
                }
              }
            </li>
          }
        </ul>
      } @else if (emptyTpl(); as tpl) {
        <ng-container *ngTemplateOutlet="tpl.templateRef" />
      } @else {
        <p class="oge-upload-empty">{{ msg().empty }}</p>
      }
    }

    @if (toolbarTpl(); as tpl) {
      <ng-container
        *ngTemplateOutlet="
          tpl.templateRef;
          context: { $implicit: files(), uploading: false }
        "
      />
    } @else if (uploadButtonVisible() || clearButtonVisible()) {
      <div
        class="oge-upload-actions"
        [class]="'oge-upload-actions-' + actionsLayout()"
      >
        @if (uploadButtonVisible()) {
          <button
            type="button"
            class="oge-upload-start"
            [disabled]="effectiveDisabled() || readonly() || !hasPending()"
            (click)="upload()"
          >
            <ng-container
              *ngTemplateOutlet="
                iconTpl()?.templateRef ?? defaultUploadIcon;
                context: iconCtx('upload')
              "
            />
            {{ msg().buttons.upload }}
          </button>
        }
        @if (clearButtonVisible()) {
          <button
            type="button"
            class="oge-upload-clear"
            [disabled]="effectiveDisabled() || readonly()"
            (click)="clear()"
          >
            {{ msg().buttons.clear }}
          </button>
        }
      </div>
    }

    <div class="oge-upload-live" aria-live="polite" aria-atomic="true">
      {{ announcement() }}
    </div>

    @if (previewing(); as file) {
      <oge-modal
        class="oge-upload-lightbox"
        [opened]="true"
        [title]="file.name"
        [ariaLabel]="file.name"
        maxWidth="min(90vw, 900px)"
        (openedChange)="onPreviewClosed($event)"
      >
        <img
          class="oge-upload-lightbox-image"
          [src]="file.thumbnailUrl ?? file.url"
          [alt]="file.name"
          [attr.crossorigin]="file.crossOrigin ?? null"
        />
      </oge-modal>
    }

    <ng-template #defaultDropIcon>
      <svg
        class="oge-upload-icon"
        viewBox="0 0 16 16"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M8 10.5V2m0 0L5 5m3-3 3 3" />
        <path d="M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" />
      </svg>
    </ng-template>

    <ng-template #defaultSelectIcon>
      <svg
        class="oge-upload-icon"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M8 3v10M3 8h10" />
      </svg>
    </ng-template>

    <ng-template #defaultFileIcon>
      <svg
        viewBox="0 0 16 16"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M9 1.5H4.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5z"
        />
        <path d="M9 1.5V5h3.5" />
      </svg>
    </ng-template>

    <ng-template #defaultErrorIcon>
      <svg
        viewBox="0 0 16 16"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.25" />
        <path d="M8 5v3.5M8 10.8v.2" />
      </svg>
    </ng-template>

    <ng-template #defaultPreviewIcon>
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z"
        />
        <circle cx="8" cy="8" r="1.9" />
      </svg>
    </ng-template>

    <ng-template #defaultDownloadIcon>
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M8 2.5v7m0 0L5 6.5m3 3 3-3" />
        <path d="M3 11.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
      </svg>
    </ng-template>

    <ng-template #defaultUploadIcon>
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M8 12.5V3.5m0 0L4.5 7M8 3.5 11.5 7" />
      </svg>
    </ng-template>

    <ng-template #defaultRemoveIcon>
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="m4.5 4.5 7 7m0-7-7 7" />
      </svg>
    </ng-template>
  `,
  styleUrl: './file-uploader.scss',
})
export class OgeFileUploader implements ControlValueAccessor {
  private readonly config = inject(OGE_UPLOAD_CONFIG);
  private readonly destroyRef = inject(DestroyRef);
  /**
   * Injected with `self`, and the accessor is assigned in the constructor
   * rather than provided through `NG_VALUE_ACCESSOR` — the house pattern, and
   * what lets this component read `NgControl` without a circular dependency.
   */
  readonly ngControl = inject(NgControl, { optional: true, self: true });

  private readonly nativeInput = viewChild.required<{
    nativeElement: HTMLInputElement;
  }>('native');

  private readonly document = inject(DOCUMENT);
  private readonly zoneRegistry = inject(OgeUploadDropZoneRegistry);
  private readonly thumbnails = new ObjectUrlRegistry();
  private readonly dragDepth = new DragDepthCounter();

  // --- selection -------------------------------------------------------------

  /** `accept` attribute of the file input; also filters drops and pastes. */
  readonly accept = input('');
  readonly multiple = input(true);
  /** Lets the dialog pick a folder, and descends into dropped folders. */
  readonly directory = input(false);
  /** Adds files from a paste while the uploader has focus. */
  readonly pastable = input(false);
  /**
   * `false` makes the zone drop-only.
   *
   * Ant's `openFileDialogOnClick`. The zone then stops being a button — a
   * button that does nothing on Enter is worse than no button — and the
   * separate browse button is shown instead, so the keyboard path survives.
   */
  readonly openFileDialogOnClick = input(true);
  /**
   * The native `capture` attribute: opens the camera or microphone directly on
   * a mobile device instead of the file browser. Ant's `capture`.
   */
  readonly capture = input<boolean | 'user' | 'environment' | undefined>(
    undefined,
  );
  /**
   * Rewrites each file before it is validated and sent — compression,
   * watermarking, stripping EXIF.
   *
   * Ant folds this into `beforeUpload` returning a `Promise<File>`; keeping it
   * separate from `validateFile` means a transform cannot accidentally reject
   * and a rejection cannot accidentally rewrite. Applied *before* validation,
   * so the restrictions judge the bytes that will actually be sent.
   */
  readonly transformFile = input<
    ((file: File) => File | Promise<File>) | undefined
  >(undefined);
  /**
   * Supplies a preview URL for a file the browser cannot render itself — a
   * server-rendered PDF thumbnail, or a downscaled canvas image.
   *
   * Ant's `previewFile` plus `isImageUrl`: returning `null` means "no
   * thumbnail", which is the `isImageUrl: false` half.
   */
  readonly thumbnailFor = input<
    | ((file: OgeUploadFile) => string | null | Promise<string | null>)
    | undefined
  >(undefined);
  /** Turns drag & drop off without hiding the browse affordance. */
  readonly allowDrop = input(true);
  readonly dropEffect = input<OgeUploadDropEffect>('copy');
  /**
   * Name this uploader answers to, so `[ogeUploadDropZone]` and
   * `[ogeUploadTrigger]` elsewhere on the page can reach it.
   *
   * dx's `dropZone`, Kendo's `zoneId`, Syncfusion's `dropArea`.
   */
  readonly dropZone = input<string | undefined>(undefined);
  /**
   * Multipart field name, and the `name` attribute of the file input.
   *
   * dx, PrimeNG and Ant all call this `name`; here that identifier belongs to
   * the Angular forms contract, so the transport key is `fieldName` — which is
   * also what Kendo calls it (`saveField`).
   */
  readonly fieldName = input('files[]');
  /** Extra attributes for the internal `<input type="file">`. */
  readonly inputAttributes = input<Record<string, string>>({});

  // --- restrictions ----------------------------------------------------------

  readonly allowedFileExtensions = input<readonly string[]>([]);
  readonly maxFileSize = input<number | undefined>(undefined);
  readonly minFileSize = input<number | undefined>(undefined);
  readonly maxFileCount = input<number | undefined>(undefined);
  readonly maxTotalFileSize = input<number | undefined>(undefined);
  /**
   * Returns a message to reject the file, or `null` to accept it.
   *
   * The validation half of Ant's `beforeUpload`. Named `validateFile` because
   * `validate` is the `Validator` method this component implements.
   */
  readonly validateFile = input<((file: File) => string | null) | undefined>(
    undefined,
  );

  // --- display ---------------------------------------------------------------

  // --- transport -------------------------------------------------------------

  /** String, or a function per batch — the latter is Ant's `action` as a function. */
  readonly uploadUrl = input<string | ((files: readonly File[]) => string)>('');
  readonly uploadMethod = input<'post' | 'put' | 'patch'>('post');
  readonly uploadHeaders = input<Record<string, string>>({});
  /** dx's `uploadCustomData`, Ant's `data`, in both its shapes. */
  readonly uploadCustomData = input<
    Record<string, unknown> | ((file: OgeUploadFile) => Record<string, unknown>)
  >({});
  readonly withCredentials = input(false);
  readonly responseType = input<'json' | 'text' | 'blob'>('json');
  readonly timeout = input<number | undefined>(undefined);
  /** Every file in one request — Kendo's `batch`. */
  readonly batch = input(false);
  /**
   * How many transfers run at once.
   *
   * One number replaces two booleans: Kendo's `concurrent: false` and
   * Syncfusion's `sequentialUpload: true` are both `concurrency: 1`.
   */
  readonly concurrency = input<number | undefined>(undefined);
  /** `true` uses the defaults; an object tunes them (Kendo's `ChunkSettings`). */
  readonly chunk = input<boolean | OgeUploadChunkOptions>(false);
  readonly autoRetry = input<boolean | OgeUploadRetryOptions>(false);
  /** Replaces the transport wholesale — dx's `uploadFile`, Ant's `customRequest`. */
  readonly uploadAdapter = input<OgeUploadAdapter | undefined>(undefined);
  /** dx's `allowCanceling`. */
  readonly abortable = input(true);

  // --- remove from the server ------------------------------------------------

  readonly removeUrl = input<string | undefined>(undefined);
  readonly removeMethod = input<'post' | 'delete'>('post');
  readonly removeHeaders = input<Record<string, string>>({});
  readonly removeField = input('fileNames');

  readonly displayMode = input<OgeUploadDisplayMode>('full');
  readonly uploadMode = input<OgeUploadMode>('instantly');
  readonly showFileList = input<boolean | OgeUploadFileListOptions>(true);
  readonly listType = input<OgeUploadListType>('text');
  readonly previewWidth = input(50);
  readonly actionsLayout = input<OgeUploadActionsLayout>('end');
  readonly showClearButton = input<boolean | undefined>(undefined);
  /** `undefined` derives it from `uploadMode`. */
  readonly showUploadButton = input<boolean | undefined>(undefined);
  readonly showCancelButton = input<boolean | undefined>(undefined);
  /** Files that already exist on the server when the uploader renders. */
  readonly initialFiles = input<readonly OgeUploadPreloadedFile[]>([]);
  readonly messages = input<Partial<OgeUploadMessages> | undefined>(undefined);

  // --- state / forms (names fixed by the FormValueControl contract) ----------

  readonly value = model<readonly File[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly dirty = input(false);
  readonly name = input('');
  readonly errors = input<readonly OgeUploadFieldError[]>([]);
  readonly id = input<string | undefined>(undefined);
  readonly tabIndex = input(0);

  // --- outputs ---------------------------------------------------------------

  readonly filesSelecting = output<OgeUploadFilesSelectingEvent>();
  readonly filesSelected = output<OgeUploadFilesSelectedEvent>();
  readonly fileRejected = output<OgeUploadFileRejectedEvent>();
  readonly filesDropped = output<OgeUploadFilesDroppedEvent>();
  readonly dropZoneEntered = output<OgeUploadDropZoneEvent>();
  readonly dropZoneLeft = output<OgeUploadDropZoneEvent>();
  readonly fileRemoving = output<OgeUploadFileRemovingEvent>();
  readonly fileRemoved = output<OgeUploadFileRemovedEvent>();
  readonly clearing = output<OgeUploadClearingEvent>();
  readonly cleared = output<OgeUploadClearedEvent>();
  readonly thumbnailFailed = output<OgeUploadThumbnailFailedEvent>();
  /** Cancelable — veto it to show your own viewer instead of the lightbox. */
  readonly previewShowing = output<OgeUploadPreviewShowingEvent>();
  readonly previewHidden = output<OgeUploadPreviewHiddenEvent>();
  /** Cancelable — veto it to run your own signed-URL download flow. */
  readonly fileDownloading = output<OgeUploadFileDownloadingEvent>();

  /** Cancelable, and carries the mutable request — dx's `onBeforeSend`. */
  readonly uploading = output<OgeUploadUploadingEvent>();
  readonly uploadStarted = output<OgeUploadStartedEvent>();
  readonly uploadProgress = output<OgeUploadProgressEvent>();
  readonly uploaded = output<OgeUploadUploadedEvent>();
  readonly uploadFailed = output<OgeUploadFailedEvent>();
  readonly uploadAborted = output<OgeUploadAbortedEvent>();
  readonly allUploaded = output<OgeUploadAllUploadedEvent>();
  readonly chunkUploading = output<OgeUploadChunkUploadingEvent>();
  readonly chunkUploaded = output<OgeUploadChunkUploadedEvent>();
  readonly chunkFailed = output<OgeUploadChunkFailedEvent>();
  readonly uploadPausing = output<OgeUploadPausingEvent>();
  readonly uploadPaused = output<OgeUploadPausedEvent>();
  readonly uploadResuming = output<OgeUploadResumingEvent>();
  readonly uploadResumed = output<OgeUploadResumedEvent>();
  /** FormValueControl contract — emitted once per blur. */
  readonly touch = output<void>();

  // --- template slots --------------------------------------------------------

  protected readonly fileTpl = contentChild(OgeUploadFileTemplate);
  protected readonly headerTpl = contentChild(OgeUploadHeaderTemplate);
  protected readonly dropZoneTpl = contentChild(OgeUploadDropZoneTemplate);
  protected readonly emptyTpl = contentChild(OgeUploadEmptyTemplate);
  protected readonly toolbarTpl = contentChild(OgeUploadToolbarTemplate);
  protected readonly iconTpl = contentChild(OgeUploadIconTemplate);

  // --- internal state --------------------------------------------------------

  private readonly rows = signal<readonly OgeUploadFile[]>([]);
  protected readonly dragOver = signal(false);
  protected readonly activeUid = signal<string | null>(null);
  protected readonly announcement = signal('');
  /** The row whose lightbox is open, if any. */
  protected readonly previewing = signal<OgeUploadFile | null>(null);
  private readonly formsDisabled = signal(false);
  private readonly selfTouched = signal(false);
  private readonly selfDirty = signal(false);
  private onChangeFn: ((value: readonly File[]) => void) | null = null;
  private onTouchedFn: (() => void) | null = null;
  private validatorAttached = false;

  /** Every row, including the ones that failed a restriction. */
  readonly files = this.rows.asReadonly();

  protected readonly msg = computed<OgeUploadMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  readonly effectiveDisabled = computed(
    () => this.disabled() || this.formsDisabled(),
  );
  readonly effectiveTouched = computed(
    () => this.touched() || this.selfTouched(),
  );
  readonly effectiveDirty = computed(() => this.dirty() || this.selfDirty());

  /** Every restriction failure across the list — dx's `validationErrors`. */
  readonly validationErrors = computed<readonly OgeUploadFileError[]>(() =>
    this.rows().flatMap((row) => row.errors),
  );
  /** dx's `isValid`. */
  readonly valid = computed(
    () => this.validationErrors().length === 0 && !this.requiredUnmet(),
  );
  readonly effectiveInvalid = computed(
    () => this.invalid() || this.errors().length > 0 || !this.valid(),
  );

  readonly fileCount = computed(() => this.rows().length);
  readonly limitExceeded = computed(() =>
    this.rows().some((row) =>
      row.errors.some((e) => e.kind === 'maxFileCount'),
    ),
  );

  private readonly requiredUnmet = computed(
    () => this.required() && this.value().length === 0,
  );

  protected readonly listOptions = computed<OgeUploadFileListOptions>(() => {
    const setting = this.showFileList();
    return typeof setting === 'boolean' ? {} : setting;
  });
  protected readonly showList = computed(
    () => this.showFileList() !== false && this.displayMode() !== 'button',
  );
  protected readonly hasPending = computed(() =>
    this.rows().some(
      (row) =>
        row.file !== null &&
        row.errors.length === 0 &&
        row.status === 'pending',
    ),
  );
  protected readonly uploadButtonVisible = computed(() => {
    const explicit = this.showUploadButton();
    if (explicit !== undefined) {
      return explicit;
    }
    // The button exists for the modes that wait for it. `instantly` sends on
    // selection and `select` never sends at all, so a button there would be a
    // control with nothing to do.
    return (
      this.uploadMode() === 'useButtons' && this.displayMode() !== 'button'
    );
  });
  protected readonly clearButtonVisible = computed(() => {
    const explicit = this.showClearButton();
    if (explicit !== undefined) {
      return explicit;
    }
    return this.displayMode() !== 'button' && this.rows().length > 0;
  });

  protected readonly inputId = computed(
    () => `${this.id() ?? this.baseId}-input`,
  );
  protected readonly hintId = computed(() =>
    this.restrictionHint() ? `${this.id() ?? this.baseId}-hint` : null,
  );
  protected readonly rowShortcuts = computed(() =>
    this.effectiveDisabled() || this.readonly() ? null : 'Delete',
  );

  protected readonly selectLabel = computed(() =>
    this.multiple()
      ? this.msg().buttons.select
      : this.msg().buttons.selectSingle,
  );
  protected readonly listLabel = computed(() =>
    format(this.msg().listLabel, { count: String(this.rows().length) }),
  );
  protected readonly dropZoneLabel = computed(() => {
    const messages = this.msg().dropZone;
    const template = this.multiple() ? messages.label : messages.labelSingle;
    return format(template, { browse: messages.browse });
  });

  /** The restriction summary under the drop-zone label. */
  protected readonly restrictionHint = computed(() => {
    const messages = this.msg().dropZone;
    const parts: string[] = [];
    const extensions = this.allowedFileExtensions();
    if (extensions.length > 0) {
      parts.push(
        format(messages.hintExtensions, { extensions: extensions.join(', ') }),
      );
    }
    const max = this.maxFileSize();
    if (max !== undefined) {
      parts.push(format(messages.hintMaxSize, { maxSize: this.bytes(max) }));
    }
    const count = this.maxFileCount();
    if (count !== undefined) {
      parts.push(format(messages.hintMaxCount, { maxCount: String(count) }));
    }
    return parts.join(' · ');
  });

  private readonly baseId = `oge-upload-${(uidCounter += 1)}`;

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // Preloaded rows are an input, so they re-seed when the input changes; a
    // row the user has since removed is not resurrected, because the seed only
    // runs for entries whose uid is not already on the list.
    effect(() => {
      const preloaded = this.initialFiles();
      untracked(() => this.seedPreloaded(preloaded));
    });

    // The native input takes arbitrary attributes; there is no binding syntax
    // for a bag of them, so they are applied imperatively.
    effect(() => {
      const attributes = this.inputAttributes();
      const element = this.nativeInput().nativeElement;
      for (const [key, attributeValue] of Object.entries(attributes)) {
        element.setAttribute(key, attributeValue);
      }
    });

    // Publishes this uploader under its `dropZone` name so the external
    // zone/trigger directives can find it from anywhere in the DOM.
    effect((onCleanup) => {
      const zone = this.dropZone();
      if (!zone) {
        return;
      }
      this.zoneRegistry.register(zone, this);
      onCleanup(() => this.zoneRegistry.unregister(zone, this));
    });

    // Object URLs outlive the call that made them, so the component owns their
    // lifetime: navigating away from a lazy route destroys this and must not
    // leak the previews.
    this.destroyRef.onDestroy(() => {
      // Flagged *before* disposing: disposal aborts whatever is in flight, and
      // emitting `uploadAborted` from a destroyed component is an NG0953 in
      // every app that navigates away mid-transfer.
      this.destroyed = true;
      this.abortReason = 'destroy';
      this.queue?.dispose();
      this.thumbnails.revokeAll();
    });
  }

  // --- transfers -------------------------------------------------------------

  private readonly defaultTransport = inject(OGE_UPLOAD_TRANSPORT);
  private queue: UploadQueue | null = null;
  private abortReason: OgeUploadAbortReason = 'user';

  /** `true` while any transfer is in flight. */
  readonly busy = computed(() =>
    this.rows().some((row) => row.status === 'uploading'),
  );
  /** Overall percentage across every file with bytes to send — dx's `progress`. */
  readonly progress = computed(() => {
    const sendable = this.rows().filter((row) => row.file !== null);
    const total = sendable.reduce((sum, row) => sum + row.size, 0);
    if (total === 0) {
      return 0;
    }
    const loaded = sendable.reduce((sum, row) => sum + row.loaded, 0);
    return Math.round((loaded / total) * 100);
  });
  readonly uploadedCount = computed(
    () => this.rows().filter((row) => row.status === 'uploaded').length,
  );

  /**
   * Pause is offered exactly when chunking is on and resumable.
   *
   * Derived rather than an input: a second source of truth for a capability
   * the transport either has or has not would only ever disagree with itself.
   */
  protected readonly pausable = computed(() => {
    const setting = this.chunk();
    if (setting === false) {
      return false;
    }
    return typeof setting === 'boolean' ? true : setting.resumable !== false;
  });

  /**
   * `false` when there is nowhere to send to.
   *
   * Without this the default `uploadMode: 'instantly'` would start a transfer
   * the moment a file is chosen even with no `uploadUrl` — the rows would show
   * "Uploading" and settle into nothing. A uploader with no destination is a
   * file picker, and should look like one.
   */
  private canTransfer(): boolean {
    const mode = this.uploadMode();
    // `select` never uploads, and `useForm` hands the files to the enclosing
    // <form> instead — uploading them here as well would send everything twice.
    if (mode === 'select' || mode === 'useForm') {
      return false;
    }
    if (this.uploadAdapter() !== undefined) {
      return true;
    }
    const url = this.uploadUrl();
    return typeof url === 'function' || url.length > 0;
  }

  /** Starts the queued transfers — Kendo's `uploadFiles`, PrimeNG's `upload`. */
  upload(uids?: readonly string[]): void {
    if (this.effectiveDisabled() || this.readonly() || !this.canTransfer()) {
      return;
    }
    const wanted = uids ? new Set(uids) : null;
    // Files that failed a restriction are never sent: they are on the list so
    // the user can see why, not so the server can reject them a second time.
    const tasks = this.rows()
      .filter(
        (row) =>
          row.file !== null &&
          row.errors.length === 0 &&
          (row.status === 'pending' ||
            row.status === 'failed' ||
            row.status === 'aborted') &&
          (wanted === null || wanted.has(row.uid)),
      )
      .map<OgeUploadTask>((row) => ({ uid: row.uid, file: row.file as File }));

    if (tasks.length > 0) {
      this.ensureQueue().enqueue(tasks);
    }
  }

  /** dx's `abortUpload`, Kendo's `cancelUploadByUid`. */
  abort(uid?: string, reason: OgeUploadAbortReason = 'user'): void {
    if (!this.abortable() && reason === 'user') {
      return;
    }
    this.abortReason = reason;
    this.queue?.abort(uid);
  }

  /** Suspends a chunked transfer between slices. */
  pause(uid: string): boolean {
    const file = this.rowOf(uid);
    if (!file || !this.pausable()) {
      return false;
    }
    const event: OgeUploadPausingEvent = { file, cancel: false };
    this.uploadPausing.emit(event);
    if (event.cancel) {
      return false;
    }
    return this.queue?.pause(uid) ?? false;
  }

  /** Picks a paused transfer up at the slice it stopped on. */
  resume(uid: string): boolean {
    const file = this.rowOf(uid);
    if (!file) {
      return false;
    }
    const event: OgeUploadResumingEvent = { file, cancel: false };
    this.uploadResuming.emit(event);
    if (event.cancel) {
      return false;
    }
    return this.queue?.resume(uid) ?? false;
  }

  /** Kendo's `retryUploadByUid`; with no argument, everything that failed. */
  retry(uid?: string): void {
    const targets = uid
      ? [uid]
      : this.rows()
          .filter((row) => row.status === 'failed' || row.status === 'aborted')
          .map((row) => row.uid);

    for (const target of targets) {
      this.patchRow(target, {
        status: 'pending',
        loaded: 0,
        progress: 0,
        errors: [],
      });
      if (!this.queue?.retry(target)) {
        this.upload([target]);
      }
    }
  }

  // --- public API ------------------------------------------------------------

  /** Opens the browser's file dialog — PrimeNG's `choose`. */
  openFileDialog(): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.nativeInput().nativeElement.click();
  }

  /** Adds files programmatically, through the same pipeline as a drop. */
  addFiles(files: readonly File[]): void {
    this.ingest(files, 'api', null);
  }

  /** Removes one row, and its preview URL with it. */
  removeFile(uid: string): void {
    const file = this.rows().find((row) => row.uid === uid);
    if (!file || this.effectiveDisabled() || this.readonly()) {
      return;
    }

    // A file that reached the server is removed there too, when a removeUrl
    // is configured; a local-only row just leaves the list.
    const fromServer =
      this.removeUrl() !== undefined &&
      (file.status === 'uploaded' || file.file === null);

    const event: OgeUploadFileRemovingEvent = {
      file,
      fromServer,
      cancel: false,
    };
    this.fileRemoving.emit(event);
    if (event.cancel) {
      return;
    }

    if (fromServer) {
      this.sendRemove(file);
    } else {
      this.abort(uid, 'clear');
    }
    this.thumbnails.revoke(uid);
    this.rows.update((rows) => rows.filter((row) => row.uid !== uid));
    this.syncValue();
    this.markDirty();
    if (this.activeUid() === uid) {
      this.activeUid.set(this.rows()[0]?.uid ?? null);
    }
    this.fileRemoved.emit({ file, fromServer: false });
    this.announce(this.msg().announcements.fileRemoved, { name: file.name });
  }

  /** Empties the list — Kendo's `clearFiles`, PrimeNG's `clear`. */
  clear(): void {
    const files = this.rows();
    if (files.length === 0 || this.effectiveDisabled() || this.readonly()) {
      return;
    }

    const event: OgeUploadClearingEvent = { files, cancel: false };
    this.clearing.emit(event);
    if (event.cancel) {
      return;
    }

    // Anything in flight goes with the list, and says why.
    this.abort(undefined, 'clear');
    this.thumbnails.revokeAll();
    this.rows.set([]);
    this.activeUid.set(null);
    this.syncValue();
    this.markDirty();
    this.cleared.emit({ files });
    this.announce(this.msg().announcements.cleared, {});
  }

  /** Every row, or one of them — Syncfusion's `getFilesData(index?)`. */
  getFiles(index?: number): readonly OgeUploadFile[] {
    const rows = this.rows();
    if (index === undefined) {
      return rows;
    }
    const row = rows[index];
    return row ? [row] : [];
  }

  /**
   * Returns the uploader to a pristine state — dx's `reset(value)`.
   *
   * Unlike `clear()` this fires no `clearing`/`cleared` pipeline: a reset is
   * the app rewinding its own form, not the user removing files.
   */
  reset(value: readonly File[] = []): void {
    this.abort(undefined, 'clear');
    this.thumbnails.revokeAll();
    this.rows.set(value.map((file) => this.buildRow(file, [], null)));
    this.activeUid.set(null);
    this.selfTouched.set(false);
    this.selfDirty.set(false);
    this.previewing.set(null);
    this.syncValue();
  }

  /** Opens the built-in lightbox — Ant's `onPreview`. */
  preview(uid: string): void {
    const file = this.rowOf(uid);
    if (!file) {
      return;
    }
    const event: OgeUploadPreviewShowingEvent = { file, cancel: false };
    this.previewShowing.emit(event);
    // A veto means the app shows its own viewer; the built-in one stays shut.
    if (event.cancel) {
      return;
    }
    this.previewing.set(file);
  }

  /**
   * Downloads a file — Ant's `onDownload`.
   *
   * Cancelable, because a real app usually wants its own signed-URL flow. The
   * default is an anchor click against the server `url`, or a temporary object
   * URL for a file that only exists locally; that temporary URL is revoked
   * immediately, since the download has already been handed to the browser.
   */
  download(uid: string): void {
    const file = this.rowOf(uid);
    if (!file) {
      return;
    }
    const event: OgeUploadFileDownloadingEvent = { file, cancel: false };
    this.fileDownloading.emit(event);
    if (event.cancel) {
      return;
    }

    const href = file.url ?? this.temporaryUrl(file);
    if (!href) {
      return;
    }
    const anchor = this.document.createElement('a');
    anchor.href = href;
    anchor.download = file.name;
    anchor.click();
    if (!file.url) {
      URL.revokeObjectURL?.(href);
    }
  }

  private temporaryUrl(file: OgeUploadFile): string | null {
    if (!file.file || typeof URL.createObjectURL !== 'function') {
      return null;
    }
    try {
      return URL.createObjectURL(file.file);
    } catch {
      return null;
    }
  }

  /** Reorders the list — Syncfusion's `sortFileList`, by name unless told otherwise. */
  sortFiles(
    compare: (a: OgeUploadFile, b: OgeUploadFile) => number = (a, b) =>
      a.name.localeCompare(b.name),
  ): void {
    this.rows.update((rows) => [...rows].sort(compare));
    this.syncValue();
  }

  focus(): void {
    const target = this.hostZone();
    target?.focus();
  }

  blur(): void {
    this.hostZone()?.blur();
  }

  // --- selection pipeline ----------------------------------------------------

  protected onNativeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    // Reset the input so choosing the same file twice in a row still fires
    // `change`. In `useForm` mode the list is put back afterwards, because
    // there the input's own FileList is what gets submitted.
    input.value = '';
    this.ingest(picked, 'dialog', event);
  }

  /**
   * Mirrors the row list back into the native input's `FileList`.
   *
   * Only `useForm` needs this, and it genuinely needs it: a file added by drop
   * or paste never touched the input, so without this the enclosing `<form>`
   * would submit an empty field and the drop would silently do nothing.
   * Assigning `files` requires a `DataTransfer`, which jsdom does not have —
   * hence the guard rather than a crash in every spec.
   */
  private syncNativeFiles(): void {
    if (this.uploadMode() !== 'useForm') {
      return;
    }
    if (typeof DataTransfer !== 'function') {
      return;
    }
    const input = this.nativeInput().nativeElement;
    const transfer = new DataTransfer();
    for (const row of this.rows()) {
      if (row.file && row.errors.length === 0) {
        transfer.items.add(row.file);
      }
    }
    input.files = transfer.files;
  }

  protected onPaste(event: ClipboardEvent): void {
    if (!this.pastable() || this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const pasted = readClipboardFiles(event.clipboardData);
    if (pasted.length > 0) {
      this.ingest(pasted, 'paste', event);
    }
  }

  protected onDragEnter(event: DragEvent): void {
    if (!this.dropAllowed(event)) {
      return;
    }
    event.preventDefault();
    if (this.dragDepth.enter()) {
      this.dragOver.set(true);
      this.dropZoneEntered.emit({
        event,
        zone: event.currentTarget as HTMLElement,
      });
      this.announce(this.msg().announcements.dropZoneEntered, {});
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.dropAllowed(event)) {
      return;
    }
    // Without this the browser never fires `drop` at all.
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dropEffectFor(this.dropEffect());
    }
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.dragDepth.active) {
      return;
    }
    if (this.dragDepth.leave()) {
      this.dragOver.set(false);
      this.dropZoneLeft.emit({
        event,
        zone: event.currentTarget as HTMLElement,
      });
    }
  }

  protected onDrop(event: DragEvent): void {
    if (!this.dropAllowed(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth.reset();
    this.dragOver.set(false);

    void readDataTransferFiles(event.dataTransfer, {
      directory: this.directory(),
    }).then((dropped) => {
      if (dropped.length === 0) {
        return;
      }
      this.filesDropped.emit({ files: dropped, event });
      this.ingest(dropped, 'drop', event);
    });
  }

  private dropAllowed(event: DragEvent): boolean {
    return (
      this.allowDrop() &&
      !this.effectiveDisabled() &&
      !this.readonly() &&
      dataTransferHasFiles(event.dataTransfer)
    );
  }

  /** The one road into the list: dialog, drop, paste and `addFiles` all use it. */
  private ingest(
    incoming: readonly File[],
    source: OgeUploadSelectionSource,
    origin: Event | null,
  ): void {
    if (incoming.length === 0 || this.effectiveDisabled() || this.readonly()) {
      return;
    }

    const selecting: OgeUploadFilesSelectingEvent = {
      files: incoming,
      source,
      event: origin,
      cancel: false,
    };
    this.filesSelecting.emit(selecting);
    if (selecting.cancel) {
      return;
    }

    const transform = this.transformFile();
    if (transform) {
      // Rewriting happens before validation, so the restrictions judge the
      // bytes that will actually be sent rather than the ones picked.
      // Started inside the chain, not before it: a `transformFile` that throws
      // synchronously would otherwise escape the `catch` and take the whole
      // selection down instead of falling back to the untransformed files.
      void Promise.resolve()
        .then(() => Promise.all(incoming.map((file) => transform(file))))
        .then((transformed) => this.commitSelection(transformed, source))
        .catch(() => this.commitSelection(incoming, source));
      return;
    }
    this.commitSelection(incoming, source);
  }

  /** The half of `ingest` that runs once the files are final. */
  private commitSelection(
    incoming: readonly File[],
    source: OgeUploadSelectionSource,
  ): void {
    // Single-file mode replaces rather than appends — the behaviour every
    // reference has, and what `maxCount: 1` means in Ant.
    const existing = this.multiple() ? this.rows() : [];
    if (!this.multiple() && this.rows().length > 0) {
      this.thumbnails.revokeAll();
    }
    const batch = this.multiple() ? incoming : incoming.slice(0, 1);

    const results = validateSelection(batch, this.restrictions(), {
      count: existing.length,
      totalSize: existing.reduce((sum, row) => sum + row.size, 0),
    });

    const added: OgeUploadFile[] = [];
    for (const result of results) {
      const file = result.candidate;
      const kinds = [...result.errors];
      const custom = this.validateFile()?.(file) ?? null;
      const row = this.buildRow(file, kinds, custom);
      added.push(row);
    }

    this.rows.set([...existing, ...added]);
    this.resolveCustomThumbnails(added);
    for (const row of added) {
      if (row.errors.length > 0) {
        this.fileRejected.emit({ file: row, errors: row.errors });
      }
    }
    this.syncValue();
    this.markDirty();
    this.activeUid.set(this.activeUid() ?? this.rows()[0]?.uid ?? null);

    const accepted = added.filter((row) => row.errors.length === 0);
    this.filesSelected.emit({
      files: this.rows(),
      accepted,
      rejected: added.filter((row) => row.errors.length > 0),
      source,
    });
    this.announceSelection(added, accepted);

    if (this.uploadMode() === 'instantly' && accepted.length > 0) {
      this.upload(accepted.map((row) => row.uid));
    }
  }

  private buildRow(
    file: File,
    kinds: readonly OgeUploadErrorKind[],
    custom: string | null,
  ): OgeUploadFile {
    const uid = `${this.baseId}-f${(uidCounter += 1)}`;
    const errors: OgeUploadFileError[] = kinds.map((kind) => ({
      kind,
      message: this.errorMessage(kind, file),
    }));
    if (custom !== null) {
      errors.push({ kind: 'custom', message: custom });
    }

    const thumbnailUrl =
      this.config.showThumbnails && errors.length === 0
        ? (this.thumbnails.create(uid, file) ?? undefined)
        : undefined;

    return {
      uid,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      status: errors.length > 0 ? 'invalid' : 'pending',
      loaded: 0,
      progress: 0,
      errors,
      response: null,
      httpStatus: null,
      chunk: null,
      attempts: 0,
      thumbnailUrl,
    };
  }

  /**
   * Asks `thumbnailFor` for a preview the browser could not make itself.
   *
   * Runs after the rows are on screen rather than blocking them: a
   * server-rendered PDF thumbnail is worth waiting for, an empty file list is
   * not.
   */
  private resolveCustomThumbnails(rows: readonly OgeUploadFile[]): void {
    const resolve = this.thumbnailFor();
    if (!resolve) {
      return;
    }
    for (const row of rows) {
      if (row.thumbnailUrl !== undefined || row.errors.length > 0) {
        continue;
      }
      void Promise.resolve(resolve(row))
        .then((url) => {
          if (url && !this.destroyed) {
            this.patchRow(row.uid, { thumbnailUrl: url });
          }
        })
        .catch(() => undefined);
    }
  }

  private seedPreloaded(preloaded: readonly OgeUploadPreloadedFile[]): void {
    if (preloaded.length === 0) {
      return;
    }
    const known = new Set(this.rows().map((row) => row.uid));
    const seeded = preloaded
      .map((entry, index) => ({
        entry,
        uid: entry.uid ?? `${this.baseId}-p${index}`,
      }))
      .filter(({ uid }) => !known.has(uid))
      .map<OgeUploadFile>(({ entry, uid }) => ({
        uid,
        name: entry.name,
        size: entry.size ?? 0,
        type: entry.type ?? '',
        file: null,
        status: 'uploaded',
        loaded: entry.size ?? 0,
        progress: 100,
        errors: [],
        response: null,
        httpStatus: null,
        chunk: null,
        attempts: 0,
        url: entry.url,
        thumbnailUrl: entry.thumbnailUrl,
        crossOrigin: entry.crossOrigin,
      }));

    if (seeded.length > 0) {
      this.rows.update((rows) => [...seeded, ...rows]);
    }
  }

  private restrictions(): OgeUploadRestrictions {
    return {
      allowedFileExtensions: this.allowedFileExtensions(),
      maxFileSize: this.maxFileSize(),
      minFileSize: this.minFileSize(),
      maxFileCount: this.maxFileCount(),
      maxTotalFileSize: this.maxTotalFileSize(),
    };
  }

  private errorMessage(kind: OgeUploadErrorKind, file: File): string {
    const messages = this.msg().validation;
    const tokens: Record<string, string> = {
      name: file.name,
      size: this.bytes(file.size),
      extensions: this.allowedFileExtensions().join(', '),
    };
    switch (kind) {
      case 'extension':
        return format(messages.extension, tokens);
      case 'maxFileSize':
        return format(messages.maxFileSize, {
          ...tokens,
          limit: this.bytes(this.maxFileSize() ?? 0),
        });
      case 'minFileSize':
        return format(messages.minFileSize, {
          ...tokens,
          limit: this.bytes(this.minFileSize() ?? 0),
        });
      case 'maxFileCount':
        return format(messages.maxFileCount, {
          ...tokens,
          limit: String(this.maxFileCount() ?? 0),
        });
      case 'maxTotalSize':
        return format(messages.maxTotalSize, {
          ...tokens,
          limit: this.bytes(this.maxTotalFileSize() ?? 0),
        });
      case 'server':
        return messages.server;
      default:
        return messages.custom;
    }
  }

  // --- keyboard --------------------------------------------------------------

  protected onListKeydown(event: KeyboardEvent): void {
    const rows = this.rows();
    if (rows.length === 0) {
      return;
    }
    const current = rows.findIndex((row) => row.uid === this.activeUid());
    const enabled = () => false;

    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        next = stepEnabledIndex(rows.length, current, 1, enabled);
        break;
      case 'ArrowUp':
        next = stepEnabledIndex(rows.length, current, -1, enabled);
        break;
      case 'Home':
        next = edgeEnabledIndex(rows.length, 1, enabled);
        break;
      case 'End':
        next = edgeEnabledIndex(rows.length, -1, enabled);
        break;
      case 'Delete':
      case 'Backspace': {
        // No reference supports removing a file from the keyboard; the mouse
        // affordance without its keyboard twin is exactly the gap the a11y
        // contract exists to close.
        const uid = this.activeUid();
        if (uid !== null) {
          event.preventDefault();
          this.removeFile(uid);
        }
        return;
      }
      default:
        return;
    }

    if (next !== null) {
      event.preventDefault();
      const uid = rows[next]?.uid ?? null;
      this.activeUid.set(uid);
      this.focusRow(uid);
    }
  }

  private focusRow(uid: string | null): void {
    if (uid === null) {
      return;
    }
    const host = this.nativeInput().nativeElement.parentElement;
    const row = host?.querySelector<HTMLElement>(
      `.oge-upload-file[data-uid="${uid}"]`,
    );
    row?.focus();
  }

  private hostZone(): HTMLElement | null {
    const host = this.nativeInput().nativeElement.parentElement;
    return (
      host?.querySelector<HTMLElement>(
        '.oge-upload-dropzone, .oge-upload-select',
      ) ?? null
    );
  }

  // --- template helpers ------------------------------------------------------

  protected sizeOf(file: OgeUploadFile): string {
    return this.bytes(file.size);
  }

  /** Size, plus the status line once the row has one worth showing. */
  protected metaOf(file: OgeUploadFile): string {
    const size = this.bytes(file.size);
    if (file.status === 'pending' || file.status === 'invalid') {
      return size;
    }
    const status = this.msg().status;
    if (file.status !== 'uploading') {
      return `${size} · ${this.statusText(file)}`;
    }

    const parts = [size];
    if (file.chunk) {
      parts.push(
        format(status.chunk, {
          index: String(file.chunk.index + 1),
          total: String(file.chunk.total),
        }),
      );
    }
    if (file.bytesPerSecond !== undefined) {
      parts.push(
        format(status.rate, { rate: this.bytes(file.bytesPerSecond) }),
      );
    }
    if (file.secondsRemaining !== undefined) {
      parts.push(
        format(status.remaining, { seconds: String(file.secondsRemaining) }),
      );
    }
    if (parts.length === 1) {
      parts.push(status.uploading);
    }
    return parts.join(' · ');
  }

  protected showsProgress(file: OgeUploadFile): boolean {
    return file.status === 'uploading' || file.status === 'paused';
  }

  protected severityOf(
    file: OgeUploadFile,
  ): 'accent' | 'success' | 'warning' | 'danger' {
    if (file.status === 'failed') return 'danger';
    if (file.status === 'uploaded') return 'success';
    if (file.status === 'paused') return 'warning';
    return 'accent';
  }

  protected progressLabel(file: OgeUploadFile): string {
    return `${file.name}: ${this.statusText(file)}`;
  }

  protected canCancel(file: OgeUploadFile): boolean {
    return (
      this.abortable() &&
      this.listOptions().showCancel !== false &&
      (file.status === 'uploading' || file.status === 'paused')
    );
  }

  protected canRetry(file: OgeUploadFile): boolean {
    return (
      this.listOptions().showRetry !== false &&
      (file.status === 'failed' || file.status === 'aborted')
    );
  }

  protected readonly captureAttr = computed(() => {
    const value = this.capture();
    if (value === undefined || value === false) {
      return null;
    }
    return value === true ? '' : value;
  });

  protected canPreview(file: OgeUploadFile): boolean {
    return (
      this.listOptions().showPreview !== false &&
      (file.thumbnailUrl !== undefined || file.url !== undefined)
    );
  }

  protected canDownload(file: OgeUploadFile): boolean {
    // Opt-in: a download button on a file the user just picked from their own
    // disk is noise, so it appears once there is a server URL, or when the
    // list options ask for it explicitly.
    const explicit = this.listOptions().showDownload;
    if (explicit === false) {
      return false;
    }
    return explicit === true || file.url !== undefined;
  }

  protected onPreviewClosed(opened: boolean): void {
    if (opened) {
      return;
    }
    const file = this.previewing();
    this.previewing.set(null);
    if (file) {
      this.previewHidden.emit({ file });
    }
  }

  protected fileActionLabel(
    action: 'preview' | 'download',
    file: OgeUploadFile,
  ): string {
    return `${this.msg().buttons[action]}: ${file.name}`;
  }

  protected canPause(file: OgeUploadFile): boolean {
    return (
      this.pausable() &&
      this.listOptions().showPause !== false &&
      file.status === 'uploading'
    );
  }

  protected canResume(file: OgeUploadFile): boolean {
    return this.pausable() && file.status === 'paused';
  }

  protected actionLabel(
    action: 'cancel' | 'retry' | 'pause' | 'resume',
    file: OgeUploadFile,
  ): string {
    return `${this.msg().buttons[action]}: ${file.name}`;
  }

  protected thumbnailOf(file: OgeUploadFile): string | null {
    return this.listType() === 'text' ? null : (file.thumbnailUrl ?? null);
  }

  protected removeLabel(file: OgeUploadFile): string {
    return `${this.msg().buttons.remove}: ${file.name}`;
  }

  protected iconCtx(slot: string): { $implicit: string } {
    return { $implicit: slot };
  }

  protected headerContext() {
    const rows = this.rows();
    return {
      $implicit: rows,
      count: rows.length,
      uploadedCount: rows.filter((row) => row.status === 'uploaded').length,
      totalSize: this.bytes(rows.reduce((sum, row) => sum + row.size, 0)),
    };
  }

  protected fileContext(file: OgeUploadFile, index: number) {
    return {
      $implicit: file,
      index,
      size: this.bytes(file.size),
      status: this.statusText(file),
    };
  }

  protected onThumbnailError(file: OgeUploadFile, event: Event): void {
    this.thumbnailFailed.emit({ file, event });
  }

  private statusText(file: OgeUploadFile): string {
    const status = this.msg().status;
    switch (file.status) {
      case 'uploaded':
        return status.uploaded;
      case 'failed':
        return status.failed;
      case 'aborted':
        return status.aborted;
      case 'paused':
        return status.paused;
      case 'uploading':
        return status.uploading;
      default:
        return status.ready;
    }
  }

  private bytes(size: number): string {
    return formatFileSize(size, {
      locale: this.config.locale,
      binary: this.config.binaryFileSizes,
    });
  }

  // --- queue plumbing --------------------------------------------------------

  private resolvedChunk() {
    const setting = this.chunk();
    if (setting === false) {
      return null;
    }
    const options: OgeUploadChunkOptions =
      typeof setting === 'boolean' ? {} : setting;
    // Kendo's ChunkSettings defaults, verbatim — a server written against its
    // chunked upload works here unchanged.
    return {
      size: options.size ?? this.config.chunkSize,
      autoRetryAfter: options.autoRetryAfter ?? 100,
      maxAutoRetries: options.maxAutoRetries ?? 1,
      resumable: options.resumable ?? true,
    };
  }

  private resolvedRetry() {
    const setting = this.autoRetry();
    if (setting === false) {
      return null;
    }
    const options: OgeUploadRetryOptions =
      typeof setting === 'boolean' ? {} : setting;
    return { count: options.count ?? 3, delayMs: options.delayMs ?? 500 };
  }

  private ensureQueue(): UploadQueue {
    // The queue captures the transport-shaping inputs, so it is rebuilt when
    // they may have changed — but never out from under a live transfer.
    if (this.queue?.busy) {
      return this.queue;
    }
    this.queue?.dispose();
    this.queue = new UploadQueue({
      adapter: this.uploadAdapter() ?? this.defaultTransport,
      concurrency: Math.max(1, this.concurrency() ?? this.config.concurrency),
      batch: this.batch(),
      chunk: this.resolvedChunk(),
      autoRetry: this.resolvedRetry(),
      timers: {
        setTimeout: (handler, ms) => setTimeout(handler, ms),
        clearTimeout: (handle) =>
          clearTimeout(handle as ReturnType<typeof setTimeout>),
      },
      buildRequest: (tasks, chunk, chunkTotal) =>
        this.buildRequest(tasks, chunk, chunkTotal),
      onEvent: (event) => this.onQueueEvent(event),
    });
    return this.queue;
  }

  /** Assembles the request, then offers it to `uploading` for mutation. */
  private buildRequest(
    tasks: readonly OgeUploadTask[],
    chunk: { readonly index: number } | null,
    chunkTotal: number,
  ) {
    const files = tasks
      .map((task) => this.rowOf(task.uid))
      .filter((row): row is OgeUploadFile => row !== null);
    if (files.length === 0) {
      return null;
    }

    if (chunk) {
      const chunkEvent: OgeUploadChunkUploadingEvent = {
        file: files[0],
        chunkIndex: chunk.index,
        totalChunks: chunkTotal,
        cancel: false,
      };
      this.chunkUploading.emit(chunkEvent);
      if (chunkEvent.cancel) {
        return null;
      }
    }

    const urlInput = this.uploadUrl();
    const custom = this.uploadCustomData();
    const event: OgeUploadUploadingEvent = {
      files,
      batch: this.batch(),
      chunk: chunk ? { index: chunk.index, total: chunkTotal } : null,
      cancel: false,
      request: {
        url:
          typeof urlInput === 'function'
            ? urlInput(tasks.map((task) => task.file))
            : urlInput,
        method: this.uploadMethod(),
        headers: { ...this.uploadHeaders() },
        data:
          typeof custom === 'function'
            ? { ...custom(files[0]) }
            : { ...custom },
        fieldName: this.fieldName(),
        withCredentials: this.withCredentials(),
        responseType: this.responseType(),
        timeout: this.timeout(),
      },
    };

    this.uploading.emit(event);
    // An empty URL is a misconfiguration, not a transfer: sending to the
    // current page would 200 on a static host and look like success.
    if (event.cancel || !event.request.url) {
      return null;
    }
    return event.request;
  }

  private destroyed = false;

  private onQueueEvent(event: OgeUploadQueueEvent): void {
    if (this.destroyed) {
      return;
    }
    const messages = this.msg().announcements;
    switch (event.type) {
      case 'started':
        for (const uid of event.uids) {
          this.patchRow(uid, {
            status: 'uploading',
            loaded: 0,
            progress: 0,
            errors: [],
            startedAt: Date.now(),
            bytesPerSecond: undefined,
            secondsRemaining: undefined,
          });
          const file = this.rowOf(uid);
          if (file) {
            this.uploadStarted.emit({ file });
            this.announce(messages.uploadStarted, { name: file.name });
          }
        }
        break;

      case 'progress': {
        const ratio = event.total > 0 ? event.loaded / event.total : 0;
        // The rate is computed here rather than in the template: reading a
        // clock during rendering would give a different answer on every change
        // detection pass, which dev mode reports as a changed-after-checked
        // expression.
        this.patchRow(event.uid, {
          loaded: event.loaded,
          progress: Math.round(ratio * 100),
          ...this.rateOf(event.uid, event.loaded, event.total),
        });
        const file = this.rowOf(event.uid);
        if (file) {
          this.uploadProgress.emit({
            file,
            loaded: event.loaded,
            total: event.total,
            ratio,
          });
        }
        break;
      }

      case 'chunkStarted':
        this.patchRow(event.uid, {
          chunk: { index: event.index, total: event.total },
        });
        break;

      case 'chunkDone': {
        const file = this.rowOf(event.uid);
        if (file) {
          this.chunkUploaded.emit({
            file,
            chunkIndex: event.index,
            totalChunks: event.total,
            response: event.response,
          });
        }
        break;
      }

      case 'chunkFailed': {
        const file = this.rowOf(event.uid);
        if (file) {
          this.chunkFailed.emit({
            file,
            chunkIndex: event.index,
            message: event.message,
          });
        }
        break;
      }

      case 'done': {
        const before = this.rowOf(event.uid);
        this.patchRow(event.uid, {
          status: 'uploaded',
          progress: 100,
          loaded: before?.size ?? 0,
          response: event.response,
          httpStatus: event.httpStatus,
          chunk: null,
        });
        const file = this.rowOf(event.uid);
        if (file) {
          this.uploaded.emit({
            file,
            response: event.response,
            httpStatus: event.httpStatus,
          });
          this.announce(messages.uploadCompleted, { name: file.name });
        }
        break;
      }

      case 'failed': {
        this.patchRow(event.uid, {
          status: 'failed',
          httpStatus: event.httpStatus,
          response: event.response,
          errors: [{ kind: 'server', message: event.message }],
        });
        const file = this.rowOf(event.uid);
        if (file) {
          this.uploadFailed.emit({
            file,
            message: event.message,
            httpStatus: event.httpStatus,
            response: event.response,
          });
          this.announce(messages.uploadFailed, {
            name: file.name,
            reason: event.message,
          });
        }
        break;
      }

      case 'aborted': {
        this.patchRow(event.uid, { status: 'aborted' });
        const file = this.rowOf(event.uid);
        if (file) {
          this.uploadAborted.emit({ file, reason: this.abortReason });
          this.announce(messages.uploadAborted, { name: file.name });
        }
        break;
      }

      case 'paused': {
        this.patchRow(event.uid, { status: 'paused' });
        const file = this.rowOf(event.uid);
        if (file) {
          this.uploadPaused.emit({ file });
          this.announce(messages.uploadPaused, { name: file.name });
        }
        break;
      }

      case 'resumed': {
        this.patchRow(event.uid, { status: 'uploading' });
        const file = this.rowOf(event.uid);
        if (file) {
          this.uploadResumed.emit({ file });
          this.announce(messages.uploadResumed, { name: file.name });
        }
        break;
      }

      case 'idle': {
        const touched = this.rows().filter(
          (row) => row.status === 'uploaded' || row.status === 'failed',
        );
        if (touched.length === 0) {
          break;
        }
        const succeeded = touched.filter((row) => row.status === 'uploaded');
        this.allUploaded.emit({
          files: touched,
          succeeded,
          failed: touched.filter((row) => row.status === 'failed'),
        });
        this.announce(messages.allCompleted, {
          succeeded: String(succeeded.length),
          total: String(touched.length),
        });
        break;
      }
    }
  }

  /**
   * Fires the server-side delete.
   *
   * Deliberately fire-and-forget on the UI side: the row has already gone, and
   * resurrecting it because a DELETE 500'd would be worse than the stale file
   * it leaves behind. The failure still reaches the app through `uploadFailed`.
   */
  private sendRemove(file: OgeUploadFile): void {
    const url = this.removeUrl();
    const adapter = this.uploadAdapter() ?? this.defaultTransport;
    if (!url || !adapter.remove) {
      return;
    }
    adapter.remove(
      [file.name],
      {
        url,
        method: this.removeMethod(),
        headers: { ...this.removeHeaders() },
        data: {},
        fieldName: this.removeField(),
        withCredentials: this.withCredentials(),
        responseType: this.responseType(),
        timeout: this.timeout(),
      },
      {
        progress: () => undefined,
        done: () => undefined,
        fail: (error) =>
          this.uploadFailed.emit({
            file,
            message: error.message,
            httpStatus: error.httpStatus,
            response: error.response,
          }),
      },
    );
  }

  /** Observed rate and the estimate that follows from it. */
  private rateOf(
    uid: string,
    loaded: number,
    total: number,
  ): Partial<OgeUploadFile> {
    const startedAt = this.rowOf(uid)?.startedAt;
    if (startedAt === undefined) {
      return {};
    }
    const seconds = (Date.now() - startedAt) / 1000;
    // Below a tick of real time the number is noise, not a measurement.
    if (seconds < 0.25 || loaded <= 0) {
      return {};
    }
    const bytesPerSecond = loaded / seconds;
    const left = Math.max(0, total - loaded);
    return {
      bytesPerSecond,
      secondsRemaining:
        bytesPerSecond > 0 ? Math.round(left / bytesPerSecond) : undefined,
    };
  }

  private rowOf(uid: string): OgeUploadFile | null {
    return this.rows().find((row) => row.uid === uid) ?? null;
  }

  private patchRow(uid: string, patch: Partial<OgeUploadFile>): void {
    this.rows.update((rows) =>
      rows.map((row) => (row.uid === uid ? { ...row, ...patch } : row)),
    );
  }

  // --- announcements ---------------------------------------------------------

  private announce(template: string, tokens: Record<string, string>): void {
    this.announcement.set(format(template, tokens));
  }

  private announceSelection(
    added: readonly OgeUploadFile[],
    accepted: readonly OgeUploadFile[],
  ): void {
    const messages = this.msg().announcements;
    const rejected = added.filter((row) => row.errors.length > 0);
    if (rejected.length === 1 && added.length === 1) {
      this.announce(messages.fileRejected, {
        name: rejected[0].name,
        reason: rejected[0].errors[0]?.message ?? '',
      });
      return;
    }
    if (accepted.length === 1 && added.length === 1) {
      this.announce(messages.fileAdded, { name: accepted[0].name });
      return;
    }
    this.announce(messages.filesAdded, { count: String(accepted.length) });
  }

  // --- forms -----------------------------------------------------------------

  private syncValue(): void {
    this.syncNativeFiles();
    const files = this.rows()
      .map((row) => row.file)
      .filter((file): file is File => file !== null);
    untracked(() => this.value.set(files));
    this.onChangeFn?.(files);
    // The restrictions are the component's state, not the control's value, so
    // the control has to be told to re-run them.
    this.ngControl?.control?.updateValueAndValidity({ emitEvent: false });
  }

  private markDirty(): void {
    this.selfDirty.set(true);
    this.selfTouched.set(true);
    this.onTouchedFn?.();
    this.touch.emit();
  }

  writeValue(value: unknown): void {
    const files = Array.isArray(value) ? (value as readonly File[]) : [];
    this.thumbnails.revokeAll();
    this.rows.set(files.map((file) => this.buildRow(file, [], null)));
    this.selfTouched.set(false);
    this.selfDirty.set(false);
    untracked(() => this.value.set(files));
  }

  registerOnChange(fn: (value: readonly File[]) => void): void {
    this.onChangeFn = fn;
    // `setUpControl` has run by now, so the control exists. The restrictions
    // are attached as a plain ValidatorFn rather than an `NG_VALIDATORS`
    // provider: providing that token on the same element as a `self`-injected
    // `NgControl` is a genuine DI cycle (NgControl -> FormControlDirective ->
    // NG_VALIDATORS -> this), which `forwardRef` cannot break. Adding the
    // function composes with whatever validators the app already set.
    const control = this.ngControl?.control;
    if (control && !this.validatorAttached) {
      this.validatorAttached = true;
      control.addValidators(this.restrictionValidator);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formsDisabled.set(disabled);
  }

  /**
   * Publishes the component's own restrictions to the bound control.
   *
   * Without this a reactive-forms consumer would have to restate
   * `maxFileSize` and the extension list as a `ValidatorFn` to make the form
   * invalid — the rules would live in two places and drift.
   */
  private readonly restrictionValidator = (): ValidationErrors | null => {
    if (this.requiredUnmet()) {
      return { required: true };
    }
    const errors = this.validationErrors();
    return errors.length > 0 ? { ogeUpload: { errors } } : null;
  };
}

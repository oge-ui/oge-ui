import { NgTemplateOutlet } from '@angular/common';
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
import { OgeProgressBar } from '@oge-ui/layout';
import { OgeModal } from '@oge-ui/overlay';
import {
  OgeFileUploaderCore,
  mergeUploadMessages,
  type OgeFileUploaderEvents,
  type OgeFileUploaderProps,
  type OgeUploadAbortReason,
  type OgeUploadAbortedEvent,
  type OgeUploadActionsLayout,
  type OgeUploadAdapter,
  type OgeUploadAllUploadedEvent,
  type OgeUploadChunkFailedEvent,
  type OgeUploadChunkOptions,
  type OgeUploadChunkUploadedEvent,
  type OgeUploadChunkUploadingEvent,
  type OgeUploadClearedEvent,
  type OgeUploadClearingEvent,
  type OgeUploadDisplayMode,
  type OgeUploadDropEffect,
  type OgeUploadDropZoneEvent,
  type OgeUploadFailedEvent,
  type OgeUploadFieldError,
  type OgeUploadFile,
  type OgeUploadFileDownloadingEvent,
  type OgeUploadFileError,
  type OgeUploadFileListOptions,
  type OgeUploadFileRejectedEvent,
  type OgeUploadFileRemovedEvent,
  type OgeUploadFileRemovingEvent,
  type OgeUploadFilesDroppedEvent,
  type OgeUploadFilesSelectedEvent,
  type OgeUploadFilesSelectingEvent,
  type OgeUploadListType,
  type OgeUploadMessages,
  type OgeUploadMessagesInput,
  type OgeUploadMode,
  type OgeUploadPausedEvent,
  type OgeUploadPausingEvent,
  type OgeUploadPreloadedFile,
  type OgeUploadPreviewHiddenEvent,
  type OgeUploadPreviewShowingEvent,
  type OgeUploadProgressEvent,
  type OgeUploadResumedEvent,
  type OgeUploadResumingEvent,
  type OgeUploadRetryOptions,
  type OgeUploadStartedEvent,
  type OgeUploadThumbnailFailedEvent,
  type OgeUploadUploadedEvent,
  type OgeUploadUploadingEvent,
} from '@oge-ui/behavior';
import { OGE_UPLOAD_CONFIG } from '../config';
import { OgeUploadDropZoneRegistry } from '../drop-zone/drop-zone-registry';
import { OGE_UPLOAD_TRANSPORT } from '../transport';
import {
  OgeUploadDropZoneTemplate,
  OgeUploadEmptyTemplate,
  OgeUploadFileTemplate,
  OgeUploadHeaderTemplate,
  OgeUploadIconTemplate,
  OgeUploadToolbarTemplate,
} from '../templates/upload-templates';

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
              (focus)="onRowFocus(file.uid)"
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

  private readonly zoneRegistry = inject(OgeUploadDropZoneRegistry);
  private readonly defaultTransport = inject(OGE_UPLOAD_TRANSPORT);

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
   * watermarking, stripping EXIF. Applied *before* validation, so the
   * restrictions judge the bytes that will actually be sent.
   */
  readonly transformFile = input<
    ((file: File) => File | Promise<File>) | undefined
  >(undefined);
  /**
   * Supplies a preview URL for a file the browser cannot render itself — a
   * server-rendered PDF thumbnail, or a downscaled canvas image. Returning
   * `null` means "no thumbnail".
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
   */
  readonly dropZone = input<string | undefined>(undefined);
  /** Multipart field name, and the `name` attribute of the file input. */
  readonly fieldName = input('files[]');
  /** Extra attributes for the internal `<input type="file">`. */
  readonly inputAttributes = input<Record<string, string>>({});

  // --- restrictions ----------------------------------------------------------

  readonly allowedFileExtensions = input<readonly string[]>([]);
  readonly maxFileSize = input<number | undefined>(undefined);
  readonly minFileSize = input<number | undefined>(undefined);
  readonly maxFileCount = input<number | undefined>(undefined);
  readonly maxTotalFileSize = input<number | undefined>(undefined);
  /** Returns a message to reject the file, or `null` to accept it. */
  readonly validateFile = input<((file: File) => string | null) | undefined>(
    undefined,
  );

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
  /** How many transfers run at once (`1` is sequential). */
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

  // --- display ---------------------------------------------------------------

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
  readonly messages = input<OgeUploadMessagesInput | undefined>(undefined);

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

  // --- the shared machine ----------------------------------------------------

  private readonly baseId = `oge-upload-${(uidCounter += 1)}`;

  protected readonly msg = computed<OgeUploadMessages>(() =>
    mergeUploadMessages(this.config.messages, this.messages()),
  );

  private readonly formsDisabled = signal(false);
  private readonly selfTouched = signal(false);
  private readonly selfDirty = signal(false);
  private onChangeFn: ((value: readonly File[]) => void) | null = null;
  private onTouchedFn: (() => void) | null = null;
  private validatorAttached = false;

  readonly effectiveDisabled = computed(
    () => this.disabled() || this.formsDisabled(),
  );
  readonly effectiveTouched = computed(
    () => this.touched() || this.selfTouched(),
  );
  readonly effectiveDirty = computed(() => this.dirty() || this.selfDirty());

  /**
   * The machine itself is `@oge-ui/behavior`'s `OgeFileUploaderCore`, shared
   * verbatim with the React uploader (ADR 0001); this component is the
   * Angular seam — inputs go in through one live getter, state comes out
   * through `onChange` into signals, and `emit` routes into the outputs.
   */
  private readonly core = new OgeFileUploaderCore({
    props: (): OgeFileUploaderProps => ({
      accept: this.accept(),
      multiple: this.multiple(),
      directory: this.directory(),
      pastable: this.pastable(),
      transformFile: this.transformFile(),
      thumbnailFor: this.thumbnailFor(),
      allowDrop: this.allowDrop(),
      dropEffect: this.dropEffect(),
      fieldName: this.fieldName(),
      allowedFileExtensions: this.allowedFileExtensions(),
      maxFileSize: this.maxFileSize(),
      minFileSize: this.minFileSize(),
      maxFileCount: this.maxFileCount(),
      maxTotalFileSize: this.maxTotalFileSize(),
      validateFile: this.validateFile(),
      uploadUrl: this.uploadUrl(),
      uploadMethod: this.uploadMethod(),
      uploadHeaders: this.uploadHeaders(),
      uploadCustomData: this.uploadCustomData(),
      withCredentials: this.withCredentials(),
      responseType: this.responseType(),
      timeout: this.timeout(),
      batch: this.batch(),
      concurrency: this.concurrency(),
      chunk: this.chunk(),
      autoRetry: this.autoRetry(),
      uploadAdapter: this.uploadAdapter(),
      abortable: this.abortable(),
      removeUrl: this.removeUrl(),
      removeMethod: this.removeMethod(),
      removeHeaders: this.removeHeaders(),
      removeField: this.removeField(),
      displayMode: this.displayMode(),
      uploadMode: this.uploadMode(),
      showFileList: this.showFileList(),
      listType: this.listType(),
      showClearButton: this.showClearButton(),
      showUploadButton: this.showUploadButton(),
      disabled: this.effectiveDisabled(),
      readonly: this.readonly(),
      required: this.required(),
    }),
    config: () => this.config,
    messages: () => this.msg(),
    defaultAdapter: () => this.defaultTransport,
    nativeInput: () => this.nativeInput().nativeElement,
    baseId: this.baseId,
    onChange: () => this.mirror(),
    emit: (name, payload) => this.dispatch(name, payload),
    onValueChange: (files) => {
      untracked(() => this.value.set(files));
      this.onChangeFn?.(files);
      // The restrictions are the component's state, not the control's value,
      // so the control has to be told to re-run them.
      this.ngControl?.control?.updateValueAndValidity({ emitEvent: false });
    },
    onDirty: () => this.markDirty(),
  });

  // --- mirrored state --------------------------------------------------------

  private readonly rows = signal<readonly OgeUploadFile[]>([]);
  protected readonly dragOver = signal(false);
  protected readonly activeUid = signal<string | null>(null);
  protected readonly announcement = signal('');
  /** The row whose lightbox is open, if any. */
  protected readonly previewing = signal<OgeUploadFile | null>(null);
  /** Bumps on every machine change so derived reads re-evaluate. */
  private readonly version = signal(0);

  private mirror(): void {
    this.rows.set(this.core.rows);
    this.dragOver.set(this.core.dragOver);
    this.activeUid.set(this.core.activeUid);
    this.announcement.set(this.core.announcement);
    this.previewing.set(this.core.previewing);
    this.version.update((v) => v + 1);
  }

  private dispatch<K extends keyof OgeFileUploaderEvents>(
    name: K,
    payload: OgeFileUploaderEvents[K],
  ): void {
    const target = this[name] as unknown as {
      emit(value: OgeFileUploaderEvents[K]): void;
    };
    target.emit(payload);
  }

  /** Every row, including the ones that failed a restriction. */
  readonly files = this.rows.asReadonly();

  /** Every restriction failure across the list — dx's `validationErrors`. */
  readonly validationErrors = computed<readonly OgeUploadFileError[]>(() =>
    this.rows().flatMap((row) => row.errors),
  );
  private readonly requiredUnmet = computed(
    () => this.required() && this.value().length === 0,
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
  /** `true` while any transfer is in flight. */
  readonly busy = computed(() =>
    this.rows().some((row) => row.status === 'uploading'),
  );
  /** Overall percentage across every file with bytes to send — dx's `progress`. */
  readonly progress = computed(() => {
    this.rows();
    return this.core.progress;
  });
  readonly uploadedCount = computed(
    () => this.rows().filter((row) => row.status === 'uploaded').length,
  );

  // --- derived for the template ----------------------------------------------

  private derived<T>(read: () => T) {
    return computed(() => {
      this.version();
      return read();
    });
  }

  protected readonly listOptions = this.derived(() => this.core.listOptions);
  protected readonly showList = this.derived(() => this.core.showList);
  protected readonly hasPending = this.derived(() => this.core.hasPending);
  protected readonly uploadButtonVisible = this.derived(
    () => this.core.uploadButtonVisible,
  );
  protected readonly clearButtonVisible = this.derived(
    () => this.core.clearButtonVisible,
  );
  protected readonly selectLabel = this.derived(() => this.core.selectLabel);
  protected readonly listLabel = this.derived(() => this.core.listLabel);
  protected readonly dropZoneLabel = this.derived(
    () => this.core.dropZoneLabel,
  );
  /** The restriction summary under the drop-zone label. */
  protected readonly restrictionHint = this.derived(
    () => this.core.restrictionHint,
  );
  protected readonly inputId = computed(
    () => `${this.id() ?? this.baseId}-input`,
  );
  protected readonly hintId = computed(() =>
    this.restrictionHint() ? `${this.id() ?? this.baseId}-hint` : null,
  );
  protected readonly rowShortcuts = this.derived(() => this.core.rowShortcuts);
  protected readonly captureAttr = computed(() => {
    const value = this.capture();
    if (value === undefined || value === false) return null;
    return value === true ? '' : value;
  });

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    // Preloaded rows are an input, so they re-seed when the input changes; a
    // row the user has since removed is not resurrected, because the seed only
    // runs for entries whose uid is not already on the list.
    effect(() => {
      const preloaded = this.initialFiles();
      untracked(() => this.core.seedPreloaded(preloaded));
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
      if (!zone) return;
      this.zoneRegistry.register(zone, this);
      onCleanup(() => this.zoneRegistry.unregister(zone, this));
    });

    // Object URLs outlive the call that made them, so the component owns their
    // lifetime: navigating away from a lazy route destroys this and must not
    // leak the previews.
    this.destroyRef.onDestroy(() => this.core.destroy());
  }

  // --- transfers -------------------------------------------------------------

  /** Starts the queued transfers — Kendo's `uploadFiles`, PrimeNG's `upload`. */
  upload(uids?: readonly string[]): void {
    this.core.upload(uids);
  }

  /** dx's `abortUpload`, Kendo's `cancelUploadByUid`. */
  abort(uid?: string, reason: OgeUploadAbortReason = 'user'): void {
    this.core.abort(uid, reason);
  }

  /** Suspends a chunked transfer between slices. */
  pause(uid: string): boolean {
    return this.core.pause(uid);
  }

  /** Picks a paused transfer up at the slice it stopped on. */
  resume(uid: string): boolean {
    return this.core.resume(uid);
  }

  /** Kendo's `retryUploadByUid`; with no argument, everything that failed. */
  retry(uid?: string): void {
    this.core.retry(uid);
  }

  // --- public API ------------------------------------------------------------

  /** Opens the browser's file dialog — PrimeNG's `choose`. */
  openFileDialog(): void {
    this.core.openFileDialog();
  }

  /** Adds files programmatically, through the same pipeline as a drop. */
  addFiles(files: readonly File[]): void {
    this.core.addFiles(files);
  }

  /** Removes one row, and its preview URL with it. */
  removeFile(uid: string): void {
    this.core.removeFile(uid);
  }

  /** Empties the list — Kendo's `clearFiles`, PrimeNG's `clear`. */
  clear(): void {
    this.core.clear();
  }

  /** Every row, or one of them — Syncfusion's `getFilesData(index?)`. */
  getFiles(index?: number): readonly OgeUploadFile[] {
    return this.core.getFiles(index);
  }

  /**
   * Returns the uploader to a pristine state — dx's `reset(value)`.
   *
   * Unlike `clear()` this fires no `clearing`/`cleared` pipeline: a reset is
   * the app rewinding its own form, not the user removing files.
   */
  reset(value: readonly File[] = []): void {
    this.selfTouched.set(false);
    this.selfDirty.set(false);
    this.core.reset(value);
  }

  /** Opens the built-in lightbox — Ant's `onPreview`. */
  preview(uid: string): void {
    this.core.preview(uid);
  }

  /** Downloads a file — Ant's `onDownload`; cancelable via `fileDownloading`. */
  download(uid: string): void {
    this.core.download(uid);
  }

  /** Reorders the list — Syncfusion's `sortFileList`, by name unless told otherwise. */
  sortFiles(compare?: (a: OgeUploadFile, b: OgeUploadFile) => number): void {
    this.core.sortFiles(compare);
  }

  focus(): void {
    this.hostZone()?.focus();
  }

  blur(): void {
    this.hostZone()?.blur();
  }

  // --- selection pipeline ----------------------------------------------------

  protected onNativeChange(event: Event): void {
    this.core.onNativeChange(event);
  }

  protected onPaste(event: ClipboardEvent): void {
    this.core.onPaste(event);
  }

  protected onDragEnter(event: DragEvent): void {
    this.core.onDragEnter(event);
  }

  protected onDragOver(event: DragEvent): void {
    this.core.onDragOver(event);
  }

  protected onDragLeave(event: DragEvent): void {
    this.core.onDragLeave(event);
  }

  protected onDrop(event: DragEvent): void {
    this.core.onDrop(event);
  }

  // --- keyboard --------------------------------------------------------------

  protected onListKeydown(event: KeyboardEvent): void {
    const uid = this.core.onListKeydown(event);
    if (uid !== null) this.focusRow(uid);
  }

  protected onRowFocus(uid: string): void {
    this.core.setActive(uid);
  }

  /** @internal Spec seam — patches a row and re-mirrors the state. */
  private patchRow(uid: string, patch: Partial<OgeUploadFile>): void {
    this.core.patchRow(uid, patch);
    this.mirror();
  }

  private focusRow(uid: string): void {
    const host = this.nativeInput().nativeElement.parentElement;
    host
      ?.querySelector<HTMLElement>(`.oge-upload-file[data-uid="${uid}"]`)
      ?.focus();
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
    return this.core.bytes(file.size);
  }

  protected metaOf(file: OgeUploadFile): string {
    return this.core.metaOf(file);
  }

  protected showsProgress(file: OgeUploadFile): boolean {
    return this.core.showsProgress(file);
  }

  protected severityOf(
    file: OgeUploadFile,
  ): 'accent' | 'success' | 'warning' | 'danger' {
    return this.core.severityOf(file);
  }

  protected progressLabel(file: OgeUploadFile): string {
    return this.core.progressLabel(file);
  }

  protected canCancel(file: OgeUploadFile): boolean {
    return this.core.canCancel(file);
  }

  protected canRetry(file: OgeUploadFile): boolean {
    return this.core.canRetry(file);
  }

  protected canPreview(file: OgeUploadFile): boolean {
    return this.core.canPreview(file);
  }

  protected canDownload(file: OgeUploadFile): boolean {
    return this.core.canDownload(file);
  }

  protected canPause(file: OgeUploadFile): boolean {
    return this.core.canPause(file);
  }

  protected canResume(file: OgeUploadFile): boolean {
    return this.core.canResume(file);
  }

  protected onPreviewClosed(opened: boolean): void {
    if (!opened) this.core.closePreview();
  }

  protected fileActionLabel(
    action: 'preview' | 'download',
    file: OgeUploadFile,
  ): string {
    return this.core.actionLabel(action, file);
  }

  protected actionLabel(
    action: 'cancel' | 'retry' | 'pause' | 'resume',
    file: OgeUploadFile,
  ): string {
    return this.core.actionLabel(action, file);
  }

  protected removeLabel(file: OgeUploadFile): string {
    return this.core.actionLabel('remove', file);
  }

  protected thumbnailOf(file: OgeUploadFile): string | null {
    return this.core.thumbnailOf(file);
  }

  protected iconCtx(slot: string): { $implicit: string } {
    return { $implicit: slot };
  }

  protected headerContext() {
    const context = this.core.headerContext();
    return {
      $implicit: context.files,
      count: context.count,
      uploadedCount: context.uploadedCount,
      totalSize: context.totalSize,
    };
  }

  protected fileContext(file: OgeUploadFile, index: number) {
    return {
      $implicit: file,
      index,
      size: this.core.bytes(file.size),
      status: this.core.statusText(file),
    };
  }

  protected onThumbnailError(file: OgeUploadFile, event: Event): void {
    this.core.thumbnailFailed(file, event);
  }

  // --- forms -----------------------------------------------------------------

  private markDirty(): void {
    this.selfDirty.set(true);
    this.selfTouched.set(true);
    this.onTouchedFn?.();
    this.touch.emit();
  }

  writeValue(value: unknown): void {
    const files = Array.isArray(value) ? (value as readonly File[]) : [];
    this.core.setValue(files);
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
   * Publishes the component's own restrictions to the bound control, so a
   * reactive-forms consumer never restates `maxFileSize` as a `ValidatorFn`.
   */
  private readonly restrictionValidator = (): ValidationErrors | null => {
    if (this.requiredUnmet()) {
      return { required: true };
    }
    const errors = this.validationErrors();
    return errors.length > 0 ? { ogeUpload: { errors } } : null;
  };
}

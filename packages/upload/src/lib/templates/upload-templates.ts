import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeUploadFile } from '../upload-types';

/**
 * Every glyph the uploader draws, as one discriminated slot.
 *
 * PrimeNG spends four template inputs on icons and Ant three more; a single
 * directive with a discriminated context covers all of them and leaves room
 * for the ones no reference has.
 */
export type OgeUploadIconSlot =
  | 'select'
  | 'upload'
  | 'clear'
  | 'cancel'
  | 'remove'
  | 'retry'
  | 'pause'
  | 'resume'
  | 'download'
  | 'preview'
  | 'dropZone'
  | 'file'
  | 'success'
  | 'error';

/** Context of `*ogeUploadFileTemplate`. */
export interface OgeUploadFileTemplateContext {
  readonly $implicit: OgeUploadFile;
  readonly index: number;
  /** Pre-formatted size, so a custom row need not import the formatter. */
  readonly size: string;
  /** The row's resolved status line. */
  readonly status: string;
}

/** Context of `*ogeUploadHeaderTemplate`. */
export interface OgeUploadHeaderTemplateContext {
  readonly $implicit: readonly OgeUploadFile[];
  readonly count: number;
  readonly uploadedCount: number;
  /** Pre-formatted total size of the list. */
  readonly totalSize: string;
}

/** Context of `*ogeUploadDropZoneTemplate`. */
export interface OgeUploadDropZoneTemplateContext {
  /** `true` while files are hovering the zone. */
  readonly $implicit: boolean;
  readonly disabled: boolean;
}

/** Context of `*ogeUploadToolbarTemplate`. */
export interface OgeUploadToolbarTemplateContext {
  readonly $implicit: readonly OgeUploadFile[];
  readonly uploading: boolean;
}

/** Context of `*ogeUploadIconTemplate`. */
export interface OgeUploadIconTemplateContext {
  readonly $implicit: OgeUploadIconSlot;
}

/**
 * Replaces the body of one file row.
 *
 * Covers PrimeNG's `file` and `filelabel`, Syncfusion's `template` and Ant's
 * `itemRender` in one slot.
 */
@Directive({ selector: '[ogeUploadFileTemplate]' })
export class OgeUploadFileTemplate {
  readonly templateRef: TemplateRef<OgeUploadFileTemplateContext> =
    inject(TemplateRef);

  /** Lets `strictTemplates` infer the context of the microsyntax. */
  static ngTemplateContextGuard(
    _dir: OgeUploadFileTemplate,
    _ctx: unknown,
  ): _ctx is OgeUploadFileTemplateContext {
    return true;
  }
}

/** Replaces the header strip above the list. */
@Directive({ selector: '[ogeUploadHeaderTemplate]' })
export class OgeUploadHeaderTemplate {
  readonly templateRef: TemplateRef<OgeUploadHeaderTemplateContext> =
    inject(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeUploadHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgeUploadHeaderTemplateContext {
    return true;
  }
}

/** Replaces the drop zone's contents — icon, label and restriction hint. */
@Directive({ selector: '[ogeUploadDropZoneTemplate]' })
export class OgeUploadDropZoneTemplate {
  readonly templateRef: TemplateRef<OgeUploadDropZoneTemplateContext> =
    inject(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeUploadDropZoneTemplate,
    _ctx: unknown,
  ): _ctx is OgeUploadDropZoneTemplateContext {
    return true;
  }
}

/** Rendered in place of the list while nothing is selected. */
@Directive({ selector: '[ogeUploadEmptyTemplate]' })
export class OgeUploadEmptyTemplate {
  readonly templateRef: TemplateRef<void> = inject(TemplateRef);
}

/** Replaces the Upload/Clear action row. */
@Directive({ selector: '[ogeUploadToolbarTemplate]' })
export class OgeUploadToolbarTemplate {
  readonly templateRef: TemplateRef<OgeUploadToolbarTemplateContext> =
    inject(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeUploadToolbarTemplate,
    _ctx: unknown,
  ): _ctx is OgeUploadToolbarTemplateContext {
    return true;
  }
}

/** Replaces one glyph, discriminated by {@link OgeUploadIconSlot}. */
@Directive({ selector: '[ogeUploadIconTemplate]' })
export class OgeUploadIconTemplate {
  readonly templateRef: TemplateRef<OgeUploadIconTemplateContext> =
    inject(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeUploadIconTemplate,
    _ctx: unknown,
  ): _ctx is OgeUploadIconTemplateContext {
    return true;
  }
}

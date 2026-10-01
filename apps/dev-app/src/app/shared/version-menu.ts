import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OgeSelectBox } from '@oge-ui/inputs/select-box';
import { DOCS_VERSIONS, type DocsVersion } from './docs-versions';

/**
 * The docs version switch in the header. Picking an archived version opens
 * the same page on that version's site (path and query kept, so a reader
 * comparing APIs lands where they were); the archive's own banner links back.
 */
@Component({
  selector: 'app-version-menu',
  imports: [OgeSelectBox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-select-box
      class="app-version-select"
      [items]="versions"
      displayExpr="label"
      [value]="versions[0]"
      [showClearButton]="false"
      [width]="'8.5rem'"
      size="sm"
      subscriptSizing="none"
      label="Documentation version"
      labelMode="hidden"
      (valueCommitted)="open($any($event.value))"
    />
  `,
})
export class VersionMenu {
  private readonly document = inject(DOCUMENT);
  protected readonly versions = DOCS_VERSIONS;

  protected open(version: DocsVersion | null): void {
    if (!version?.origin) return;
    const { pathname, search } = this.document.location;
    this.document.location.assign(`${version.origin}${pathname}${search}`);
  }
}

import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Everything } from './everything';
import { AI, SPREADSHEET } from './extra-hosts';
import { FAMILIES as SSR_FAMILIES } from './hosts';

/**
 * Every family's host on one page (apps/ssr-smoke's hosts plus the two it
 * does not server-render). `Everything` is not shown: importing it makes the
 * build link and compile every component, directive and pipe the packages
 * export, on this Angular.
 */
const FAMILIES = [...SSR_FAMILIES, SPREADSHEET, AI];

@Component({
  selector: 'compat-root',
  imports: [NgComponentOutlet, Everything],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (family of families; track family.name) {
      <section [attr.data-family]="family.name">
        <ng-container *ngComponentOutlet="family.host" />
      </section>
    }
    @if (false) {
      <compat-everything />
    }
  `,
})
class Root {
  protected readonly families = FAMILIES;
}

bootstrapApplication(Root, {
  providers: FAMILIES.flatMap((family) => family.providers ?? []),
}).catch((error: unknown) => console.error(error));

/** What the browser check reads: each family and the strings it must show. */
(globalThis as { compatFamilies?: unknown }).compatFamilies = FAMILIES.map(
  (family) => ({ name: family.name, expect: family.expect }),
);

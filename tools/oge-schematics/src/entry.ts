import type { Rule } from '@angular-devkit/schematics';
import { ogeNgAdd } from './ng-add';
import type { NgAddOptions } from './options';

/**
 * Per-package bundle entry. The package name is substituted at build time
 * (`build.mjs` passes it through esbuild's `define`), so all nine packages ship
 * the same implementation with no per-package source to keep in sync.
 */
declare const OGE_PACKAGE_NAME: string;

export function ngAdd(options: NgAddOptions): Rule {
  return ogeNgAdd(OGE_PACKAGE_NAME, options);
}

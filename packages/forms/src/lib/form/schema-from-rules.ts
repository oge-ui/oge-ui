import { resource, type Signal } from '@angular/core';
import { validate, validateAsync } from '@angular/forms/signals';
import {
  asyncValidationRules,
  evaluateOgeValidationRules,
} from '@oge-ui/behavior';
import type { OgeFormItemData, OgeValidationRule } from './form-types';

/**
 * Item shape the compiler needs. Kept structural so both the declarative
 * children and the `items` array feed the same code path.
 */
export interface RuleSource {
  readonly field: string;
  readonly isRequired?: boolean;
  readonly validationRules?: readonly OgeValidationRule[];
}

/* eslint-disable @typescript-eslint/no-explicit-any -- the Signal Forms path
   type is keyed on the model shape, which is only known to the caller. Every
   `as any` below is a path narrowing the caller has already made by naming a
   real model property in `field`. */

function pathFor(root: any, field: string): any {
  let current = root;
  for (const key of field.split('.')) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Compiles every item's `isRequired` / `validationRules` into an Angular
 * Signal Forms schema function. This is the whole of OGE's validation story in
 * `formData` mode — no second engine exists, and in `[fieldTree]` /
 * `[formGroup]` mode this compiler is never called at all.
 *
 * The **semantics** are not implemented here: the synchronous rules run
 * through `@oge-ui/behavior`'s `evaluateOgeValidationRules`, which is the same
 * function React's `<OgeForm>` calls, so the two layers cannot disagree about
 * what a rule means or which message it produces (ADR 0001). What stays here
 * is the Angular plumbing: one `validate()` per field that reports the shared
 * verdict, and a `resource`-backed `validateAsync()` per async rule, since
 * scheduling a promise is exactly the part each framework does its own way.
 */
export function schemaFromRules(
  items: readonly RuleSource[],
): (path: any) => void {
  return (root: any) => {
    for (const item of items) {
      const path = pathFor(root, item.field);
      if (path === undefined) continue;
      const rules = item.validationRules ?? [];
      const isRequired = item.isRequired === true;

      if (isRequired || rules.some((rule) => rule.type !== 'async')) {
        validate(path, (ctx: any) =>
          evaluateOgeValidationRules(
            ctx.value(),
            (ctx.valueOf(root) ?? {}) as Record<string, unknown>,
            rules,
            isRequired,
          ),
        );
      }

      for (const rule of asyncValidationRules(rules)) {
        validateAsync(path, {
          params: (ctx: any) => ctx.value(),
          // `factory` must return a real `Resource`, not a config object — the
          // loader re-runs whenever the field's value changes
          factory: (params: Signal<unknown>) =>
            resource({
              params: () => params(),
              loader: ({ params: value }: { params: unknown }) =>
                value === undefined
                  ? Promise.resolve(null)
                  : rule.validate(value),
            }),
          onSuccess: (message: unknown) =>
            typeof message === 'string' && message.length > 0
              ? { kind: 'async', message }
              : undefined,
          // no explicit message falls through to the inputs package's
          // `invalidError`, so every user-facing string stays in one table
          onError: () => ({ kind: 'async', message: rule.message }),
        } as any);
      }
    }
  };
}

/** Narrow helper so callers can pass either shape without a cast. */
export function toRuleSources(
  items: readonly OgeFormItemData[],
): readonly RuleSource[] {
  return items;
}

import { resource, type Signal } from '@angular/core';
import { disabled, validate, validateAsync } from '@angular/forms/signals';
import {
  asyncValidationRules,
  evaluateOgeFormCondition,
  evaluateOgeValidationRules,
  isFormItemVisible,
  type OgeFormCondition,
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
  readonly visible?: boolean;
  readonly visibleWhen?: OgeFormCondition;
  readonly requiredWhen?: OgeFormCondition;
  readonly disabledWhen?: OgeFormCondition;
}

/** Server-side messages per field — `setErrors()` feeds it, an edit clears it. */
export type ServerErrorLookup = (field: string) => readonly string[];

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
  serverErrors?: ServerErrorLookup,
): (path: any) => void {
  return (root: any) => {
    for (const item of items) {
      const path = pathFor(root, item.field);
      if (path === undefined) continue;
      const rules = item.validationRules ?? [];
      const isRequired = item.isRequired === true;
      const conditional =
        item.visibleWhen !== undefined ||
        item.requiredWhen !== undefined ||
        item.disabledWhen !== undefined;
      /** Hidden or conditionally disabled items are not validated. */
      const skipped = (data: Record<string, unknown>): boolean =>
        !isFormItemVisible(item, data) ||
        evaluateOgeFormCondition(item.disabledWhen, data, false);

      if (item.disabledWhen !== undefined) {
        disabled(path, (ctx: any) =>
          evaluateOgeFormCondition(
            item.disabledWhen,
            ctx.valueOf(root) ?? {},
            false,
          ),
        );
      }

      if (
        isRequired ||
        conditional ||
        rules.some((rule) => rule.type !== 'async')
      ) {
        validate(path, (ctx: any) => {
          const data = (ctx.valueOf(root) ?? {}) as Record<string, unknown>;
          if (skipped(data)) return [];
          return evaluateOgeValidationRules(
            ctx.value(),
            data,
            rules,
            isRequired ||
              evaluateOgeFormCondition(item.requiredWhen, data, false),
          );
        });
      }

      if (serverErrors) {
        validate(path, () =>
          serverErrors(item.field).map((message) => ({
            kind: 'server',
            message,
          })),
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

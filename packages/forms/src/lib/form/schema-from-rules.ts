import { resource, type Signal } from '@angular/core';
import {
  email,
  max,
  maxDate,
  maxLength,
  min,
  minDate,
  minLength,
  pattern,
  required,
  validate,
  validateAsync,
  type SchemaPath,
} from '@angular/forms/signals';
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

function applyRule(path: any, rule: OgeValidationRule, root: any): void {
  switch (rule.type) {
    case 'required':
      required(path as SchemaPath<unknown>, { message: rule.message });
      return;
    case 'email':
      email(path as SchemaPath<string>, { message: rule.message });
      return;
    case 'numeric':
      if (rule.min !== undefined) {
        min(path, rule.min, { message: rule.message });
      }
      if (rule.max !== undefined) {
        max(path, rule.max, { message: rule.message });
      }
      return;
    case 'stringLength':
      if (rule.min !== undefined) {
        minLength(path, rule.min, { message: rule.message });
      }
      if (rule.max !== undefined) {
        maxLength(path, rule.max, { message: rule.message });
      }
      return;
    case 'pattern':
      pattern(path as SchemaPath<string>, rule.pattern, {
        message: rule.message,
      });
      return;
    case 'range':
      if (rule.min !== undefined) {
        minDate(path, rule.min, { message: rule.message });
      }
      if (rule.max !== undefined) {
        maxDate(path, rule.max, { message: rule.message });
      }
      return;
    case 'custom':
      // `root` is the schema path the compiler was handed, so `valueOf(root)`
      // is how a cross-field rule reaches the whole model
      validate(path, (ctx: any) => {
        const message = rule.validate({
          value: ctx.value(),
          data: (ctx.valueOf(root) ?? {}) as Record<string, unknown>,
        });
        return message ? { kind: 'custom', message } : undefined;
      });
      return;
    case 'async':
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
      return;
  }
}

/**
 * Compiles every item's `isRequired` / `validationRules` into an Angular
 * Signal Forms schema function. This is the whole of OGE's validation story in
 * `formData` mode — no second engine exists, and in `[fieldTree]` /
 * `[formGroup]` mode this compiler is never called at all.
 */
export function schemaFromRules(
  items: readonly RuleSource[],
): (path: any) => void {
  return (root: any) => {
    for (const item of items) {
      const path = pathFor(root, item.field);
      if (path === undefined) continue;
      if (item.isRequired === true) {
        required(path as SchemaPath<unknown>);
      }
      for (const rule of item.validationRules ?? []) {
        applyRule(path, rule, root);
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

'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { OgeMaskCore } from '@oge-ui/behavior';
import {
  OgeTextBox,
  type OgeTextBoxHandle,
  type OgeTextBoxProps,
} from './text-box';

/** Imperative handle of `<OgeMaskedTextBox>` — the text box handle plus the mask readers. */
export interface OgeMaskedTextBoxHandle extends OgeTextBoxHandle {
  /** The entered characters without literals, whatever `includeLiterals` says. */
  rawValue(): string;
  /** The formatted text with literals (`''` while empty), whatever `includeLiterals` says. */
  maskedValue(): string;
}

export interface OgeMaskedTextBoxProps extends Omit<OgeTextBoxProps, 'mask'> {
  /** The input mask — required here (see `<OgeTextBox mask>` for the syntax). */
  mask: string;
}

/**
 * The mask-first text box — the Kendo / Syncfusion `MaskedTextBox`, and the
 * React render of the Angular `<oge-masked-text-box>`: the text box's chrome
 * and mask engine (`@oge-ui/behavior`'s `OgeMaskCore`) with the mask
 * **required**, spell-checking and autocomplete off by default, and the raw /
 * formatted readers on the handle.
 *
 * ```tsx
 * <OgeMaskedTextBox label="Phone" mask="(000) 000-0000" value={phone} onValueChange={setPhone} />
 * ```
 */
export const OgeMaskedTextBox = forwardRef<
  OgeMaskedTextBoxHandle,
  OgeMaskedTextBoxProps
>(function OgeMaskedTextBoxRender(props, ref) {
  const {
    spellcheck = false,
    autocomplete = 'off',
    className,
    ...rest
  } = props;
  const inner = useRef<OgeTextBoxHandle>(null);
  // a reader core over the committed value — the text box's own core is
  // internal, and the committed value is what both readers describe
  const reader = useMemo(
    () =>
      new OgeMaskCore({
        mask: props.mask,
        rules: props.maskRules,
        maskChar: props.maskChar,
      }),
    [props.mask, props.maskRules, props.maskChar],
  );
  const committed = useRef<string>(props.value ?? props.defaultValue ?? '');
  if (props.value !== undefined) committed.current = props.value;

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inner.current?.focus(),
      blur: () => inner.current?.blur(),
      clear: () => inner.current?.clear(),
      isMaskComplete: () => inner.current?.isMaskComplete() ?? true,
      rawValue: () => {
        reader.setValue(committed.current, props.includeLiterals ?? false);
        return reader.rawValue();
      },
      maskedValue: () => {
        reader.setValue(committed.current, props.includeLiterals ?? false);
        return reader.maskedValue();
      },
    }),
    [reader, props.includeLiterals],
  );

  return (
    <OgeTextBox
      {...rest}
      ref={inner}
      spellcheck={spellcheck}
      autocomplete={autocomplete}
      className={['oge-masked-text-box', className].filter(Boolean).join(' ')}
      onValueChange={(value) => {
        committed.current = value;
        props.onValueChange?.(value);
      }}
    />
  );
});

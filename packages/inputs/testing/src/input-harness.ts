import {
  ComponentHarness,
  HarnessPredicate,
  TestKey,
  type BaseHarnessFilters,
  type ComponentHarnessConstructor,
} from '@angular/cdk/testing';

/** Filters shared by every OGE input harness's `with()`. */
export interface OgeInputHarnessFilters extends BaseHarnessFilters {
  /** Only editors whose label (visible label or `aria-label`) matches. */
  label?: string | RegExp;
  /** Only editors whose displayed text matches. */
  value?: string | RegExp;
  /** Only disabled (`true`) or enabled (`false`) editors. */
  disabled?: boolean;
}

/** Trimmed, whitespace-collapsed text — what a reader sees. */
export const ogeCleanText = (text: string): string =>
  text.replace(/\s+/g, ' ').trim();

/**
 * Behaviour every OGE text-field editor shares: the field chrome around one
 * `input.oge-input-native`, the label, the subscript and the state classes
 * (`oge-disabled`, `oge-input-invalid`, `oge-input-readonly`). Shared with
 * sibling harnesses only — not exported from the entry point.
 */
export abstract class OgeInputHarnessBase extends ComponentHarness {
  protected readonly native = this.locatorFor('input.oge-input-native');
  private readonly labelEl = this.locatorForOptional('.oge-input-label');
  private readonly errorEl = this.locatorForOptional('.oge-input-error');
  private readonly hintEl = this.locatorForOptional('.oge-input-hint');

  /** Builds the `with()` predicate for a concrete harness class. */
  protected static inputPredicate<T extends OgeInputHarnessBase>(
    type: ComponentHarnessConstructor<T>,
    options: OgeInputHarnessFilters,
  ): HarnessPredicate<T> {
    return new HarnessPredicate(type, options)
      .addOption('label', options.label, (harness, label) =>
        HarnessPredicate.stringMatches(harness.getLabel(), label),
      )
      .addOption('value', options.value, (harness, value) =>
        HarnessPredicate.stringMatches(harness.getValue(), value),
      )
      .addOption(
        'disabled',
        options.disabled,
        async (harness, disabled) => (await harness.isDisabled()) === disabled,
      );
  }

  /** The text the editor shows (the native input's value). */
  async getValue(): Promise<string> {
    return String((await (await this.native()).getProperty('value')) ?? '');
  }

  /**
   * The label: the visible `<label>` (without the required mark), or the
   * input's `aria-label` when `labelMode="hidden"`.
   */
  async getLabel(): Promise<string> {
    const label = await this.labelEl();
    if (label) return ogeCleanText((await label.text()).replace(/\*$/, ''));
    return (await (await this.native()).getAttribute('aria-label')) ?? '';
  }

  /** The input's placeholder. */
  async getPlaceholder(): Promise<string> {
    return (await (await this.native()).getAttribute('placeholder')) ?? '';
  }

  /** Whether the editor is disabled. */
  async isDisabled(): Promise<boolean> {
    const host = await this.host();
    if (await host.hasClass('oge-disabled')) return true;
    return (
      (await (await this.native()).getProperty<boolean>('disabled')) === true
    );
  }

  /** Whether the editor is read-only. */
  async isReadonly(): Promise<boolean> {
    return (await this.host()).hasClass('oge-input-readonly');
  }

  /** Whether the editor shows its error state (`aria-invalid="true"`). */
  async isInvalid(): Promise<boolean> {
    return (
      (await (await this.native()).getAttribute('aria-invalid')) === 'true'
    );
  }

  /** Whether the editor is required (`aria-required="true"`). */
  async isRequired(): Promise<boolean> {
    return (
      (await (await this.native()).getAttribute('aria-required')) === 'true'
    );
  }

  /** The visible error message, or `''`. */
  async getErrorText(): Promise<string> {
    const error = await this.errorEl();
    return error ? ogeCleanText(await error.text()) : '';
  }

  /** The visible hint, or `''`. */
  async getHintText(): Promise<string> {
    const hint = await this.hintEl();
    return hint ? ogeCleanText(await hint.text()) : '';
  }

  /** Focuses the native input. */
  async focus(): Promise<void> {
    return (await this.native()).focus();
  }

  /** Blurs the native input — the editor commits on blur. */
  async blur(): Promise<void> {
    return (await this.native()).blur();
  }

  /** Whether the native input has focus. */
  async isFocused(): Promise<boolean> {
    return (await this.native()).isFocused();
  }

  /**
   * Replaces the text as a user would — clear, type, then blur, which is
   * when the editor commits (`valueCommitted`).
   */
  async setValue(text: string): Promise<void> {
    const native = await this.native();
    await native.clear();
    if (text !== '') await native.sendKeys(text);
    await native.blur();
  }

  /** Types without clearing or committing (to test as-you-type behaviour). */
  async typeText(text: string): Promise<void> {
    return (await this.native()).sendKeys(text);
  }

  /** Presses Enter in the input. */
  async pressEnter(): Promise<void> {
    return (await this.native()).sendKeys(TestKey.ENTER);
  }
}

/**
 * Harness for `oge-text-box`.
 *
 * ```ts
 * const name = await loader.getHarness(OgeTextBoxHarness.with({ label: 'Name' }));
 * await name.setValue('Ada');
 * expect(await name.isInvalid()).toBe(false);
 * ```
 */
export class OgeTextBoxHarness extends OgeInputHarnessBase {
  static hostSelector = 'oge-text-box';

  static with(
    options: OgeInputHarnessFilters = {},
  ): HarnessPredicate<OgeTextBoxHarness> {
    return OgeInputHarnessBase.inputPredicate(OgeTextBoxHarness, options);
  }
}

/**
 * Harness for `oge-number-box`. `getValue()` is the formatted text the box
 * shows (locale-dependent — pin the locale in specs).
 */
export class OgeNumberBoxHarness extends OgeInputHarnessBase {
  static hostSelector = 'oge-number-box';

  static with(
    options: OgeInputHarnessFilters = {},
  ): HarnessPredicate<OgeNumberBoxHarness> {
    return OgeInputHarnessBase.inputPredicate(OgeNumberBoxHarness, options);
  }

  /** One step up — ArrowUp in the input, which commits immediately. */
  async increment(): Promise<void> {
    return (await this.native()).sendKeys(TestKey.UP_ARROW);
  }

  /** One step down — ArrowDown in the input, which commits immediately. */
  async decrement(): Promise<void> {
    return (await this.native()).sendKeys(TestKey.DOWN_ARROW);
  }
}

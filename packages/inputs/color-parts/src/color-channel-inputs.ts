import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import {
  applyColorChannelText,
  formatColor,
  hsvaToRgba,
  type OgeColorChannel,
  type OgeHsva,
  type OgeInputsMessages,
} from '@oge-ui/behavior';

/** A working-color change from one of the channel inputs. */
export interface OgeColorChannelChange {
  hsva: OgeHsva;
  event: Event;
}

/**
 * Internal hex + R/G/B (+ alpha percent) inputs shared by the color box panel
 * and the standalone `oge-color-gradient`. Commits on native `change`
 * (blur / Enter), never per keystroke; text that is not a usable value is
 * reverted in place — the parse rules are `applyColorChannelText` from
 * `@oge-ui/behavior`, the same function the React parts run. Projected
 * content (the color box's eyedropper) renders before the fields.
 */
@Component({
  selector: 'oge-color-channel-inputs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-color-box-fields' },
  template: `
    <ng-content />
    <label class="oge-color-box-field oge-color-box-field-hex">
      <input
        class="oge-color-box-channel"
        type="text"
        spellcheck="false"
        autocomplete="off"
        [value]="hexText()"
        [disabled]="disabled()"
        [readOnly]="readonly()"
        [attr.aria-label]="messages().hexInputLabel"
        (change)="onChange('hex', $event)"
        (keydown)="$event.stopPropagation()"
      />
      <span class="oge-color-box-field-tag" aria-hidden="true">HEX</span>
    </label>
    @for (channel of rgbChannels; track channel.key) {
      <label class="oge-color-box-field">
        <input
          class="oge-color-box-channel"
          type="number"
          min="0"
          max="255"
          [value]="rgba()[channel.key]"
          [disabled]="disabled()"
          [readOnly]="readonly()"
          [attr.aria-label]="messages()[channel.label]"
          (change)="onChange(channel.key, $event)"
          (keydown)="$event.stopPropagation()"
        />
        <span class="oge-color-box-field-tag" aria-hidden="true">{{
          channel.tag
        }}</span>
      </label>
    }
    @if (editAlpha()) {
      <label class="oge-color-box-field">
        <input
          class="oge-color-box-channel"
          type="number"
          min="0"
          max="100"
          [value]="alphaPercent()"
          [disabled]="disabled()"
          [readOnly]="readonly()"
          [attr.aria-label]="messages().alphaInputLabel"
          (change)="onChange('a', $event)"
          (keydown)="$event.stopPropagation()"
        />
        <span class="oge-color-box-field-tag" aria-hidden="true">A</span>
      </label>
    }
  `,
  styleUrl: './color-parts.scss',
})
export class OgeColorChannelInputs {
  /** The working color the inputs show. */
  readonly hsva = input.required<OgeHsva>();
  /** Renders the alpha-percent input and an alpha-carrying hex. */
  readonly editAlpha = input(false);
  /** The resolved message catalog (aria labels of the inputs). */
  readonly messages = input.required<OgeInputsMessages>();
  readonly disabled = input(false);
  readonly readonly = input(false);

  readonly changed = output<OgeColorChannelChange>();

  protected readonly rgbChannels = [
    { key: 'r', tag: 'R', label: 'redInputLabel' },
    { key: 'g', tag: 'G', label: 'greenInputLabel' },
    { key: 'b', tag: 'B', label: 'blueInputLabel' },
  ] as const;

  protected readonly rgba = computed(() => hsvaToRgba(this.hsva()));
  protected readonly alphaPercent = computed(() =>
    Math.round(this.hsva().a * 100),
  );
  protected readonly hexText = computed(() =>
    formatColor(this.rgba(), 'hex', this.editAlpha()),
  );

  protected onChange(channel: OgeColorChannel, event: Event): void {
    const element = event.target as HTMLInputElement;
    const next = applyColorChannelText(this.hsva(), channel, element.value);
    if (next === null) {
      // revert — a wrong color is never applied
      element.value =
        channel === 'hex'
          ? this.hexText()
          : channel === 'a'
            ? String(this.alphaPercent())
            : String(this.rgba()[channel]);
      return;
    }
    this.changed.emit({ hsva: next, event });
  }
}

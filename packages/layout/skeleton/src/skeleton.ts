import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { OGE_SKELETON_CONFIG } from './config';
import type { OgeSkeletonAnimation, OgeSkeletonShape } from './skeleton-types';

/**
 * A loading placeholder block — the shimmer the card and the accordion each
 * drew by hand, as one component:
 *
 * ```html
 * <oge-skeleton />
 * <oge-skeleton shape="circle" [width]="40" [height]="40" />
 * <oge-skeleton shape="rectangle" height="120px" />
 * ```
 *
 * Always `aria-hidden` decoration: the meaning belongs to the loading
 * REGION, not the placeholder — put `aria-busy` (and, where the change
 * should be announced, a visually-hidden status text) on the container the
 * skeleton stands in for. Sized by `width`/`height` or by the surrounding
 * CSS; a `text` skeleton with no height derives it from the font.
 */
@Component({
  selector: 'oge-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-skeleton',
    'aria-hidden': 'true',
    '[class.oge-skeleton-circle]': "resolvedShape() === 'circle'",
    '[class.oge-skeleton-rectangle]': "resolvedShape() === 'rectangle'",
    '[class.oge-skeleton-pulse]': "resolvedAnimation() === 'pulse'",
    '[class.oge-skeleton-static]': "resolvedAnimation() === 'none'",
    '[class.oge-skeleton-multi]': 'lineList().length > 0',
    '[style.width]': 'cssSize(width())',
    '[style.height]': 'cssSize(height())',
  },
  template: `
    @for (line of lineList(); track line) {
      <span class="oge-skeleton-line"></span>
    }
  `,
  styleUrl: './skeleton.scss',
})
export class OgeSkeleton {
  private readonly config = inject(OGE_SKELETON_CONFIG);

  /** What the placeholder stands in for. */
  readonly shape = input<OgeSkeletonShape | undefined>(undefined);
  /** `'shimmer'` (default), `'pulse'` or `'none'`. */
  readonly animation = input<OgeSkeletonAnimation | undefined>(undefined);
  /** Numbers mean pixels. */
  readonly width = input<string | number | undefined>(undefined);
  readonly height = input<string | number | undefined>(undefined);
  /**
   * `text` shape only: renders N stacked lines, the last one tapered — the
   * card/accordion placeholder pattern as one input. `1` keeps the single
   * block.
   */
  readonly lines = input(1);

  protected readonly resolvedShape = computed<OgeSkeletonShape>(
    () => this.shape() ?? this.config.shape ?? 'text',
  );
  protected readonly resolvedAnimation = computed<OgeSkeletonAnimation>(
    () => this.animation() ?? this.config.animation ?? 'shimmer',
  );

  protected readonly lineList = computed<readonly number[]>(() => {
    const count = this.lines();
    if (this.resolvedShape() !== 'text' || count <= 1) return [];
    return Array.from({ length: Math.min(count, 20) }, (_, i) => i);
  });

  protected cssSize(value: string | number | undefined): string | null {
    if (value === undefined) return null;
    return typeof value === 'number' ? `${value}px` : value;
  }
}

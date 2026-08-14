'use client';

import type { CSSProperties } from 'react';
import type { OgeSkeletonAnimation, OgeSkeletonShape } from '@oge-ui/behavior';
import { useOgeSkeletonConfig } from './layout-config';

export interface OgeSkeletonProps {
  /** What the placeholder stands in for. */
  shape?: OgeSkeletonShape;
  /** `'shimmer'` (default), `'pulse'` or `'none'`. */
  animation?: OgeSkeletonAnimation;
  /** Numbers mean pixels. */
  width?: string | number;
  height?: string | number;
  /**
   * `text` shape only: renders N stacked lines, the last one tapered — the
   * card/accordion placeholder pattern as one prop. `1` keeps the single
   * block.
   */
  lines?: number;
  className?: string;
  style?: CSSProperties;
}

/** Numbers mean pixels; strings pass through as authored. */
function cssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * A loading placeholder block — the React render of the Angular
 * `<oge-skeleton>`:
 *
 * ```tsx
 * <OgeSkeleton />
 * <OgeSkeleton shape="circle" width={40} height={40} />
 * <OgeSkeleton shape="rectangle" height="120px" />
 * ```
 *
 * Always `aria-hidden` decoration: the meaning belongs to the loading
 * REGION, not the placeholder — put `aria-busy` (and, where the change should
 * be announced, a visually-hidden status text) on the container the skeleton
 * stands in for.
 */
export function OgeSkeleton(props: OgeSkeletonProps) {
  const config = useOgeSkeletonConfig();
  const shape = props.shape ?? config.shape ?? 'text';
  const animation = props.animation ?? config.animation ?? 'shimmer';
  const lines = props.lines ?? 1;
  const lineList =
    shape === 'text' && lines > 1
      ? Array.from({ length: Math.min(lines, 20) }, (_, i) => i)
      : [];

  const className = [
    'oge-skeleton',
    shape === 'circle' && 'oge-skeleton-circle',
    shape === 'rectangle' && 'oge-skeleton-rectangle',
    animation === 'pulse' && 'oge-skeleton-pulse',
    animation === 'none' && 'oge-skeleton-static',
    lineList.length > 0 && 'oge-skeleton-multi',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        width: cssSize(props.width),
        height: cssSize(props.height),
        ...props.style,
      }}
    >
      {lineList.map((line) => (
        <span className="oge-skeleton-line" key={line}></span>
      ))}
    </span>
  );
}

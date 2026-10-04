'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  chartLabelTemplateBox,
  type OgeChartRenderLabel,
} from '@oge-ui/charts-engine';

/**
 * One data label of any chart: the engine-placed `<text>`, or — with a
 * `renderLabel` prop — the custom markup inside a 120 × 22 px
 * `foreignObject` at the same spot (the `*ogeChartLabelTemplate` twin).
 * The cartesian chart passes the frame's `anchor` / `baseline` /
 * `transform`, which keep the label upright inside a rotated plot.
 */
export function ChartDataLabel({
  label,
  render,
  className = 'oge-chart-point-label',
  anchor,
  baseline,
  transform,
}: {
  readonly label: OgeChartRenderLabel;
  readonly render?: (label: OgeChartRenderLabel) => ReactNode;
  readonly className?: string;
  readonly anchor?: 'start' | 'middle' | 'end';
  readonly baseline?: 'central' | null;
  readonly transform?: string | null;
}): ReactElement {
  if (render !== undefined) {
    const box = chartLabelTemplateBox(label);
    return (
      <foreignObject
        className="oge-chart-label-fo"
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        transform={transform ?? undefined}
      >
        {render(label)}
      </foreignObject>
    );
  }
  return (
    <text
      className={
        label.inside ? `${className} oge-chart-point-label-inside` : className
      }
      x={label.x}
      y={label.y}
      textAnchor={anchor ?? label.anchor}
      dominantBaseline={baseline ?? undefined}
      transform={transform ?? undefined}
      style={label.textColor ? { fill: label.textColor } : undefined}
    >
      {label.text}
    </text>
  );
}

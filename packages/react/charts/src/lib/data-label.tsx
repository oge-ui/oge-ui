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
 */
export function ChartDataLabel({
  label,
  render,
  className = 'oge-chart-point-label',
}: {
  readonly label: OgeChartRenderLabel;
  readonly render?: (label: OgeChartRenderLabel) => ReactNode;
  readonly className?: string;
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
      >
        {render(label)}
      </foreignObject>
    );
  }
  return (
    <text
      className={
        label.inside
          ? `${className} oge-chart-point-label-inside`
          : className
      }
      x={label.x}
      y={label.y}
      textAnchor={label.anchor}
      style={label.textColor ? { fill: label.textColor } : undefined}
    >
      {label.text}
    </text>
  );
}

'use client';

import type { ReactElement } from 'react';
import type { OgeChartColorScaleLegend } from '@oge-ui/charts-engine';

/**
 * The colour-scale legend of the heatmap, the treemap and the map — the
 * twin of Angular's internal `oge-chart-color-legend` (same markup).
 */
export function ChartColorLegend({
  legend,
  label,
  rtl = false,
}: {
  readonly legend: OgeChartColorScaleLegend;
  readonly label: string;
  readonly rtl?: boolean;
}): ReactElement {
  return (
    <div className="oge-chart-color-legend" role="img" aria-label={label}>
      {legend.type === 'linear' ? (
        <>
          <div
            className="oge-chart-color-bar"
            style={{ background: rtl ? legend.gradientRtl : legend.gradient }}
          />
          <div className="oge-chart-color-ticks">
            {legend.ticks.map((tick, index) => (
              <span
                key={index}
                className="oge-chart-color-tick"
                style={{ insetInlineStart: `${tick.offset * 100}%` }}
              >
                {tick.text}
              </span>
            ))}
          </div>
        </>
      ) : (
        <ul className="oge-chart-color-segments">
          {legend.segments.map((segment, index) => (
            <li key={index} className="oge-chart-color-segment">
              <span
                className="oge-chart-legend-marker"
                style={{ background: segment.color }}
              />
              {segment.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The drill-down path of the treemap and the sunburst (Angular's `oge-chart-breadcrumb`). */
export function ChartBreadcrumb({
  crumbs,
  label,
  onCrumbClick,
}: {
  readonly crumbs: readonly { readonly key: string; readonly name: string }[];
  readonly label: string;
  readonly onCrumbClick: (key: string) => void;
}): ReactElement {
  return (
    <div className="oge-chart-breadcrumb-host">
      <nav className="oge-chart-breadcrumb" aria-label={label}>
        <ol>
          {crumbs.map((crumb, index) => (
            <li key={crumb.key}>
              {index === crumbs.length - 1 ? (
                <span
                  className="oge-chart-breadcrumb-current"
                  aria-current="page"
                >
                  {crumb.name}
                </span>
              ) : (
                <button
                  type="button"
                  className="oge-chart-breadcrumb-btn"
                  onClick={() => onCrumbClick(crumb.key)}
                >
                  {crumb.name}
                </button>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

/** A screen-reader table whose `headers` include the row-header column. */
export function ChartSrTable({
  caption,
  table,
}: {
  readonly caption: string;
  readonly table: {
    readonly headers: readonly string[];
    readonly rows: readonly {
      readonly argText: string;
      readonly cells: readonly string[];
    }[];
  };
}): ReactElement {
  return (
    <table className="oge-chart-sr-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {table.headers.map((header, index) => (
            <th key={index} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            <th scope="row">{row.argText}</th>
            {row.cells.map((cell, index) => (
              <td key={index}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The gauges' / bullet's header-cell table. */
export function ChartSrRows({
  caption,
  rows,
}: {
  readonly caption: string;
  readonly rows: readonly { readonly header: string; readonly cell: string }[];
}): ReactElement {
  return (
    <table className="oge-chart-sr-table">
      <caption>{caption}</caption>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <th scope="row">{row.header}</th>
            <td>{row.cell}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One axis / tick label `<text>`. */
export function ChartTick({
  tick,
  minor,
}: {
  readonly tick: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  };
  readonly minor?: boolean;
}): ReactElement {
  return (
    <line
      className={
        minor ? 'oge-gauge-tick oge-gauge-tick-minor' : 'oge-gauge-tick'
      }
      x1={tick.x1}
      y1={tick.y1}
      x2={tick.x2}
      y2={tick.y2}
    />
  );
}

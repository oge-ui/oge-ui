import type { OgeExportCellStyle, OgeExportCellStyleArgs } from '@oge-ui/grid';
import type { Employee } from '../../shared/demo-data';

/**
 * The conditional-formatting rule both export demos (Angular and React)
 * share: salaries above €8,000 export highlighted in Excel and PDF.
 */
export function salaryCellStyle({
  column,
  value,
  kind,
}: OgeExportCellStyleArgs<Employee>): OgeExportCellStyle | undefined {
  return kind === 'data' && column.field === 'salary' && Number(value) > 8000
    ? { background: '#fff4ce', color: '#7a4b00', bold: true }
    : undefined;
}

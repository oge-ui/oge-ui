import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeChat } from '@oge-ui/ai';
import { OgeSpreadsheet } from '@oge-ui/spreadsheet';
import {
  createOgeWorkbook,
  type OgeWorkbook,
} from '@oge-ui/spreadsheet-engine';
import type { SsrFamily } from './family';

/** The families `apps/ssr-smoke` does not server-render. */

function workbook(): OgeWorkbook {
  const book = createOgeWorkbook();
  const sheet = book.sheets[0];
  sheet.setCell(0, 0, { value: 'Region' });
  sheet.setCell(0, 1, { value: 'Sales' });
  sheet.setCell(1, 0, { value: 'North' });
  sheet.setCell(1, 1, { value: 1250 });
  return book;
}

@Component({
  selector: 'compat-spreadsheet-host',
  imports: [OgeSpreadsheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<oge-spreadsheet
    [workbook]="book"
    style="display: block; width: 480px; height: 200px"
  />`,
})
class SpreadsheetHost {
  protected readonly book = workbook();
}

@Component({
  selector: 'compat-ai-host',
  imports: [OgeChat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<oge-chat [suggestions]="['Summarise the quarter']" />`,
})
class AiHost {}

export const SPREADSHEET: SsrFamily = {
  name: 'spreadsheet',
  host: SpreadsheetHost,
  expect: ['oge-spreadsheet-grid', 'Sheet1'],
};

export const AI: SsrFamily = {
  name: 'ai',
  host: AiHost,
  expect: ['oge-chat', 'Summarise the quarter'],
};

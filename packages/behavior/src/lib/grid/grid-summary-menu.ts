import type { OgeUserSummaryType, SummaryType } from '@oge-ui/core';
import type { OgeMenuItem } from '../menu/menu-types';
import type { OgeDataType } from './grid-columns';
import type { OgeGridMessages } from './grid-config';

/**
 * The column summary picker of the header menu (`summaryMenu`), shared by
 * both grid render layers: Count for every column, Sum / Average / Min / Max
 * for numbers. The pick replaces the column's declared `totalSummary`, is
 * part of the persisted state and — sent as `LoadOptions.totalSummary` — is
 * computed over the whole filtered set, by the server in remote mode.
 */

/** The aggregates the picker offers for a data type. */
export function ogeSummaryMenuChoices(
  dataType: OgeDataType,
): readonly Exclude<SummaryType, 'custom'>[] {
  return dataType === 'number'
    ? ['count', 'sum', 'avg', 'min', 'max']
    : ['count'];
}

/** Options of {@link ogeSummaryMenuItem}. */
export interface OgeSummaryMenuOptions {
  readonly dataType: OgeDataType;
  /** The current pick; `undefined` follows the column's declared totals. */
  readonly current: OgeUserSummaryType | undefined;
  readonly messages: Pick<
    OgeGridMessages,
    'summaryMenu' | 'summaryNone' | 'summaryDefault' | 'summaryLabels'
  >;
  /** Applies a pick; `null` returns to the declared totals. */
  readonly select: (type: OgeUserSummaryType | null) => void;
}

/** The "Summary" submenu: radio rows for default, none and each aggregate. */
export function ogeSummaryMenuItem(
  options: OgeSummaryMenuOptions,
): OgeMenuItem {
  const { current, messages, select } = options;
  const radio = (
    text: string,
    checked: boolean,
    pick: OgeUserSummaryType | null,
  ): OgeMenuItem => ({
    text,
    type: 'radio',
    group: 'oge-grid-summary',
    checked,
    action: () => select(pick),
  });
  return {
    text: messages.summaryMenu,
    items: [
      radio(messages.summaryDefault, current === undefined, null),
      radio(messages.summaryNone, current === 'none', 'none'),
      ...ogeSummaryMenuChoices(options.dataType).map((type) =>
        radio(messages.summaryLabels[type], current === type, type),
      ),
    ],
  };
}

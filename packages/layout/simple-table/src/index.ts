// @oge-ui/layout/simple-table — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeSimpleTable } from './simple-table';
export {
  OgeSimpleTableEmpty,
  OgeSimpleTableFooter,
  OgeSimpleTableHeader,
  OgeSimpleTableRow,
  type OgeSimpleTableRowContext,
  type OgeSimpleTableSectionContext,
} from './templates';
export {
  OGE_DEFAULT_SIMPLE_TABLE_CONFIG,
  OGE_DEFAULT_SIMPLE_TABLE_MESSAGES,
  OGE_SIMPLE_TABLE_CONFIG,
  provideOgeSimpleTableConfig,
  type OgeSimpleTableConfig,
  type OgeSimpleTableConfigInput,
  type OgeSimpleTableMessages,
} from './config';
export type {
  OgeSimpleTableAlign,
  OgeSimpleTableColumn,
  OgeSimpleTableResolvedColumn,
} from '@oge-ui/behavior';

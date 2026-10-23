// @oge-ui/spreadsheet-engine — the framework-free, DOM-free engine of the
// OGE UI Spreadsheet (ADR 0005). Explicit named exports only (house rule).
// The ZIP and XML layers under lib/zip and lib/xml are internal: the xlsx
// codec built on them is the public surface.

export {
  OGE_SHEET_MAX_COLUMNS,
  OGE_SHEET_MAX_ROWS,
  formatOgeCellAddress,
  formatOgeR1C1Address,
  formatOgeRangeAddress,
  isOgeCellInSheet,
  ogeCellRange,
  ogeColumnIndex,
  ogeColumnName,
  ogeOffsetCellAddress,
  ogeQuoteSheetName,
  ogeRangeBoundingBox,
  ogeRangeContains,
  ogeRangeContainsRange,
  ogeRangeFromCorners,
  ogeRangeIntersection,
  ogeRangeSize,
  ogeRangesIntersect,
  ogeSheetNameNeedsQuotes,
  parseOgeCellAddress,
  parseOgeR1C1Address,
  parseOgeRangeAddress,
  type OgeCellAddress,
  type OgeCellRef,
  type OgeRangeAddress,
  type OgeReferenceKind,
  type OgeSheetRange,
} from './lib/address/address';

export {
  OGE_MAX_DATE_SERIAL,
  ogeCivilFromDays,
  ogeDatePartsToSerial,
  ogeDateToSerial,
  ogeDaysFromCivil,
  ogeSerialToDate,
  ogeSerialToDateParts,
  ogeSerialWeekday,
  type OgeDateInput,
  type OgeDateParts,
  type OgeDateSystem,
  type OgeDateZone,
} from './lib/date/date-serial';

export {
  OGE_INDEXED_COLORS,
  OGE_OFFICE_THEME_COLORS,
  OGE_THEME_COLOR_SLOTS,
  ogeApplyTint,
  resolveOgeColor,
  type OgeColor,
  type OgeColorContext,
  type OgeThemeColorSlot,
  type OgeThemeColors,
} from './lib/color/color';

export {
  OGE_DEFAULT_BASE_COLUMN_WIDTH,
  OGE_DEFAULT_MAX_DIGIT_WIDTH,
  OGE_DEFAULT_ROW_HEIGHT_POINTS,
  ogeColumnCharactersToWidth,
  ogeColumnWidthToCharacters,
  ogeColumnWidthToPixels,
  ogeDefaultColumnWidthPixels,
  ogePixelsToColumnCharacters,
  ogePixelsToColumnWidth,
  ogePixelsToPoints,
  ogePointsToPixels,
} from './lib/metrics/sheet-metrics';

export {
  OGE_EN_US_FORMAT_LOCALE,
  ogeFormatLocale,
  ogeLcidToLocaleTag,
  type OgeFormatLocale,
} from './lib/format/format-locale';

export { OGE_GENERAL_MAX_CHARS, formatOgeGeneral } from './lib/format/general';

export {
  compileOgeNumberFormat,
  formatOgeCellValue,
  isOgeDateFormat,
  ogeBuiltinNumberFormat,
  type OgeFormatCondition,
  type OgeFormattableValue,
  type OgeFormattedValue,
  type OgeNumberFormat,
  type OgeNumberFormatOptions,
} from './lib/format/number-format';

export {
  OGE_CELL_ERROR_CODES,
  isOgeCellEmpty,
  isOgeCellError,
  isOgeRichText,
  ogeCellError,
  ogeCellValueType,
  ogeRichText,
  ogeRichTextToString,
  parseOgeCellErrorCode,
  type OgeCell,
  type OgeCellError,
  type OgeCellErrorCode,
  type OgeCellValue,
  type OgeCellValueType,
  type OgeRichText,
  type OgeTextRun,
} from './lib/model/cell';

export {
  OGE_DEFAULT_CELL_STYLE,
  OgeStyleRegistry,
  type OgeAlignment,
  type OgeBorder,
  type OgeBorderEdge,
  type OgeBorderStyle,
  type OgeCellStyle,
  type OgeFill,
  type OgeFont,
  type OgeGradientFill,
  type OgeGradientStop,
  type OgeHorizontalAlignment,
  type OgePatternFill,
  type OgePatternType,
  type OgeProtection,
  type OgeUnderline,
  type OgeVerticalAlignment,
} from './lib/model/style';

export {
  OGE_DEFAULT_SHEET_FORMAT,
  OGE_DEFAULT_SHEET_VIEW,
  OgeWorksheet,
  ogeCellKey,
  type OgeColumnInfo,
  type OgeColumnSpan,
  type OgeRowInfo,
  type OgeSheetFormat,
  type OgeSheetOutline,
  type OgeSheetState,
  type OgeSheetView,
} from './lib/model/worksheet';

export type {
  OgeAutoFilter,
  OgeColorScale,
  OgeConditionalFormat,
  OgeConditionalRule,
  OgeConditionalRuleType,
  OgeConditionalValue,
  OgeDataBar,
  OgeDataValidation,
  OgeHyperlink,
  OgeIconSet,
  OgeNote,
  OgePageSetup,
  OgePicture,
  OgePictureAnchor,
  OgePictureCorner,
  OgeSheetPassthrough,
  OgeSheetProtection,
} from './lib/model/sheet-features';

export type {
  OgeChartAxis,
  OgeChartCategories,
  OgeChartDataLabels,
  OgeChartFont,
  OgeChartGroup,
  OgeChartKind,
  OgeChartLegend,
  OgeChartMarker,
  OgeChartModel,
  OgeChartNumbers,
  OgeChartSeries,
  OgeChartShape,
  OgeChartText,
  OgeChartTitle,
  OgeSheetChart,
} from './lib/model/chart';

export type {
  OgeSparkline,
  OgeSparklineAxisScale,
  OgeSparklineColors,
  OgeSparklineEmptyCells,
  OgeSparklineGroup,
  OgeSparklineType,
} from './lib/model/sparkline';

export type {
  OgeTable,
  OgeTableColumn,
  OgeTableStyle,
  OgeTableStyleElement,
  OgeTableStyleElementType,
  OgeTableStyleInfo,
} from './lib/model/table';

export {
  OGE_BUILTIN_TABLE_STYLE_NAMES,
  OGE_TABLE_STYLE_ELEMENT_TYPES,
  ogeBuiltinTableStyle,
  ogeTableStyleFormats,
  type OgeTableStyleFormat,
  type OgeTableStyleFormats,
} from './lib/model/table-styles';

export {
  OGE_DEFAULT_FONT,
  OGE_DEFINED_NAME_MAX_LENGTH,
  OGE_SHEET_NAME_MAX_LENGTH,
  OgeWorkbook,
  createOgeWorkbook,
  validateOgeDefinedName,
  validateOgeSheetName,
  type OgeCalculationSettings,
  type OgeDefinedName,
  type OgeDefinedNameProblem,
  type OgeOpaquePart,
  type OgeSheetNameProblem,
  type OgeWorkbookOptions,
  type OgeWorkbookProperties,
} from './lib/model/workbook';

export {
  OgeXlsxError,
  readOgeXlsx,
  readOgeXlsxSync,
  type OgeXlsxErrorCode,
  type OgeXlsxReadOptions,
  type OgeXlsxReadResult,
  type OgeXlsxSource,
} from './lib/codec/read-xlsx';

export type {
  OgeImportIssue,
  OgeImportIssueCode,
  OgeImportIssueSeverity,
} from './lib/codec/import-issues';

export { ogeDisplayFormula, ogeShiftFormula } from './lib/codec/formula-text';

export {
  ogeColumnPadding,
  ogeFontMetrics,
  ogeFontPixelSize,
  ogeHasFontMetrics,
  type OgeFontMetrics,
} from './lib/metrics/font-metrics';

export { OgeAxis } from './lib/paint/axis';

export {
  OgeStyleResolver,
  ogeBorderRank,
  ogeFontFamily,
  ogePatternTile,
  type OgePaintEdge,
  type OgePaintFill,
  type OgePaintFont,
  type OgeResolvedStyle,
  type OgeStyleResolverOptions,
} from './lib/paint/resolve-style';

export {
  OGE_ESTIMATING_MEASURER,
  ogeCellDisplay,
  ogeHashFill,
  type OgeCellDisplay,
  type OgeCellDisplayOptions,
  type OgeDisplayKind,
  type OgePaintAlignment,
  type OgeTextMeasurer,
} from './lib/paint/cell-text';

export {
  OgeSheetLayout,
  ogeWrapText,
  type OgeSheetLayoutOptions,
  type OgeZoomedAxes,
} from './lib/paint/sheet-layout';

export {
  ogeFontDescent,
  ogeFontLine,
  ogeIndentPixels,
  ogeLineTop,
  ogePaintWindow,
  ogeTextMargin,
  type OgeConditionalPaint,
  type OgeConditionalPainter,
  type OgePaintCell,
  type OgePaintWindowOptions,
  type OgeSparklinePainter,
  type OgeTableCellStyle,
  type OgeTablePainter,
} from './lib/paint/paint-window';

export { OgeTableFormatter } from './lib/paint/table-format';

export {
  ogeDrawSparkline,
  ogeSparklineAxis,
  type OgeSparklineDrawing,
  type OgeSparklineMarker,
  type OgeSparklinePaintColors,
  type OgeSparklineRect,
  type OgeSparklineSpec,
  type OgeSparklineValue,
} from './lib/paint/sparkline';

export { OgeSparklineFormatter } from './lib/paint/sparkline-format';

export {
  OgeConditionalFormatter,
  ogeConditionalConstant,
  ogeConditionalRuleSupported,
  type OgeConditionalFormatterOptions,
} from './lib/paint/conditional';

export {
  ogeAnchorBox,
  ogePlaceCharts,
  ogePlacePictures,
  type OgePaintBox,
  type OgePaintChart,
  type OgePaintPicture,
} from './lib/paint/pictures';

export { ogeCreateCanvasMeasurer } from './lib/paint/canvas-measurer';

export {
  ogeZoomFont,
  ogeZoomOffset,
  ogeZoomPaint,
  ogeZoomPictures,
} from './lib/paint/zoom';

export {
  ogeBorderStrokes,
  ogeGridlinePath,
  type OgeDrawPane,
  type OgeStroke,
} from './lib/paint/draw';

export {
  createPlainSpreadsheetReactivity,
  type OgeSpreadsheetReactiveCell,
  type OgeSpreadsheetReactivity,
} from './lib/view/reactivity';

export {
  OGE_DEFAULT_SPREADSHEET_MESSAGES,
  resolveOgeSpreadsheetMessages,
  type OgeSpreadsheetMessages,
} from './lib/view/messages';

export {
  OGE_DEFAULT_SPREADSHEET_CONFIG,
  resolveOgeSpreadsheetConfig,
  type OgeSpreadsheetConfig,
  type OgeSpreadsheetConfigInput,
} from './lib/view/config';

export {
  ogeCellSelection,
  ogeCurrentRegion,
  ogeDataEdge,
  ogeExpandToMerges,
  ogeLastCell,
  ogeMoveCell,
  ogeOwnerCell,
  ogeSelectionContains,
  ogeSpanRange,
  type OgeSheetSelection,
} from './lib/view/navigation';

export {
  ogeCellText,
  ogeCopyRange,
  ogePrintTable,
  type OgeClipboardContent,
  type OgePrintCell,
  type OgePrintTable,
} from './lib/view/clipboard';

export {
  ogeCellAt,
  ogeCellBox,
  ogeRangeBox,
  ogeRevealScroll,
  ogeScrollToCell,
  ogeSheetHeaders,
  ogeViewportPanes,
  type OgeBox,
  type OgeIndexSpan,
  type OgeOutlineGutters,
  type OgeSheetHeaders,
  type OgeViewportInput,
  type OgeViewportPanes,
} from './lib/view/viewport';

export {
  OGE_OUTLINE_LEVEL_SIZE,
  ogeApplyOutlineEdit,
  ogeAxisOutline,
  ogeOutlineGutter,
  ogeOutlineLevel,
  ogeOutlineToggle,
  type OgeAxisOutline,
  type OgeOutlineChange,
  type OgeOutlineEdit,
  type OgeOutlineGroup,
  type OgeOutlineSummaryChange,
} from './lib/view/outline';

export {
  ogeSelectionSummary,
  type OgeSelectionSummary,
} from './lib/view/summary';

export {
  ogeFontCss,
  ogeHeaderCells,
  ogeRenderPane,
  ogeSelectionShapes,
  type OgeCss,
  type OgeHeaderCell,
  type OgePaneKey,
  type OgeRenderFill,
  type OgeRenderMark,
  type OgeRenderPane,
  type OgeRenderPaneInput,
  type OgeRenderSpan,
  type OgeRenderText,
  type OgeSelectionShapes,
} from './lib/view/render';

export {
  OGE_ICON_SETS,
  ogeIconParts,
  type OgeIconPart,
} from './lib/view/icons';

export {
  ogeChartLabel,
  ogeChartPalette,
  ogeChartScale,
  ogeChartView,
  type OgeChartPathMark,
  type OgeChartScale,
  type OgeChartTextMark,
  type OgeChartViewInput,
  type OgeSpreadsheetChartView,
} from './lib/view/chart-view';

export {
  ogeFindAll,
  ogeFindPattern,
  type OgeFindMatch,
  type OgeFindOptions,
} from './lib/view/find';

export {
  ogeGridView,
  ogeHeaderMarks,
  ogeHeaderStrips,
  ogeOutlineLevelButtons,
  ogeOutlineMarks,
  ogeOutlineStrips,
  ogeNoteBoxes,
  ogePaneCharts,
  ogePanePictures,
  ogePaneStyle,
  ogePointerCell,
  ogeSliderToZoom,
  ogeTabKeyTarget,
  ogeZoomToSlider,
  type OgeGridHeaderTarget,
  type OgeGridPane,
  type OgeGridPointerPoint,
  type OgeGridView,
  type OgeGridViewInput,
  type OgeHeaderMark,
  type OgeHeaderStrip,
  type OgeOutlineLevelButton,
  type OgeOutlineMark,
  type OgeOutlineStrip,
  type OgeNoteBox,
  type OgeNoteRun,
  type OgePaneChart,
  type OgePanePicture,
  type OgeScrollPosition,
} from './lib/view/grid-view';

export {
  OgeObjectUrls,
  ogeFetchWorkbook,
  ogeGridHeaderAt,
  ogeGridPoint,
  ogeOpenLink,
  ogePrintSheetTable,
  ogeScrollEdges,
  ogeWriteClipboard,
  type OgeScrollEdges,
} from './lib/view/browser';

export type {
  OgeSpreadsheetCellClickEvent,
  OgeSpreadsheetHyperlinkClickEvent,
  OgeSpreadsheetLoadedEvent,
  OgeSpreadsheetLoadErrorEvent,
  OgeSpreadsheetSelectionChangeEvent,
  OgeSpreadsheetSource,
} from './lib/view/events';

export {
  OgeSpreadsheetCore,
  type OgeFindState,
  type OgeFormulaBarContent,
  type OgeGridClick,
  type OgeGridPointerInput,
  type OgeHyperlinkAction,
  type OgeRevealRequest,
  type OgeSpreadsheetCoreOptions,
  type OgeSpreadsheetKeyAction,
  type OgeSpreadsheetKeyInput,
  type OgeSpreadsheetMenuItem,
  type OgeSpreadsheetMenuKeyAction,
  type OgeSpreadsheetMenuKind,
  type OgeSpreadsheetMenuState,
  type OgeSpreadsheetPage,
  type OgeSpreadsheetStatus,
  type OgeSpreadsheetTab,
  type OgeStatusItem,
} from './lib/view/core';

export { ogeCheckSpreadsheetLicense } from './lib/license';

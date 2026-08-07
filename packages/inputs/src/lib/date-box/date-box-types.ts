/** What the editor edits: a day, a time of day, or both. */
export type OgeDateBoxType = 'date' | 'time' | 'datetime';

/** Picker commit policy: on pick, or via the OK/Cancel footer. */
export type OgeDateBoxApplyValueMode = 'instantly' | 'useButtons';

/** Display text: `Intl.DateTimeFormatOptions` or a custom formatter. */
export type OgeDateBoxDisplayFormat =
  Intl.DateTimeFormatOptions | ((date: Date) => string);

/** Time picker layout: one interval list, or hour + minute columns. */
export type OgeDateBoxTimeView = 'list' | 'columns';

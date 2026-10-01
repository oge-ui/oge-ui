import { OGE_DEFAULT_GRID_MESSAGES, type OgeGridMessages } from './grid-config';
import {
  OgeGridAnnouncements,
  rowCountText,
  sortChangeText,
  type OgeGridAnnouncementSnapshot,
} from './grid-announcements';

const base: OgeGridAnnouncementSnapshot = {
  sort: [],
  filterKey: '[]',
  resultToken: 1,
  loading: false,
  rowCount: 20,
  paging: true,
  pageIndex: 0,
  pageCount: 4,
};

function setup(
  options: { enabled?: boolean; messages?: Partial<OgeGridMessages> } = {},
) {
  const spoken: { text: string; politeness?: string; delay?: number }[] = [];
  let enabled = options.enabled ?? true;
  const announcements = new OgeGridAnnouncements({
    announce: (text, opts) =>
      spoken.push({ text, politeness: opts?.politeness, delay: opts?.delay }),
    messages: () => ({ ...OGE_DEFAULT_GRID_MESSAGES, ...options.messages }),
    enabled: () => enabled,
    caption: (field) => field.toUpperCase(),
  });
  return {
    announcements,
    spoken,
    texts: () => spoken.map((entry) => entry.text),
    setEnabled: (value: boolean) => (enabled = value),
  };
}

describe('OgeGridAnnouncements', () => {
  it('says nothing for the baseline snapshot', () => {
    const { announcements, spoken } = setup();
    announcements.observe({ ...base, sort: [{ field: 'name', dir: 'asc' }] });
    expect(spoken).toEqual([]);
  });

  it('announces sort direction changes and clearing', () => {
    const { announcements, texts } = setup();
    announcements.observe(base);
    announcements.observe({ ...base, sort: [{ field: 'name', dir: 'asc' }] });
    announcements.observe({ ...base, sort: [{ field: 'name', dir: 'desc' }] });
    announcements.observe(base);
    expect(texts()).toEqual([
      'Sorted by NAME, ascending',
      'Sorted by NAME, descending',
      'Sort cleared',
    ]);
  });

  it('names the newly added key of a multi-column sort', () => {
    const { announcements, texts } = setup();
    announcements.observe({ ...base, sort: [{ field: 'a', dir: 'asc' }] });
    announcements.observe({
      ...base,
      sort: [
        { field: 'a', dir: 'asc' },
        { field: 'b', dir: 'desc' },
      ],
    });
    expect(texts()).toEqual(['Sorted by B, descending']);
  });

  it('waits for the new result before speaking the filter count, debounced', () => {
    const { announcements, spoken } = setup();
    announcements.observe(base);
    // the filter changed, the old result is still on screen
    announcements.observe({ ...base, filterKey: '["x"]', loading: true });
    expect(spoken).toEqual([]);
    announcements.observe({
      ...base,
      filterKey: '["x"]',
      resultToken: 2,
      rowCount: 3,
    });
    expect(spoken).toEqual([
      { text: '3 rows', politeness: undefined, delay: 500 },
    ]);
  });

  it('uses the singular form for one row and the catalog override', () => {
    expect(rowCountText(OGE_DEFAULT_GRID_MESSAGES, 1)).toBe('1 row');
    expect(rowCountText(OGE_DEFAULT_GRID_MESSAGES, 0)).toBe('0 rows');
    const { announcements, texts } = setup({
      messages: { rowCountAnnouncement: '{count} satır' },
    });
    announcements.observe(base);
    announcements.observe({
      ...base,
      filterKey: 'search',
      resultToken: 2,
      rowCount: 7,
    });
    expect(texts()).toEqual(['7 satır']);
  });

  it('announces page changes but not the reset a filter causes', () => {
    const { announcements, texts } = setup();
    announcements.observe(base);
    announcements.observe({ ...base, pageIndex: 1 });
    expect(texts()).toEqual(['Page 2 of 4']);
    announcements.observe({
      ...base,
      pageIndex: 0,
      filterKey: 'f',
      loading: true,
    });
    announcements.observe({
      ...base,
      pageIndex: 0,
      filterKey: 'f',
      resultToken: 9,
      rowCount: 5,
      pageCount: 1,
    });
    expect(texts()).toEqual(['Page 2 of 4', '5 rows']);
  });

  it('skips page announcements while paging is off', () => {
    const { announcements, spoken } = setup();
    announcements.observe({ ...base, paging: false });
    announcements.observe({ ...base, paging: false, pageIndex: 1 });
    expect(spoken).toEqual([]);
  });

  it('action announcements use the catalog patterns', () => {
    const { announcements, spoken } = setup();
    announcements.groupToggled('Germany', true);
    announcements.groupToggled('Germany', false);
    announcements.rowToggled('Engineering', true);
    announcements.rowToggled('Engineering', false);
    announcements.selectionCount(42);
    announcements.validationFailed('Name', 'This field is required');
    expect(spoken.map((entry) => entry.text)).toEqual([
      'Group Germany expanded',
      'Group Germany collapsed',
      'Engineering expanded',
      'Engineering collapsed',
      '42 rows selected',
      'Name: This field is required',
    ]);
    expect(spoken.at(-1)?.politeness).toBe('assertive');
  });

  it('stays silent when disabled, and keeps tracking state meanwhile', () => {
    const { announcements, spoken, setEnabled } = setup({ enabled: false });
    announcements.observe(base);
    announcements.observe({ ...base, sort: [{ field: 'a', dir: 'asc' }] });
    announcements.groupToggled('x', true);
    announcements.selectionCount(3);
    announcements.validationFailed('a', 'b');
    expect(spoken).toEqual([]);
    setEnabled(true);
    // the sort above is the baseline now — no stale replay
    announcements.observe({ ...base, sort: [{ field: 'a', dir: 'asc' }] });
    expect(spoken).toEqual([]);
  });
});

describe('sortChangeText', () => {
  it('returns null when the sort did not change', () => {
    const sort = [{ field: 'a', dir: 'asc' as const }];
    expect(
      sortChangeText(sort, [...sort], OGE_DEFAULT_GRID_MESSAGES, String),
    ).toBeNull();
  });

  it('interpolates {column} into the cleared message when the pattern asks for it', () => {
    expect(
      sortChangeText(
        [{ field: 'name', dir: 'asc' }],
        [],
        {
          ...OGE_DEFAULT_GRID_MESSAGES,
          sortClearedAnnouncement: 'Sort removed from {column}',
        },
        () => 'Name',
      ),
    ).toBe('Sort removed from Name');
  });
});

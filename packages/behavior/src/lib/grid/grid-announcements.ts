import type { SortDescriptor } from '@oge-ui/core';
import type { OgeLiveAnnounceOptions } from '../a11y/live-announcer';
import { formatPattern } from '../input/error-messages';
import type { OgeGridMessages } from './grid-config';

/** Where announcements go — the render layer's live announcer. */
export type OgeGridAnnounceSink = (
  message: string,
  options?: OgeLiveAnnounceOptions,
) => void;

/**
 * The slice of grid / tree-list state the announcer diffs. The host builds it
 * once per change (Angular from an `effect()`, React from a `useEffect`).
 */
export interface OgeGridAnnouncementSnapshot {
  /** Sort descriptors in priority order. */
  sort: readonly SortDescriptor[];
  /** Anything that changes the filtered set — filter expressions plus search text, serialized. */
  filterKey: string;
  /**
   * Changes whenever a new load result arrived (the result object itself, a
   * window total…). A filter's count is spoken only once this moved past the
   * value it had when the filter changed, so a stale count is never read out.
   */
  resultToken: unknown;
  /** A load is in flight. */
  loading: boolean;
  /** Row count of the filtered set, across all pages. */
  rowCount: number;
  /** Whether paging is on — page announcements are skipped otherwise. */
  paging: boolean;
  /** Zero-based page index. */
  pageIndex: number;
  /** Number of pages. */
  pageCount: number;
}

export interface OgeGridAnnouncementsDeps {
  announce: OgeGridAnnounceSink;
  messages: () => OgeGridMessages;
  /** The `announcements` input / config — when `false` nothing is spoken. */
  enabled: () => boolean;
  /** Display caption of a field, for the sort announcement. */
  caption: (field: string) => string;
  /** Debounce of the filter result count in ms (default `500`). */
  countDelay?: () => number;
}

/**
 * The grid family's announcement rules, shared by the Angular and React grid
 * and tree list (ADR 0001): what changed, which catalog message describes it,
 * and when it is safe to speak.
 *
 * State-driven announcements (sort, filter/search result count, page) come
 * from {@link observe}, which diffs consecutive snapshots — the first call is
 * the baseline and says nothing. Action-driven ones (group/row expansion,
 * select-all, a save blocked by validation) are explicit calls from the
 * handler that performed the action, because only the handler knows it was
 * the user's doing.
 */
export class OgeGridAnnouncements {
  private last: OgeGridAnnouncementSnapshot | null = null;
  /** Set while a filter change waits for its result; holds the stale token. */
  private awaitingResult: { token: unknown } | null = null;

  constructor(private readonly deps: OgeGridAnnouncementsDeps) {}

  /** Diffs `next` against the previous snapshot and speaks what changed. */
  observe(next: OgeGridAnnouncementSnapshot): void {
    const prev = this.last;
    this.last = next;
    if (!prev) return;
    const enabled = this.deps.enabled();
    const messages = this.deps.messages();

    if (next.filterKey !== prev.filterKey) {
      this.awaitingResult = { token: prev.resultToken };
    }
    if (
      this.awaitingResult &&
      !next.loading &&
      next.resultToken !== this.awaitingResult.token
    ) {
      this.awaitingResult = null;
      if (enabled) {
        this.deps.announce(rowCountText(messages, next.rowCount), {
          delay: this.deps.countDelay?.() ?? 500,
        });
      }
    }

    if (!enabled) return;

    const sortText = sortChangeText(prev.sort, next.sort, messages, (field) =>
      this.deps.caption(field),
    );
    if (sortText) this.deps.announce(sortText);

    // a filter change resets the page as a side effect — the count says it
    if (
      next.paging &&
      !this.awaitingResult &&
      next.filterKey === prev.filterKey &&
      next.pageIndex !== prev.pageIndex
    ) {
      this.deps.announce(
        formatPattern(messages.pageAnnouncement, {
          n: String(next.pageIndex + 1),
          total: String(Math.max(1, next.pageCount)),
        }),
      );
    }
  }

  /** A group row was expanded or collapsed by the user. */
  groupToggled(value: string, expanded: boolean): void {
    if (!this.deps.enabled()) return;
    const messages = this.deps.messages();
    this.deps.announce(
      formatPattern(
        expanded
          ? messages.groupExpandedAnnouncement
          : messages.groupCollapsedAnnouncement,
        { value },
      ),
    );
  }

  /** A tree row was expanded or collapsed by the user (tree list). */
  rowToggled(value: string, expanded: boolean): void {
    if (!this.deps.enabled()) return;
    const messages = this.deps.messages();
    this.deps.announce(
      formatPattern(
        expanded
          ? messages.rowExpandedAnnouncement
          : messages.rowCollapsedAnnouncement,
        { value },
      ),
    );
  }

  /** Select-all / clear-all settled at `count` selected rows. */
  selectionCount(count: number): void {
    if (!this.deps.enabled()) return;
    this.deps.announce(
      formatPattern(this.deps.messages().selectionCountAnnouncement, {
        count: String(count),
      }),
    );
  }

  /** A commit was blocked by an invalid editor — spoken assertively. */
  validationFailed(column: string, error: string): void {
    if (!this.deps.enabled()) return;
    this.deps.announce(
      formatPattern(this.deps.messages().validationErrorAnnouncement, {
        column,
        error,
      }),
      { politeness: 'assertive' },
    );
  }
}

/** `{count} rows` / `{count} row` from the catalog. */
export function rowCountText(messages: OgeGridMessages, count: number): string {
  return formatPattern(
    count === 1
      ? messages.rowCountOneAnnouncement
      : messages.rowCountAnnouncement,
    { count: String(count) },
  );
}

/**
 * The sentence for a sort change, or `null` when nothing changed: the column
 * whose direction is new (or newly sorted), else the column whose sort was
 * removed.
 */
export function sortChangeText(
  prev: readonly SortDescriptor[],
  next: readonly SortDescriptor[],
  messages: OgeGridMessages,
  caption: (field: string) => string,
): string | null {
  const before = new Map(prev.map((sort) => [sort.field, sort.dir]));
  const changed = next.find((sort) => before.get(sort.field) !== sort.dir);
  if (changed) {
    return formatPattern(
      changed.dir === 'desc'
        ? messages.sortDescendingAnnouncement
        : messages.sortAscendingAnnouncement,
      { column: caption(changed.field) },
    );
  }
  const after = new Set(next.map((sort) => sort.field));
  const removed = prev.find((sort) => !after.has(sort.field));
  if (removed) {
    return formatPattern(messages.sortClearedAnnouncement, {
      column: caption(removed.field),
    });
  }
  return null;
}

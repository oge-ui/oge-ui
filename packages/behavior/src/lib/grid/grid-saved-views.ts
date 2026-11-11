import {
  ogeMigrateState,
  parseStateJson,
  sanitizeGridStateSnapshot,
  type GridStateSnapshot,
  type OgeStateMigration,
} from '@oge-ui/core';
import type { OgeStateStorage } from './grid-state-persistence';

/**
 * Named grid views (`savedViews`), shared by both grid render layers: the
 * user saves the current state — sort, filters, grouping, column layout,
 * picked summaries — under a name, opens it later or deletes it. Views are
 * stored through the same `OGE_STATE_STORAGE` backend as `stateKey`, under
 * their own entry (`oge-grid-views:<stateKey>`), so the restored session
 * state and the saved views never overwrite each other. Without a `stateKey`
 * the views live in memory for the session.
 */

/** One saved view. */
export interface OgeSavedView {
  readonly name: string;
  readonly state: GridStateSnapshot;
  /** ISO timestamp of the last save. */
  readonly savedAt: string;
}

/** Longest view name kept. */
export const OGE_SAVED_VIEW_NAME_MAX = 80;
/** Most views kept per grid; the oldest go first. */
export const OGE_SAVED_VIEWS_MAX = 50;

/** The storage entry of a grid's views. */
export function ogeSavedViewsKey(stateKey: string): string {
  return `oge-grid-views:${stateKey}`;
}

/** A trimmed, length-capped view name; `''` when nothing is left. */
export function ogeNormalizeViewName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, OGE_SAVED_VIEW_NAME_MAX);
}

/**
 * Parses stored views, dropping anything that is not a valid view. Each
 * view's state runs through the grid's `stateMigrations` first, so a view
 * saved before a format change opens in the new format.
 */
export function ogeParseSavedViews(
  raw: string | null,
  migrations?: readonly OgeStateMigration[],
): OgeSavedView[] {
  const parsed = raw ? parseStateJson(raw) : null;
  if (!Array.isArray(parsed)) return [];
  const out: OgeSavedView[] = [];
  for (const item of parsed as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const { name, state, savedAt } = item as Record<string, unknown>;
    if (typeof name !== 'string') continue;
    const clean = ogeNormalizeViewName(name);
    const snapshot = sanitizeGridStateSnapshot(
      ogeMigrateState(state, migrations),
    );
    if (!clean || !snapshot) continue;
    out.push({
      name: clean,
      state: snapshot,
      savedAt: typeof savedAt === 'string' ? savedAt : '',
    });
  }
  return out.slice(-OGE_SAVED_VIEWS_MAX);
}

const sameName = (a: string, b: string) =>
  a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Saves (or replaces, by name) a view; the newest comes last. */
export function ogeWithSavedView(
  views: readonly OgeSavedView[],
  name: string,
  state: GridStateSnapshot,
  now: Date = new Date(),
): OgeSavedView[] {
  const clean = ogeNormalizeViewName(name);
  if (!clean) return [...views];
  const rest = views.filter((view) => !sameName(view.name, clean));
  return [...rest, { name: clean, state, savedAt: now.toISOString() }].slice(
    -OGE_SAVED_VIEWS_MAX,
  );
}

/** Removes a view by name. */
export function ogeWithoutSavedView(
  views: readonly OgeSavedView[],
  name: string,
): OgeSavedView[] {
  return views.filter((view) => !sameName(view.name, name));
}

/** Options of {@link OgeSavedViewsCore}. */
export interface OgeSavedViewsOptions {
  readonly storage: () => OgeStateStorage;
  /** The grid's `stateKey`; `undefined` keeps the views in memory. */
  readonly stateKey: () => string | undefined;
  /** Called whenever the list changes (to re-render). */
  readonly onChange: (views: readonly OgeSavedView[]) => void;
  /** The grid's `stateMigrations`, run over every stored view. */
  readonly migrations?: () => readonly OgeStateMigration[] | undefined;
}

/** Loads, saves and deletes a grid's views. */
export class OgeSavedViewsCore {
  private views: readonly OgeSavedView[] = [];
  private loadedFor: string | undefined | null = null;
  private token = 0;

  constructor(private readonly options: OgeSavedViewsOptions) {}

  list(): readonly OgeSavedView[] {
    return this.views;
  }

  /** Reads the stored views once per `stateKey` (sync or async storage). */
  load(): void {
    const key = this.options.stateKey();
    if (this.loadedFor === key && key !== undefined) return;
    this.loadedFor = key;
    if (key === undefined) return;
    const token = ++this.token;
    const set = (raw: string | null) => {
      if (token !== this.token) return; // a newer key took over
      this.views = ogeParseSavedViews(raw, this.options.migrations?.());
      this.options.onChange(this.views);
    };
    try {
      const raw = this.options.storage().get(ogeSavedViewsKey(key));
      if (raw instanceof Promise) raw.then(set, () => set(null));
      else set(raw);
    } catch {
      set(null);
    }
  }

  save(name: string, state: GridStateSnapshot): void {
    this.commit(ogeWithSavedView(this.views, name, state));
  }

  remove(name: string): void {
    this.commit(ogeWithoutSavedView(this.views, name));
  }

  /** The view called `name`, if any. */
  find(name: string): OgeSavedView | undefined {
    return this.views.find((view) => sameName(view.name, name));
  }

  private commit(views: readonly OgeSavedView[]): void {
    this.views = views;
    this.options.onChange(views);
    const key = this.options.stateKey();
    if (key === undefined) return;
    try {
      void this.options
        .storage()
        .set(ogeSavedViewsKey(key), JSON.stringify(views));
    } catch {
      // a full or blocked storage keeps the session copy
    }
  }
}

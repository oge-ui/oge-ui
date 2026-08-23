'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * What an external drop zone or trigger needs from the uploader it feeds.
 * A structural subset of the uploader handle, so the registry never holds a
 * component-typed reference.
 */
export interface OgeUploadZoneTarget {
  readonly directory: boolean;
  addFiles(files: readonly File[]): void;
  openFileDialog(): void;
}

/**
 * How `<OgeUploadDropZone>` and `<OgeUploadTrigger>` find their uploader —
 * the React counterpart of the Angular package's root registry service.
 *
 * A module-level store rather than a context because the whole point of an
 * external zone is that it lives somewhere else in the tree — often under a
 * different root entirely, where no provider can reach. Subscribers re-read
 * on every change, so a zone declared above its uploader picks it up once it
 * mounts instead of capturing `null` for good.
 */
const uploaders = new Map<string, OgeUploadZoneTarget>();
const listeners = new Set<() => void>();
let version = 0;

function notify(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function registerUploader(zone: string, target: OgeUploadZoneTarget): void {
  uploaders.set(zone, target);
  notify();
}

function unregisterUploader(zone: string, target: OgeUploadZoneTarget): void {
  // Guarded so an unmounting uploader cannot unregister its replacement,
  // which is the order React uses when a route swaps one for another.
  if (uploaders.get(zone) !== target) return;
  uploaders.delete(zone);
  notify();
}

/** Publishes an uploader under its `dropZone` name for the lifetime of the host. */
export function useUploadZoneRegistration(
  zone: string | undefined,
  target: OgeUploadZoneTarget,
): void {
  useEffect(() => {
    if (!zone) return;
    registerUploader(zone, target);
    return () => unregisterUploader(zone, target);
  }, [zone, target]);
}

/** The uploader registered under `zone`, or `null` until one mounts. */
export function useUploadZoneTarget(zone: string): OgeUploadZoneTarget | null {
  // `version` is the snapshot: it changes exactly when the map does, and the
  // map lookup itself is cheap enough to repeat on every render.
  useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
  return uploaders.get(zone) ?? null;
}

/**
 * Client-side file restrictions.
 *
 * Returns error *kinds*, never text: the Angular layer resolves each kind
 * against the message set, so changing `messages` re-resolves through the
 * normal computed graph instead of leaving stale strings on the rows.
 *
 * Framework-free by contract — see the `src/lib/engine` lint block.
 */
import type { OgeUploadErrorKind } from '../upload-types';

/** The subset of a `File` the rules read. Preloaded rows satisfy it too. */
export interface OgeUploadCandidate {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

/** Every restriction, flattened — the shape the component binds. */
export interface OgeUploadRestrictions {
  /** `.png`-style or bare `png`-style extensions; empty allows everything. */
  readonly allowedFileExtensions: readonly string[];
  readonly maxFileSize: number | undefined;
  readonly minFileSize: number | undefined;
  readonly maxFileCount: number | undefined;
  readonly maxTotalFileSize: number | undefined;
}

/** The lowercase extension including its dot, or `''` for an extensionless name. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

/**
 * Tests a file against an `accept` attribute value.
 *
 * The browser already filters the dialog; this exists for the drop and paste
 * paths, where nothing filters for us. Follows the HTML rules: `.ext`,
 * `type/subtype` and `type/*` tokens, matched case-insensitively.
 */
export function matchesAccept(
  file: OgeUploadCandidate,
  accept: string,
): boolean {
  const tokens = accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return true;
  }

  const extension = fileExtension(file.name);
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) {
      return token === extension;
    }
    if (token.endsWith('/*')) {
      return type.startsWith(token.slice(0, -1));
    }
    return token === type;
  });
}

/**
 * Applies the per-file rules — extension and the two size bounds.
 *
 * Count and total-size rules depend on the rest of the list, so they live in
 * {@link validateSelection} instead.
 */
export function validateFile(
  file: OgeUploadCandidate,
  restrictions: OgeUploadRestrictions,
): readonly OgeUploadErrorKind[] {
  const errors: OgeUploadErrorKind[] = [];

  const allowed = restrictions.allowedFileExtensions;
  if (allowed.length > 0) {
    const extension = fileExtension(file.name);
    const permitted = allowed.some((entry) => {
      const token = entry.trim().toLowerCase();
      return (token.startsWith('.') ? token : `.${token}`) === extension;
    });
    if (!permitted) {
      errors.push('extension');
    }
  }

  if (
    restrictions.maxFileSize !== undefined &&
    file.size > restrictions.maxFileSize
  ) {
    errors.push('maxFileSize');
  }
  if (
    restrictions.minFileSize !== undefined &&
    file.size < restrictions.minFileSize
  ) {
    errors.push('minFileSize');
  }

  return errors;
}

/** One incoming file, paired with everything that disqualified it. */
export interface OgeUploadValidationResult<T extends OgeUploadCandidate> {
  readonly candidate: T;
  readonly errors: readonly OgeUploadErrorKind[];
}

/**
 * Validates a whole incoming batch against the rules *and* against what is
 * already on the list.
 *
 * Count and total-size are evaluated in arrival order and only against files
 * that have been accepted so far — otherwise one oversized file at the front
 * would poison the budget for every file behind it, and dropping ten files
 * with `maxFileCount: 3` would reject all ten instead of the last seven.
 */
export function validateSelection<T extends OgeUploadCandidate>(
  incoming: readonly T[],
  restrictions: OgeUploadRestrictions,
  existing: { readonly count: number; readonly totalSize: number } = {
    count: 0,
    totalSize: 0,
  },
): readonly OgeUploadValidationResult<T>[] {
  let count = existing.count;
  let totalSize = existing.totalSize;

  return incoming.map((candidate) => {
    const errors = [...validateFile(candidate, restrictions)];

    if (
      restrictions.maxFileCount !== undefined &&
      count >= restrictions.maxFileCount
    ) {
      errors.push('maxFileCount');
    }
    if (
      restrictions.maxTotalFileSize !== undefined &&
      totalSize + candidate.size > restrictions.maxTotalFileSize
    ) {
      errors.push('maxTotalSize');
    }

    if (errors.length === 0) {
      count += 1;
      totalSize += candidate.size;
    }

    return { candidate, errors };
  });
}

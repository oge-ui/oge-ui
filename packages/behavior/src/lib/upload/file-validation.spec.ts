import {
  fileExtension,
  matchesAccept,
  validateFile,
  validateSelection,
  type OgeUploadRestrictions,
} from './file-validation';

const NONE: OgeUploadRestrictions = {
  allowedFileExtensions: [],
  maxFileSize: undefined,
  minFileSize: undefined,
  maxFileCount: undefined,
  maxTotalFileSize: undefined,
};

const candidate = (name: string, size = 100, type = '') => ({
  name,
  size,
  type,
});

describe('fileExtension', () => {
  it('lowercases and keeps the dot', () => {
    expect(fileExtension('Report.PDF')).toBe('.pdf');
  });

  it('reads the last dot, not the first', () => {
    expect(fileExtension('archive.tar.gz')).toBe('.gz');
  });

  it('is empty for an extensionless name', () => {
    expect(fileExtension('Makefile')).toBe('');
  });

  it('does not treat a dotfile as an extension', () => {
    expect(fileExtension('.gitignore')).toBe('');
  });
});

describe('matchesAccept', () => {
  it('allows everything when accept is empty', () => {
    expect(matchesAccept(candidate('a.exe'), '')).toBe(true);
    expect(matchesAccept(candidate('a.exe'), '  ,  ')).toBe(true);
  });

  it('matches extension tokens case-insensitively', () => {
    expect(matchesAccept(candidate('a.PNG'), '.png,.jpg')).toBe(true);
    expect(matchesAccept(candidate('a.gif'), '.png,.jpg')).toBe(false);
  });

  it('matches an exact MIME type', () => {
    expect(
      matchesAccept(candidate('a', 1, 'application/pdf'), 'application/pdf'),
    ).toBe(true);
  });

  it('matches a MIME wildcard', () => {
    expect(matchesAccept(candidate('a', 1, 'image/webp'), 'image/*')).toBe(
      true,
    );
    expect(matchesAccept(candidate('a', 1, 'video/mp4'), 'image/*')).toBe(
      false,
    );
  });

  it('accepts when any one token matches', () => {
    expect(
      matchesAccept(candidate('a.txt', 1, 'text/plain'), 'image/*,.txt'),
    ).toBe(true);
  });
});

describe('validateFile', () => {
  it('passes a file with no restrictions', () => {
    expect(validateFile(candidate('a.txt'), NONE)).toEqual([]);
  });

  it('rejects a disallowed extension, with or without the leading dot', () => {
    const dotted = { ...NONE, allowedFileExtensions: ['.png'] };
    const bare = { ...NONE, allowedFileExtensions: ['png'] };
    expect(validateFile(candidate('a.gif'), dotted)).toEqual(['extension']);
    expect(validateFile(candidate('a.gif'), bare)).toEqual(['extension']);
    expect(validateFile(candidate('a.PNG'), bare)).toEqual([]);
  });

  it('applies both size bounds', () => {
    expect(
      validateFile(candidate('a.txt', 200), { ...NONE, maxFileSize: 100 }),
    ).toEqual(['maxFileSize']);
    expect(
      validateFile(candidate('a.txt', 50), { ...NONE, minFileSize: 100 }),
    ).toEqual(['minFileSize']);
  });

  it('treats the bounds as inclusive', () => {
    expect(
      validateFile(candidate('a.txt', 100), {
        ...NONE,
        maxFileSize: 100,
        minFileSize: 100,
      }),
    ).toEqual([]);
  });

  it('reports every failure, not just the first', () => {
    expect(
      validateFile(candidate('a.gif', 500), {
        ...NONE,
        allowedFileExtensions: ['.png'],
        maxFileSize: 100,
      }),
    ).toEqual(['extension', 'maxFileSize']);
  });

  it('ignores a zero max size rather than rejecting everything', () => {
    // `maxFileSize: 0` is dx's "no limit" sentinel; the house API uses
    // `undefined` for that, so an explicit 0 must stay a real limit.
    expect(
      validateFile(candidate('a.txt', 1), { ...NONE, maxFileSize: 0 }),
    ).toEqual(['maxFileSize']);
  });
});

describe('validateSelection', () => {
  it('rejects only the files past the count limit', () => {
    const files = [candidate('1'), candidate('2'), candidate('3')];
    const result = validateSelection(files, { ...NONE, maxFileCount: 2 });
    expect(result.map((r) => r.errors)).toEqual([[], [], ['maxFileCount']]);
  });

  it('counts what is already on the list', () => {
    const result = validateSelection(
      [candidate('3')],
      {
        ...NONE,
        maxFileCount: 2,
      },
      { count: 2, totalSize: 0 },
    );
    expect(result[0].errors).toEqual(['maxFileCount']);
  });

  it('does not let a rejected file consume the budget', () => {
    // The oversized file must not spend a count slot: with maxFileCount 1,
    // the second file is the first *accepted* one.
    const result = validateSelection(
      [candidate('big', 500), candidate('small', 10)],
      { ...NONE, maxFileSize: 100, maxFileCount: 1 },
    );
    expect(result[0].errors).toEqual(['maxFileSize']);
    expect(result[1].errors).toEqual([]);
  });

  it('applies the total-size budget across the batch', () => {
    const result = validateSelection([candidate('a', 60), candidate('b', 60)], {
      ...NONE,
      maxTotalFileSize: 100,
    });
    expect(result.map((r) => r.errors)).toEqual([[], ['maxTotalSize']]);
  });

  it('adds the already-selected bytes to the total budget', () => {
    const result = validateSelection(
      [candidate('a', 60)],
      {
        ...NONE,
        maxTotalFileSize: 100,
      },
      { count: 1, totalSize: 60 },
    );
    expect(result[0].errors).toEqual(['maxTotalSize']);
  });

  it('returns an entry per incoming file, in order', () => {
    const files = [candidate('a'), candidate('b')];
    const result = validateSelection(files, NONE);
    expect(result.map((r) => r.candidate.name)).toEqual(['a', 'b']);
  });
});

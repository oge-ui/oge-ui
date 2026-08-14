import { formatFileSize } from './file-size';

describe('formatFileSize', () => {
  it('prints whole bytes without a decimal', () => {
    expect(formatFileSize(0, { locale: 'en-US' })).toBe('0 B');
    expect(formatFileSize(1, { locale: 'en-US' })).toBe('1 B');
    expect(formatFileSize(812, { locale: 'en-US' })).toBe('812 B');
  });

  it('treats anything non-positive as zero', () => {
    expect(formatFileSize(-1, { locale: 'en-US' })).toBe('0 B');
    expect(formatFileSize(Number.NaN, { locale: 'en-US' })).toBe('0 B');
  });

  it('steps up SI units at 1000', () => {
    expect(formatFileSize(1000, { locale: 'en-US' })).toBe('1.0 KB');
    expect(formatFileSize(1_500_000, { locale: 'en-US' })).toBe('1.5 MB');
    expect(formatFileSize(2_000_000_000, { locale: 'en-US' })).toBe('2.0 GB');
  });

  it('drops the decimal once the mantissa reaches double digits', () => {
    expect(formatFileSize(9_400_000, { locale: 'en-US' })).toBe('9.4 MB');
    expect(formatFileSize(12_000_000, { locale: 'en-US' })).toBe('12 MB');
  });

  it('switches to IEC units and a 1024 base on request', () => {
    expect(formatFileSize(1024, { locale: 'en-US', binary: true })).toBe(
      '1.0 KiB',
    );
    expect(formatFileSize(1_048_576, { locale: 'en-US', binary: true })).toBe(
      '1.0 MiB',
    );
  });

  it('formats the number in the requested locale', () => {
    expect(formatFileSize(1_500_000, { locale: 'tr-TR' })).toBe('1,5 MB');
  });

  it('honours a wider precision', () => {
    expect(formatFileSize(1_234_000, { locale: 'en-US', precision: 2 })).toBe(
      '1.23 MB',
    );
  });

  it('stops at the largest unit it knows, and still groups the digits', () => {
    expect(formatFileSize(10 ** 18, { locale: 'en-US' })).toBe('1,000 PB');
  });
});

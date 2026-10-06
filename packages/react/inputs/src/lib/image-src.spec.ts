import { itemImageSrc } from './image-src';

describe('itemImageSrc', () => {
  it('passes safe image URLs through', () => {
    expect(itemImageSrc('/avatars/1.png')).toBe('/avatars/1.png');
    expect(itemImageSrc('data:image/png;base64,AAAA')).toBe(
      'data:image/png;base64,AAAA',
    );
  });

  it('drops an unsafe URL instead of loading about:blank (strict img-src)', () => {
    expect(itemImageSrc('data:image/svg+xml,<svg/>')).toBeUndefined();
    expect(itemImageSrc('javascript:alert(1)')).toBeUndefined();
    expect(itemImageSrc(undefined)).toBeUndefined();
  });
});

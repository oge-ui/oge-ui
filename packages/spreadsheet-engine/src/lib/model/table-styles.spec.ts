import {
  OGE_BUILTIN_TABLE_STYLE_NAMES,
  OGE_TABLE_STYLE_ELEMENT_TYPES,
  ogeBuiltinTableStyle,
  ogeTableStyleFormats,
} from './table-styles';

describe('Excel’s built-in table styles', () => {
  it('knows all 60, light, medium and dark', () => {
    expect(OGE_BUILTIN_TABLE_STYLE_NAMES).toHaveLength(60);
    expect(OGE_BUILTIN_TABLE_STYLE_NAMES.slice(0, 2)).toEqual([
      'TableStyleLight1',
      'TableStyleLight2',
    ]);
    expect(OGE_BUILTIN_TABLE_STYLE_NAMES).toContain('TableStyleMedium28');
    expect(OGE_BUILTIN_TABLE_STYLE_NAMES).toContain('TableStyleDark11');
    expect(OGE_TABLE_STYLE_ELEMENT_TYPES).toHaveLength(13);
  });

  it('decodes a style as Excel defines it: theme colours, tints and lines', () => {
    const medium2 = ogeBuiltinTableStyle('TableStyleMedium2');
    expect(medium2?.headerRow).toEqual({
      format: {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { theme: 4 } },
        font: { bold: true, color: { theme: 0 } },
      },
      size: 1,
    });
    // lighter by 40%: 13106 / 32767, as Excel stores it
    expect(medium2?.wholeTable?.format.border?.horizontal).toEqual({
      style: 'thin',
      color: { theme: 4, tint: 0.3999755851924192 },
    });
    expect(medium2?.totalRow?.format.border?.top?.style).toBe('double');
    expect(medium2?.firstRowStripe?.format.fill).toEqual({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { theme: 4, tint: 0.7999816888943144 },
    });
    // darker tints: −25% is −8191 / 32767
    expect(
      ogeBuiltinTableStyle('TableStyleLight2')?.wholeTable?.format.font?.color,
    ).toEqual({ theme: 4, tint: -0.249977111117893 });
    expect(
      ogeBuiltinTableStyle('TableStyleMedium9')?.headerRow?.format.border
        ?.bottom?.style,
    ).toBe('thick');
    expect(
      ogeBuiltinTableStyle('TableStyleDark1')?.headerRow?.format.border?.bottom
        ?.style,
    ).toBe('medium');
  });

  it('decodes each style once, and knows no other names', () => {
    expect(ogeBuiltinTableStyle('TableStyleDark3')).toBe(
      ogeBuiltinTableStyle('TableStyleDark3'),
    );
    expect(ogeBuiltinTableStyle('TableStyleMedium29')).toBeUndefined();
    expect(ogeBuiltinTableStyle('toString')).toBeUndefined();
  });
});

describe('ogeTableStyleFormats', () => {
  const dxfs = [
    {
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { rgb: 'FFFF0000' },
      },
    },
    { font: { italic: false } },
  ];

  it('takes the workbook’s own style, its elements’ formats and stripe sizes', () => {
    const formats = ogeTableStyleFormats(
      {
        dxfs,
        tableStyles: [
          {
            name: 'Mine',
            pivot: false,
            table: true,
            elements: [
              { type: 'headerRow', dxf: 0 },
              { type: 'secondRowStripe', dxf: 1, size: 3 },
              // a PivotTable element and an element without a format
              { type: 'pageFieldLabels', dxf: 0 },
              { type: 'totalRow' },
              { type: 'lastColumn', dxf: 9 },
            ],
          },
        ],
      },
      'Mine',
    );
    expect(formats).toEqual({
      headerRow: { format: dxfs[0], size: 1 },
      secondRowStripe: { format: dxfs[1], size: 3 },
      totalRow: { format: {}, size: 1 },
      lastColumn: { format: {}, size: 1 },
    });
  });

  it('falls back to the built-in style, and skips PivotTable-only styles', () => {
    const workbook = {
      dxfs,
      tableStyles: [
        { name: 'PivotOnly', pivot: true, table: false, elements: [] },
      ],
    };
    expect(ogeTableStyleFormats(workbook, 'TableStyleLight9')).toBe(
      ogeBuiltinTableStyle('TableStyleLight9'),
    );
    expect(ogeTableStyleFormats(workbook, 'PivotOnly')).toBeUndefined();
  });
});

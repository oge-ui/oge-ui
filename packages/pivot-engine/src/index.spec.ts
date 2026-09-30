import * as engine from './index';

/**
 * The barrel is both render layers' whole import surface (ADR 0003): an
 * export that quietly disappears breaks `@oge-ui/pivot` or
 * `@oge-ui/react-pivot` without failing one of their specs.
 */
describe('@oge-ui/pivot-engine barrel', () => {
  it('exports the value surface the render layers import', () => {
    const expected = [
      'OgePivotGridCore',
      'OgePivotStateCore',
      'OGE_DEFAULT_PIVOT_MESSAGES',
      'OGE_PIVOT_FIELD_DRAG_TYPE',
      'OGE_EMPTY_PIVOT_RESULT',
      'resolvePivotMessages',
      'pivotFieldConfigOf',
      'buildPivotLoadOptions',
      'pivotResultFromPayload',
      'pivotColumnHeaderCells',
      'pivotHeaderCellKey',
      'pivotMatrixKeyTarget',
    ];
    for (const name of expected) {
      expect(engine).toHaveProperty(name);
    }
  });

  it('merges message overrides over the defaults', () => {
    expect(engine.resolvePivotMessages().grandTotal).toBe('Grand Total');
    expect(
      engine.resolvePivotMessages({ grandTotal: 'Toplam' }).grandTotal,
    ).toBe('Toplam');
    expect(
      engine.resolvePivotMessages(
        { apply: 'Uygula' },
        { ...engine.OGE_DEFAULT_PIVOT_MESSAGES, grandTotal: 'Toplam' },
      ),
    ).toMatchObject({ apply: 'Uygula', grandTotal: 'Toplam' });
  });
});

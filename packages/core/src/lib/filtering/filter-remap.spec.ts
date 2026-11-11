import type { FilterExpr } from '../data/load-options';
import { ogeRemapFilterFields } from './filter-remap';

describe('ogeRemapFilterFields', () => {
  const expr: FilterExpr = {
    type: 'and',
    operands: [
      { type: 'binary', field: 'customerName', op: 'contains', value: 'a' },
      {
        type: 'not',
        operand: { type: 'binary', field: 'status', op: 'eq', value: 1 },
      },
    ],
  };

  it('renames the mapped fields at any depth', () => {
    expect(
      ogeRemapFilterFields(expr, {
        customerName: 'customer.lastName',
        status: 'statusId',
      }),
    ).toEqual({
      type: 'and',
      operands: [
        {
          type: 'binary',
          field: 'customer.lastName',
          op: 'contains',
          value: 'a',
        },
        {
          type: 'not',
          operand: { type: 'binary', field: 'statusId', op: 'eq', value: 1 },
        },
      ],
    });
  });

  it('keeps the same object when nothing is mapped', () => {
    expect(ogeRemapFilterFields(expr, { other: 'x' })).toBe(expr);
    expect(ogeRemapFilterFields(null, { a: 'b' })).toBeNull();
    // inherited keys are not fields
    expect(ogeRemapFilterFields(expr, Object.create({ status: 'x' }))).toBe(
      expr,
    );
  });
});

import { ogeDisplayFormula, ogeShiftFormula } from './formula-text';

describe('ogeShiftFormula', () => {
  it('moves relative parts and keeps anchored ones', () => {
    expect(ogeShiftFormula('A1+$B2+C$3+$D$4', 2, 1)).toBe('B3+$B4+D$3+$D$4');
    expect(ogeShiftFormula('SUM(A1:B2)', 1, 0)).toBe('SUM(A2:B3)');
    expect(ogeShiftFormula('A1', 0, 0)).toBe('A1');
  });

  it('moves whole columns and rows', () => {
    expect(ogeShiftFormula('SUM(A:B)', 5, 1)).toBe('SUM(B:C)');
    expect(ogeShiftFormula('SUM($A:B)', 0, 2)).toBe('SUM($A:D)');
    expect(ogeShiftFormula('SUM(1:3)', 2, 9)).toBe('SUM(3:5)');
    expect(ogeShiftFormula('SUM($1:3)', 2, 0)).toBe('SUM($1:5)');
  });

  it('turns a reference pushed off the sheet into #REF!', () => {
    expect(ogeShiftFormula('A1*2', -1, 0)).toBe('#REF!*2');
    expect(ogeShiftFormula('A1:B2', 0, -1)).toBe('#REF!');
    expect(ogeShiftFormula('XFD1', 0, 1)).toBe('#REF!');
    expect(ogeShiftFormula('A1048576', 1, 0)).toBe('#REF!');
    expect(ogeShiftFormula('SUM(1:1)', -1, 0)).toBe('SUM(#REF!)');
  });

  it('leaves strings, sheet names, names, functions, numbers and errors alone', () => {
    expect(ogeShiftFormula('"A1"&A1', 1, 0)).toBe('"A1"&A2');
    expect(ogeShiftFormula('"say ""A1"""&B1', 1, 0)).toBe('"say ""A1"""&B2');
    expect(ogeShiftFormula("'Q1 A1'!A1+Sheet2!B2", 1, 1)).toBe(
      "'Q1 A1'!B2+Sheet2!C3",
    );
    expect(ogeShiftFormula("'it''s'!A1", 1, 0)).toBe("'it''s'!A2");
    expect(ogeShiftFormula('LOG10(A1)+ATAN2(B1,C1)', 1, 0)).toBe(
      'LOG10(A2)+ATAN2(B2,C2)',
    );
    expect(ogeShiftFormula('Rate*A1+SALES2024', 1, 0)).toBe(
      'Rate*A2+SALES2024',
    );
    expect(ogeShiftFormula('1.5E+10+A1', 1, 0)).toBe('1.5E+10+A2');
    expect(ogeShiftFormula('IFERROR(A1,#N/A)+#REF!', 1, 0)).toBe(
      'IFERROR(A2,#N/A)+#REF!',
    );
    expect(ogeShiftFormula('Table1[[#This Row],[A1]]+A1', 1, 0)).toBe(
      'Table1[[#This Row],[A1]]+A2',
    );
    expect(ogeShiftFormula('[1]Book!A1', 1, 0)).toBe('[1]Book!A2');
    expect(ogeShiftFormula('TRUE+A1', 1, 0)).toBe('TRUE+A2');
  });

  it('treats a name that reads as a cell as a cell, as Excel does', () => {
    expect(ogeShiftFormula('TAX1*2', 1, 0)).toBe('TAX2*2');
  });
});

describe('ogeDisplayFormula', () => {
  it('drops the future-function prefixes outside strings', () => {
    expect(ogeDisplayFormula('_xlfn.XLOOKUP(A1,B:B,C:C)')).toBe(
      'XLOOKUP(A1,B:B,C:C)',
    );
    expect(ogeDisplayFormula('_xlfn._xlws.SORT(A1:A9)')).toBe('SORT(A1:A9)');
    expect(ogeDisplayFormula('_xlfn.LET(_xlpm.x,1,_xlpm.x+1)')).toBe(
      'LET(x,1,x+1)',
    );
    expect(ogeDisplayFormula('"_xlfn.keep"&_xlfn.CONCAT(A1)')).toBe(
      '"_xlfn.keep"&CONCAT(A1)',
    );
    expect(ogeDisplayFormula('SUM(A1)')).toBe('SUM(A1)');
  });
});

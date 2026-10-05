import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OGE_DEFAULT_GRID_MESSAGES } from '@oge-ui/behavior';
import { OGE_GRID_CONFIG } from '@oge-ui/grid';
import { OGE_INPUTS_CONFIG } from '@oge-ui/inputs';
import { OGE_SPLITTER_CONFIG } from '@oge-ui/layout';
import { en, type OgeLocalePack } from '@oge-ui/locales';
import { de } from '@oge-ui/locales/de';
import { tr } from '@oge-ui/locales/tr';
import { OGE_PAGINATION_CONFIG } from '@oge-ui/navigation';
import { provideOgeLocale } from './locale';

describe('provideOgeLocale', () => {
  it('sets every MIT family catalog and the data locale from one pack', () => {
    TestBed.configureTestingModule({ providers: [provideOgeLocale(tr)] });
    const grid = TestBed.inject(OGE_GRID_CONFIG);
    expect(grid.locale).toBe('tr');
    expect(grid.messages.noData).toBe(tr.grid?.noData);
    expect(grid.messages.operators.contains).toBe(tr.grid?.operators?.contains);
    expect(TestBed.inject(OGE_INPUTS_CONFIG).locale).toBe('tr');
    expect(TestBed.inject(OGE_PAGINATION_CONFIG).messages.nextPage).toBe(
      tr.navigation?.pagination?.nextPage,
    );
    expect(TestBed.inject(OGE_SPLITTER_CONFIG).messages.collapsePane).toBe(
      tr.layout?.splitter?.collapsePane,
    );
  });

  it('keeps English for every key a pack lacks, nested blocks included', () => {
    const partial: OgeLocalePack = {
      locale: 'tr',
      dir: 'ltr',
      grid: { operators: { eq: 'Eşittir' } },
    };
    TestBed.configureTestingModule({
      providers: [provideOgeLocale(partial)],
    });
    const { messages } = TestBed.inject(OGE_GRID_CONFIG);
    expect(messages.operators.eq).toBe('Eşittir');
    expect(messages.operators.ne).toBe(OGE_DEFAULT_GRID_MESSAGES.operators.ne);
    expect(messages.noData).toBe(OGE_DEFAULT_GRID_MESSAGES.noData);
  });

  it('follows a signal in its live form', () => {
    const pack = signal<OgeLocalePack>(en);
    TestBed.configureTestingModule({
      providers: [provideOgeLocale(() => pack())],
    });
    const grid = TestBed.inject(OGE_GRID_CONFIG);
    expect(grid.messages.noData).toBe(OGE_DEFAULT_GRID_MESSAGES.noData);
    pack.set(de);
    expect(grid.messages.noData).toBe(de.grid?.noData);
    expect(grid.locale).toBe('de');
  });
});

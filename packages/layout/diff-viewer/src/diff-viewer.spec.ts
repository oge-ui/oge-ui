import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideOgeDiffViewerConfig } from './config';
import { OgeDiffViewer } from './diff-viewer';

const OLD = [
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'eta',
  'theta',
].join('\n');
const NEW = [
  'alpha',
  'BETA one',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'eta',
  'theta',
  'iota',
].join('\n');

@Component({
  imports: [OgeDiffViewer],
  template: `<oge-diff-viewer
    #viewer
    [oldValue]="oldValue()"
    [newValue]="newValue()"
    [language]="language()"
    [(mode)]="mode"
    [context]="1"
    [toolbar]="toolbar()"
  />`,
})
class Host {
  readonly oldValue = signal<unknown>(OLD);
  readonly newValue = signal<unknown>(NEW);
  readonly language = signal<'text' | 'json'>('text');
  readonly mode = signal<'split' | 'inline'>('split');
  readonly toolbar = signal(true);
  readonly viewer = viewChild.required(OgeDiffViewer);
}

const q = <T extends Element = HTMLElement>(el: HTMLElement, s: string) =>
  el.querySelector(s) as T;
const all = (el: HTMLElement, s: string) =>
  [...el.querySelectorAll(s)] as HTMLElement[];

describe('OgeDiffViewer', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeDiffViewerConfig({ messages: { oldLabel: 'Önce' } }),
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('shows a side-by-side diff with counts, word highlights and folds', () => {
    expect(q(el, '.oge-diff-viewer').getAttribute('aria-label')).toBe(
      'Comparison',
    );
    expect(q(el, '.oge-diff-viewer-added-count').textContent).toBe('+2');
    expect(q(el, '.oge-diff-viewer-removed-count').textContent).toBe('−1');
    expect(all(el, 'th').map((th) => th.textContent?.trim())).toEqual([
      'Önce',
      'After',
    ]);
    const changed = q(el, 'tr[data-change="0"]');
    expect(changed.querySelectorAll('td')).toHaveLength(4);
    expect(
      changed.querySelector('td.oge-diff-viewer-delete mark')?.textContent,
    ).toBe('beta');
    expect(
      changed.querySelector('td.oge-diff-viewer-insert mark')?.textContent,
    ).toBe('BETA one');
    expect(changed.querySelector('.oge-diff-viewer-sr')?.textContent).toBe(
      'Removed: ',
    );
    const fold = q<HTMLButtonElement>(el, '.oge-diff-viewer-expand');
    expect(fold.textContent?.trim()).toBe('Show 4 unchanged lines');
    fold.click();
    fixture.detectChanges();
    expect(q(el, '.oge-diff-viewer-expand')).toBeNull();
    // the inserted last line: an empty old side
    const last = all(el, 'tr.oge-diff-viewer-row').at(-1)!;
    expect(last.querySelector('td.oge-diff-viewer-empty')).not.toBeNull();
  });

  it('switches to inline, stacking a change as removed then added lines', () => {
    q<HTMLButtonElement>(el, '.oge-diff-viewer-inline').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('inline');
    expect(q(el, '.oge-diff-viewer-inline').getAttribute('aria-pressed')).toBe(
      'true',
    );
    const change = all(el, 'tr[data-change="0"]');
    expect(change).toHaveLength(2);
    expect(
      change.map((tr) => tr.querySelectorAll('td')[0].textContent?.trim()),
    ).toEqual(['2', '']);
    expect(
      change.map(
        (tr) => tr.querySelector('.oge-diff-viewer-marker')?.textContent,
      ),
    ).toEqual(['−', '+']);
    q<HTMLButtonElement>(el, '.oge-diff-viewer-split').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('split');
  });

  it('steps through the changes, wrapping, and announces where it is', () => {
    const next = q<HTMLButtonElement>(el, '.oge-diff-viewer-next');
    next.click();
    fixture.detectChanges();
    expect(q(el, '[role="status"]').textContent).toBe('Change 1 of 2');
    expect(q(el, 'tr[data-change="0"]').classList).toContain(
      'oge-diff-viewer-current',
    );
    next.click();
    next.click();
    fixture.detectChanges();
    expect(q(el, '[role="status"]').textContent).toBe('Change 1 of 2');
    fixture.componentInstance.viewer().previousChange();
    fixture.detectChanges();
    expect(q(el, '[role="status"]').textContent).toBe('Change 2 of 2');
  });

  it('compares JSON, key order aside, and explains a side that is not JSON', () => {
    const host = fixture.componentInstance;
    host.language.set('json');
    host.oldValue.set('{"b": 1, "a": [1, 2]}');
    host.newValue.set({ a: [1, 2], b: 1 });
    fixture.detectChanges();
    expect(q(el, '.oge-diff-viewer-message').textContent?.trim()).toBe(
      'No differences',
    );
    expect(q<HTMLButtonElement>(el, '.oge-diff-viewer-next').disabled).toBe(
      true,
    );
    host.viewer().nextChange();
    host.newValue.set({ a: [1, 3], b: 1 });
    fixture.detectChanges();
    expect(host.viewer().diff().changes).toEqual([
      { path: '$.a[1]', kind: 'changed', before: 2, after: 3 },
    ]);
    host.newValue.set('{nope');
    fixture.detectChanges();
    expect(q(el, '.oge-diff-viewer-error').textContent?.trim()).toMatch(
      /^After is not valid JSON: /,
    );
    expect(q(el, 'table')).toBeNull();
    host.oldValue.set('nope');
    fixture.detectChanges();
    expect(q(el, '.oge-diff-viewer-error').textContent?.trim()).toMatch(
      /^Önce is not valid JSON/,
    );
  });

  it('hides the toolbar on request', () => {
    fixture.componentInstance.toolbar.set(false);
    fixture.detectChanges();
    expect(q(el, '.oge-diff-viewer-toolbar')).toBeNull();
  });
});

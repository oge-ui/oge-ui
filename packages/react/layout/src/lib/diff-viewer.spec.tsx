import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeDiffViewer, type OgeDiffViewerHandle } from './diff-viewer';
import { OgeDiffViewerConfigProvider } from './layout-config';

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

const q = <T extends Element = HTMLElement>(s: string) =>
  document.querySelector(s) as T;
const all = (s: string) => [...document.querySelectorAll(s)] as HTMLElement[];

describe('<OgeDiffViewer>', () => {
  it('shows a side-by-side diff with counts, word highlights and folds', () => {
    render(
      <StrictMode>
        <OgeDiffViewerConfigProvider
          config={{ context: 1, messages: { oldLabel: 'Önce' } }}
        >
          <OgeDiffViewer oldValue={OLD} newValue={NEW} className="mine" />
        </OgeDiffViewerConfigProvider>
      </StrictMode>,
    );
    expect(q('.oge-diff-viewer').classList).toContain('mine');
    expect(q('.oge-diff-viewer-added-count').textContent).toBe('+2');
    expect(q('.oge-diff-viewer-removed-count').textContent).toBe('−1');
    expect(all('th').map((th) => th.textContent)).toEqual(['Önce', 'After']);
    const changed = q('tr[data-change="0"]');
    expect(
      changed.querySelector('td.oge-diff-viewer-delete mark')?.textContent,
    ).toBe('beta');
    expect(changed.querySelector('.oge-diff-viewer-sr')?.textContent).toBe(
      'Removed: ',
    );
    fireEvent.click(q('.oge-diff-viewer-expand'));
    expect(q('.oge-diff-viewer-expand')).toBeNull();
    expect(
      all('tr.oge-diff-viewer-row')
        .at(-1)!
        .querySelector('td.oge-diff-viewer-empty'),
    ).not.toBeNull();
  });

  it('switches layout (controlled), steps through changes and exposes the model', () => {
    const ref = createRef<OgeDiffViewerHandle>();
    function Host() {
      const [mode, setMode] = useState<'split' | 'inline'>('split');
      return (
        <OgeDiffViewer
          ref={ref}
          oldValue={OLD}
          newValue={NEW}
          mode={mode}
          onModeChange={setMode}
          context={Infinity}
          wordDiff={false}
          ignoreCase
        />
      );
    }
    render(<Host />);
    fireEvent.click(q('.oge-diff-viewer-inline'));
    expect(q('.oge-diff-viewer-inline').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      all('tr[data-change="0"]').map(
        (tr) => tr.querySelector('.oge-diff-viewer-marker')?.textContent,
      ),
    ).toEqual(['−', '+']);
    expect(q('mark')).toBeNull();
    fireEvent.click(q('.oge-diff-viewer-next'));
    expect(q('[role="status"]').textContent).toBe('Change 1 of 2');
    act(() => ref.current!.previousChange());
    expect(q('[role="status"]').textContent).toBe('Change 2 of 2');
    fireEvent.click(q('.oge-diff-viewer-previous'));
    expect(q('[role="status"]').textContent).toBe('Change 1 of 2');
    expect(ref.current!.diff().stats.changes).toBe(2);
    fireEvent.click(q('.oge-diff-viewer-split'));
    expect(q('.oge-diff-viewer-split').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('compares JSON, key order aside, and explains a side that is not JSON', () => {
    const ref = createRef<OgeDiffViewerHandle>();
    const { rerender } = render(
      <OgeDiffViewer
        ref={ref}
        language="json"
        oldValue='{"b": 1, "a": 2}'
        newValue={{ a: 2, b: 1 }}
        defaultMode="inline"
      />,
    );
    expect(q('.oge-diff-viewer-message').textContent).toBe('No differences');
    act(() => ref.current!.nextChange());
    rerender(
      <OgeDiffViewer
        ref={ref}
        language="json"
        oldValue="{}"
        newValue="{oops"
        sortKeys={false}
      />,
    );
    expect(q('.oge-diff-viewer-error').textContent).toMatch(
      /^After is not valid JSON: /,
    );
    rerender(
      <OgeDiffViewer
        ref={ref}
        language="json"
        oldValue="oops"
        newValue="{}"
        ignoreWhitespace
      />,
    );
    expect(q('.oge-diff-viewer-error').textContent).toMatch(
      /^Before is not valid JSON/,
    );
  });

  it('hides the toolbar on request and compares empty inputs', () => {
    render(<OgeDiffViewer toolbar={false} />);
    expect(q('.oge-diff-viewer-toolbar')).toBeNull();
    expect(q('.oge-diff-viewer-message').textContent).toBe('No differences');
  });
});

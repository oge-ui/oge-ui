import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgeDiffViewer,
  type OgeDiffViewerHandle,
  type OgeJsonChange,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DIFF_NEW_JSON,
  DIFF_NEW_TEXT,
  DIFF_OLD_JSON,
  DIFF_OLD_TEXT,
} from '../layout/diff-viewer-demo-data';
import { LAYOUT_DIFF_VIEWER_DEMOS } from './diff-viewer-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_LAYOUT_DIFF_VIEWER_SECTIONS = ['Text', 'JSON'] as const;

function TextDemo(): ReactNode {
  const [mode, setMode] = useState<'split' | 'inline'>('split');
  return createElement(
    'div',
    { style: { height: 380 } },
    createElement(OgeDiffViewer, {
      oldValue: DIFF_OLD_TEXT,
      newValue: DIFF_NEW_TEXT,
      context: 1,
      mode,
      onModeChange: setMode,
      style: { height: '100%' },
    }),
  );
}

function JsonDemo(): ReactNode {
  const viewer = useRef<OgeDiffViewerHandle>(null);
  const [changes, setChanges] = useState<readonly OgeJsonChange[]>([]);
  useEffect(() => setChanges(viewer.current?.diff().changes ?? []), []);
  return createElement(
    'div',
    null,
    createElement(OgeDiffViewer, {
      key: 'viewer',
      ref: viewer,
      language: 'json',
      defaultMode: 'inline',
      oldValue: DIFF_OLD_JSON,
      newValue: DIFF_NEW_JSON,
    }),
    createElement(
      'ul',
      {
        key: 'changes',
        className: 'mt-3 text-sm',
        'data-testid': 'diff-changes',
      },
      changes.map((c) =>
        createElement('li', { key: c.path }, `${c.kind} ${c.path}`),
      ),
    ),
  );
}

/**
 * The React half of the diff viewer page — rendered inside
 * `/components/diff-viewer` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-diff-viewer-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React viewer carries the class names but no styles of its own
  encapsulation: ViewEncapsulation.None,
  styleUrl:
    '../../../../../../packages/layout/diff-viewer/src/diff-viewer.scss',
  template: `
    <app-demo-card
      [chips]="['oldValue', 'newValue', 'mode', 'context']"
      heading="Text"
      description="Two versions of a config file: the changed values are highlighted word by word, the unchanged block between the changes folds to one line of context each side. Switch to <em>Inline</em> for one column, or step through the changes with the toolbar."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="text" />
    </app-demo-card>

    <app-demo-card
      [chips]="['language: json', 'ref.diff().changes', 'sortKeys']"
      heading="JSON"
      description="JSON text on one side and a value on the other, its keys in another order: only the real changes show, and <code>diff().changes</code> lists their paths."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="json" />
    </app-demo-card>
  `,
})
export class ReactLayoutDiffViewerDemos {
  protected readonly demos = LAYOUT_DIFF_VIEWER_DEMOS;
  protected readonly text = () => createElement(TextDemo);
  protected readonly json = () => createElement(JsonDemo);
}

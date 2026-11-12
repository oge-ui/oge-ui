import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeFileManager,
  ogeMemoryFileProvider,
  type OgeFileDeletingEvent,
  type OgeFileProvider,
  type OgeFileView,
} from '@oge-ui/react-upload/file-manager';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { DEMO_FILES } from '../upload/file-manager-data';
import { FILE_MANAGER_DEMOS } from './file-manager-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_FILE_MANAGER_SECTIONS = [
  'Getting started',
  'Read-only grid',
  'Confirm before deleting',
] as const;

const files = ogeMemoryFileProvider(DEMO_FILES);
const archive: OgeFileProvider = {
  list: async (folderId) => DEMO_FILES.filter((f) => f.parentId === folderId),
};
const reports = ogeMemoryFileProvider(
  DEMO_FILES.filter((f) => f.parentId === 'invoices').map((f) => ({
    ...f,
    parentId: null,
  })),
);

function DriveDemo(): ReactNode {
  const [opened, setOpened] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeFileManager, {
      provider: files,
      onFileOpen: (item) => setOpened(item.name),
      style: { height: 460 },
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm text-slate-600 dark:text-slate-300' },
      `Opened: ${opened || '—'}`,
    ),
  );
}

function ArchiveDemo(): ReactNode {
  const [view, setView] = useState<OgeFileView>('grid');
  return createElement(OgeFileManager, {
    provider: archive,
    view,
    onViewChange: setView,
    style: { height: 400 },
  });
}

/** Asks in the page itself instead of window.confirm, which would block the docs. */
function ReportsDemo(): ReactNode {
  const [question, setQuestion] = useState<{
    readonly count: number;
    readonly answer: (ok: boolean) => void;
  } | null>(null);
  const confirmDelete = (event: OgeFileDeletingEvent) =>
    new Promise<void>((resolve) =>
      setQuestion({
        count: event.items.length,
        answer: (ok) => {
          event.cancel = !ok;
          setQuestion(null);
          resolve();
        },
      }),
    );
  return createElement(
    'div',
    null,
    createElement(OgeFileManager, {
      provider: reports,
      onDeleting: confirmDelete,
      style: { height: 300 },
    }),
    question &&
      createElement(
        'div',
        {
          role: 'alertdialog',
          'aria-label': 'Delete files?',
          className: 'mt-2 flex items-center gap-2 text-sm',
        },
        `Delete ${question.count} item(s)?`,
        createElement(
          'button',
          {
            type: 'button',
            className: 'rounded border px-2 py-1',
            onClick: () => question.answer(true),
          },
          'Delete',
        ),
        createElement(
          'button',
          {
            type: 'button',
            className: 'rounded border px-2 py-1',
            onClick: () => question.answer(false),
          },
          'Keep',
        ),
      ),
  );
}

@Component({
  selector: 'app-react-file-manager-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React file manager carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/upload/src/styles.scss'],
  template: `
    <app-demo-card
      [chips]="['provider', 'onFileOpen', 'keyboard']"
      heading="Getting started"
      description="Double-click or Enter opens; F2 renames; Delete deletes; drag items onto a folder (in the list, the tree or the path) to move them, drop files from the desktop to upload; right-click or Shift+F10 for the context menu."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="drive" />
    </app-demo-card>

    <app-demo-card
      [chips]="['list only', 'view']"
      heading="Read-only grid"
      description="A provider with only <code>list</code> browses without the new folder, rename, delete, move and upload commands; <code>view</code> with <code>onViewChange</code> keeps the view in your own state."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="archiveDemo" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onDeleting', 'promise']"
      heading="Confirm before deleting"
      description="<code>onDeleting</code> is cancelable and may return a promise: the delete waits for the answer."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="reportsDemo" />
    </app-demo-card>
  `,
})
export class ReactFileManagerDemos {
  protected readonly demos = FILE_MANAGER_DEMOS;
  protected readonly drive = () => createElement(DriveDemo);
  protected readonly archiveDemo = () => createElement(ArchiveDemo);
  protected readonly reportsDemo = () => createElement(ReportsDemo);
}

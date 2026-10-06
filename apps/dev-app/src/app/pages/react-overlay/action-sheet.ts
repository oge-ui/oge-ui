import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeActionSheet,
  type OgeActionSheetHandle,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  ACTION_SHEET_FILE_ACTIONS,
  ACTION_SHEET_PHOTO_ACTIONS,
} from '../overlay/action-sheet-demo-data';
import { OVERLAY_ACTION_SHEET_DEMOS } from './action-sheet-snippets';

/**
 * TOC of the React view — the same three sections as the Angular action sheet
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_OVERLAY_ACTION_SHEET_SECTIONS = [
  'Basics',
  'Groups, disabled actions & templates',
  'Promise API & events',
] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

function BasicsDemo(): ReactNode {
  const sheet = useRef<OgeActionSheetHandle>(null);
  const [last, setLast] = useState('none');
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        key: 'open',
        type: 'button',
        className: BUTTON,
        onClick: () => void sheet.current?.open(),
      },
      'Photo actions',
    ),
    createElement(OgeActionSheet, {
      key: 'sheet',
      ref: sheet,
      title: 'Photo',
      description: 'Taken on 3 October in Göreme',
      items: ACTION_SHEET_PHOTO_ACTIONS,
      onItemClick: (e) => setLast(e.item.text),
    }),
    createElement(
      'p',
      {
        key: 'last',
        className: 'mt-2 text-sm',
        'data-testid': 'action-sheet-last',
      },
      `Last action: ${last}`,
    ),
  );
}

function GroupsDemo(): ReactNode {
  const [opened, setOpened] = useState(false);
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        key: 'open',
        type: 'button',
        className: BUTTON,
        onClick: () => setOpened(!opened),
      },
      'File actions',
    ),
    createElement(OgeActionSheet, {
      key: 'sheet',
      opened,
      onOpenedChange: setOpened,
      title: 'Quarterly report.pdf',
      items: ACTION_SHEET_FILE_ACTIONS,
      renderItem: ({ item }) =>
        createElement(
          'span',
          { className: 'grid' },
          createElement(
            'strong',
            { key: 't', className: 'font-medium' },
            item.text,
          ),
          item.description
            ? createElement(
                'small',
                { key: 'd', className: 'text-xs opacity-80' },
                item.description,
              )
            : null,
        ),
    }),
  );
}

const LAYOUTS = [
  { key: 'grid', text: 'Grid' },
  { key: 'list', text: 'List' },
  { key: 'preview', text: 'Preview (keeps the sheet open)' },
];

function PromiseDemo(): ReactNode {
  const sheet = useRef<OgeActionSheetHandle>(null);
  const [result, setResult] = useState('Nothing chosen yet');
  const [lock, setLock] = useState(false);
  const choose = async () => {
    const chosen = await sheet.current?.open();
    setResult(chosen ? `Chose ${chosen.text}` : 'Dismissed');
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { key: 'row', className: 'flex flex-wrap items-center gap-3' },
      createElement(
        'button',
        {
          key: 'open',
          type: 'button',
          className: BUTTON,
          onClick: () => void choose(),
        },
        'Choose a layout',
      ),
      createElement(
        'label',
        { key: 'lock', className: 'flex items-center gap-2 text-sm' },
        createElement('input', {
          type: 'checkbox',
          checked: lock,
          onChange: () => setLock(!lock),
        }),
        'Veto backdrop closing',
      ),
    ),
    createElement(OgeActionSheet, {
      key: 'sheet',
      ref: sheet,
      title: 'Layout',
      items: LAYOUTS,
      onItemClick: (e) => {
        e.keepOpen = e.item.key === 'preview';
      },
      onClosing: (e) => {
        e.cancel = lock && e.reason === 'backdrop';
      },
    }),
    createElement(
      'p',
      {
        key: 'result',
        className: 'mt-2 text-sm',
        'data-testid': 'action-sheet-result',
      },
      result,
    ),
  );
}

/**
 * The React half of the action sheet page — rendered inside
 * `/components/overlay/action-sheet` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-action-sheet-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the one stylesheet the React sheet needs — the same SCSS the package
  // build compiles (not the whole overlay sheet: the style budget is per
  // component)
  encapsulation: ViewEncapsulation.None,
  styleUrl:
    '../../../../../../packages/overlay/src/lib/action-sheet/action-sheet.scss',
  template: `
    <app-demo-card
      [chips]="['ref.open()', 'title', 'description', 'items', 'onItemClick']"
      heading="Basics"
      description="Each action has a label, an optional icon (SVG path data) and an optional description; <code>destructive</code> paints it in the danger colour — say it in the text too. ↑/↓ wrap, Home / End jump, Enter or Space choose. Choosing an action closes the sheet and focus returns to the button that opened it."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['group: bottom', 'disabled', 'renderItem']"
      heading="Groups, disabled actions & templates"
      description="<code>group: 'bottom'</code> actions render after a divider. Disabled actions stay focusable, so a screen reader user learns they exist, but never run. <code>renderItem</code> replaces the icon and text; the menu item button, its keyboard and its state stay with the sheet."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="groups" />
    </app-demo-card>

    <app-demo-card
      [chips]="['await open()', 'keepOpen', 'onClosing', 'cancel']"
      heading="Promise API & events"
      description="<code>open()</code> on the ref handle resolves with the chosen action, or <code>null</code> when the sheet was dismissed. <code>onItemClick</code> can set <code>keepOpen</code>, and the cancelable <code>onClosing</code> — with its <code>reason</code>: action, cancel, escape, backdrop, swipe or api — can veto a close."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="promise" />
    </app-demo-card>
  `,
})
export class ReactOverlayActionSheetDemos {
  protected readonly demos = OVERLAY_ACTION_SHEET_DEMOS;
  protected readonly basics = () => createElement(BasicsDemo);
  protected readonly groups = () => createElement(GroupsDemo);
  protected readonly promise = () => createElement(PromiseDemo);
}

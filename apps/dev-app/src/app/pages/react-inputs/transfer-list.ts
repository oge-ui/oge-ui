import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeTransferList } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { DEMO_PERMISSIONS, type DemoPermission } from '../inputs/list-box-data';
import { INPUTS_TRANSFER_LIST_DEMOS } from './transfer-list-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_TRANSFER_LIST_SECTIONS = [
  'Getting started',
  'Search and check boxes',
  'Groups and templates',
  'Cancelable moves',
  'Inside a form',
] as const;

function BasicDemo(): ReactNode {
  const [granted, setGranted] = useState<readonly unknown[]>(['orders.read']);
  return createElement(
    'div',
    null,
    createElement(OgeTransferList<DemoPermission>, {
      key: 'list',
      label: 'Role permissions',
      items: DEMO_PERMISSIONS,
      displayExpr: 'name',
      valueExpr: 'id',
      disabledExpr: 'locked',
      targetTitle: 'Granted',
      height: 240,
      value: granted,
      onValueChange: setGranted,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement(
        'code',
        { 'data-testid': 'transfer-value' },
        JSON.stringify(granted),
      ),
    ),
  );
}

function SearchDemo(): ReactNode {
  const [granted, setGranted] = useState<readonly unknown[]>([]);
  return createElement(OgeTransferList<DemoPermission>, {
    items: DEMO_PERMISSIONS,
    displayExpr: 'name',
    valueExpr: 'id',
    searchEnabled: true,
    showCheckBoxes: true,
    height: 220,
    value: granted,
    onValueChange: setGranted,
  });
}

function TemplatesDemo(): ReactNode {
  const [granted, setGranted] = useState<readonly unknown[]>(['reports.read']);
  return createElement(OgeTransferList<DemoPermission>, {
    items: DEMO_PERMISSIONS,
    displayExpr: 'name',
    valueExpr: 'id',
    groupBy: 'area',
    height: 280,
    value: granted,
    onValueChange: setGranted,
    renderItem: (permission) =>
      createElement(
        'span',
        { className: 'inline-flex w-full items-center justify-between gap-2' },
        createElement('span', null, permission.name),
        createElement(
          'code',
          { className: 'text-xs opacity-70' },
          permission.id,
        ),
      ),
  });
}

function CancelDemo(): ReactNode {
  const [granted, setGranted] = useState<readonly unknown[]>([]);
  const [log, setLog] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeTransferList<DemoPermission>, {
      key: 'list',
      items: DEMO_PERMISSIONS,
      displayExpr: 'name',
      valueExpr: 'id',
      targetTitle: 'Granted (max 3)',
      height: 240,
      value: granted,
      onValueChange: setGranted,
      onMoving: (event) => {
        if (event.to === 'target' && granted.length + event.values.length > 3) {
          event.cancel = true;
          setLog('Vetoed: at most 3 permissions');
        }
      },
      onMoved: (event) =>
        setLog(`${event.values.length} moved by ${event.cause}`),
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Log: ',
      createElement('code', { 'data-testid': 'transfer-log' }, log || '—'),
    ),
  );
}

function FormDemo(): ReactNode {
  const [granted, setGranted] = useState<readonly unknown[]>([]);
  const [touched, setTouched] = useState(false);
  return createElement(OgeTransferList<DemoPermission>, {
    label: 'Granted permissions',
    hint: 'Grant at least one',
    items: DEMO_PERMISSIONS,
    displayExpr: 'name',
    valueExpr: 'id',
    height: 200,
    required: true,
    value: granted,
    onValueChange: setGranted,
    touched,
    onBlur: () => setTouched(true),
    errors: granted.length === 0 ? [{ kind: 'required' }] : [],
  });
}

/**
 * The React half of the transfer list page — the same demo sections as the
 * Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-transfer-list-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['value = target side', 'buttons', 'Ctrl+arrows', 'drag']"
      heading="Getting started"
      description="Select options and use the buttons, press <kbd>Ctrl</kbd>+<kbd>→</kbd> / <kbd>Ctrl</kbd>+<kbd>←</kbd> on a focused list (add <kbd>Shift</kbd> to move everything), or drag an option onto the other list. The locked permission stays where it is."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['searchEnabled', 'showCheckBoxes']"
      heading="Search and check boxes"
      description="A search field above each list; the move-all buttons move what the list currently shows."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="search" />
    </app-demo-card>

    <app-demo-card
      [chips]="['groupBy', 'renderItem']"
      heading="Groups and templates"
      description="<code>groupBy</code>, <code>renderItem</code> and <code>renderGroup</code> apply to both lists."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onMoving', 'cancel', 'onMoved']"
      heading="Cancelable moves"
      description="<code>onMoving</code> fires before every move with <code>cause</code> (<code>'button' | 'keyboard' | 'drag'</code>) — set <code>cancel</code> to veto it. Here the target side holds at most three permissions."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="cancel" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled pair', 'errors', 'touched']"
      heading="Inside a form"
      description="React has no <code>formControl</code> binding — <strong>the controlled pair is the integration point</strong>; pass <code>required</code>, <code>errors</code> and <code>touched</code> from your form layer."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsTransferListDemos {
  protected readonly demos = INPUTS_TRANSFER_LIST_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly search = () => createElement(SearchDemo);
  protected readonly templates = () => createElement(TemplatesDemo);
  protected readonly cancel = () => createElement(CancelDemo);
  protected readonly form = () => createElement(FormDemo);
}

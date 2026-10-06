import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeListBox } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { DEMO_CITIES, type DemoCity } from '../inputs/list-box-data';
import { INPUTS_LIST_BOX_DEMOS } from './list-box-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_LIST_BOX_SECTIONS = [
  'Getting started',
  'Multiple selection',
  'Groups and search',
  'Custom templates',
  'Inside a form',
] as const;

const valueLine = (testId: string, value: unknown): ReactNode =>
  createElement(
    'p',
    { key: 'out', className: 'mt-3 text-sm' },
    'Value: ',
    createElement(
      'code',
      { 'data-testid': testId },
      JSON.stringify(value ?? null),
    ),
  );

function BasicDemo(): ReactNode {
  const [city, setCity] = useState<unknown>(3);
  return createElement(
    'div',
    null,
    createElement(OgeListBox<DemoCity>, {
      key: 'list',
      label: 'City',
      items: DEMO_CITIES,
      displayExpr: 'name',
      valueExpr: 'id',
      disabledExpr: 'closed',
      height: 220,
      value: city,
      onValueChange: setCity,
    }),
    valueLine('list-box-value', city),
  );
}

function MultipleDemo(): ReactNode {
  const [picked, setPicked] = useState<unknown>([2, 6]);
  return createElement(
    'div',
    null,
    createElement(OgeListBox<DemoCity>, {
      key: 'list',
      label: 'Cities to visit',
      items: DEMO_CITIES,
      displayExpr: 'name',
      valueExpr: 'id',
      disabledExpr: 'closed',
      selectionMode: 'multiple',
      showCheckBoxes: true,
      height: 220,
      value: picked,
      onValueChange: setPicked,
    }),
    valueLine('list-box-multi-value', picked),
  );
}

function GroupsDemo(): ReactNode {
  const [office, setOffice] = useState<unknown>(null);
  return createElement(OgeListBox<DemoCity>, {
    label: 'Office',
    items: DEMO_CITIES,
    displayExpr: 'name',
    valueExpr: 'id',
    groupBy: 'country',
    searchEnabled: true,
    height: 260,
    value: office,
    onValueChange: setOffice,
  });
}

function TemplatesDemo(): ReactNode {
  const [value, setValue] = useState<unknown>([1]);
  return createElement(OgeListBox<DemoCity>, {
    label: 'Cities',
    items: DEMO_CITIES,
    displayExpr: 'name',
    valueExpr: 'id',
    groupBy: 'country',
    selectionMode: 'multiple',
    height: 260,
    value,
    onValueChange: setValue,
    renderItem: (city, { selected }) =>
      createElement(
        'span',
        { className: 'inline-flex items-center gap-2' },
        createElement(
          'span',
          {
            className:
              'inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
            'aria-hidden': 'true',
          },
          city.name.charAt(0),
        ),
        city.name,
        selected
          ? createElement('small', { className: 'opacity-70' }, 'selected')
          : null,
      ),
    renderGroup: (label, { count }) => `${label} · ${count}`,
  });
}

function FormDemo(): ReactNode {
  const [value, setValue] = useState<unknown>([]);
  const [touched, setTouched] = useState(false);
  const empty = !Array.isArray(value) || value.length === 0;
  return createElement(
    'div',
    null,
    createElement(OgeListBox<DemoCity>, {
      key: 'list',
      label: 'Destinations',
      hint: 'Pick at least one',
      items: DEMO_CITIES,
      displayExpr: 'name',
      valueExpr: 'id',
      selectionMode: 'multiple',
      height: 200,
      required: true,
      value,
      onValueChange: setValue,
      touched,
      onBlur: () => setTouched(true),
      errors: empty ? [{ kind: 'required' }] : [],
    }),
    createElement(
      'p',
      { key: 'valid', className: 'mt-3 text-sm' },
      'Valid: ',
      createElement(
        'code',
        { 'data-testid': 'list-box-valid' },
        String(!empty),
      ),
    ),
  );
}

/**
 * The React half of the list box page — the same demo sections as the
 * Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-list-box-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['single', 'selection follows focus', 'disabledExpr']"
      heading="Getting started"
      description="Arrows, Home/End and PageUp/PageDown move the active option and select it; typing jumps by prefix (accent-insensitive). Disabled options are skipped."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['multiple', 'showCheckBoxes', 'Shift ranges', 'Ctrl+A']"
      heading="Multiple selection"
      description='<code>selectionMode="multiple"</code> sets <code>aria-multiselectable</code>: Space, Enter and clicks toggle, Shift+arrows and Shift+click extend from the anchor, Ctrl+A selects all. The value is an items-ordered array.'
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="multiple" />
    </app-demo-card>

    <app-demo-card
      [chips]="['groupBy', 'searchEnabled', 'role=group']"
      heading="Groups and search"
      description='<code>groupBy</code> renders labelled <code>role="group"</code>s; <code>searchEnabled</code> adds a filter field above the list.'
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="groups" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderItem', 'renderGroup']"
      heading="Custom templates"
      description="<code>renderItem</code> replaces the option content — role, state and check glyph stay; <code>renderGroup</code> gets the label and the option count."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
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
export class ReactInputsListBoxDemos {
  protected readonly demos = INPUTS_LIST_BOX_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly multiple = () => createElement(MultipleDemo);
  protected readonly groups = () => createElement(GroupsDemo);
  protected readonly templates = () => createElement(TemplatesDemo);
  protected readonly form = () => createElement(FormDemo);
}

import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeMention,
  type OgeMentionToken,
  type OgeMentionTrigger,
} from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_MENTION_DEMOS } from './mention-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_MENTION_SECTIONS = [
  'Getting started',
  'Several triggers',
  'Remote suggestions',
  'Custom suggestion rows',
  'Inside a form',
] as const;

interface User {
  id: number;
  name: string;
  role: string;
}

interface Tag {
  name: string;
}

const USERS: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Engineer' },
  { id: 2, name: 'Alan Turing', role: 'Researcher' },
  { id: 3, name: 'Grace Hopper', role: 'Admiral' },
  { id: 4, name: 'Margaret Hamilton', role: 'Director' },
];

const TRIGGERS: OgeMentionTrigger<Tag>[] = [
  {
    char: '@',
    items: [{ name: 'ada' }, { name: 'grace' }],
    displayExpr: 'name',
  },
  {
    char: '#',
    items: [{ name: 'urgent' }, { name: 'bug' }, { name: 'docs' }],
    displayExpr: 'name',
  },
];

const search = (query: string): Promise<User[]> =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          USERS.filter((u) =>
            u.name.toLowerCase().includes(query.toLowerCase()),
          ),
        ),
      300,
    ),
  );

function BasicDemo(): ReactNode {
  const [text, setText] = useState('');
  const [mentioned, setMentioned] = useState<readonly OgeMentionToken<User>[]>(
    [],
  );
  return createElement(
    'div',
    null,
    createElement(OgeMention<User>, {
      key: 'mention',
      label: 'Comment',
      items: USERS,
      displayExpr: 'name',
      valueExpr: 'id',
      allowSpaces: true,
      fluid: true,
      value: text,
      onValueChange: setText,
      mentions: mentioned,
      onMentionsChange: setMentioned,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Mentioned ids: ',
      createElement(
        'code',
        { 'data-testid': 'mention-ids' },
        mentioned.map((m) => String(m.value)).join(', ') || '—',
      ),
    ),
  );
}

function TriggersDemo(): ReactNode {
  return createElement(OgeMention<Tag>, {
    label: 'Task',
    triggers: TRIGGERS,
    multiline: false,
  });
}

function RemoteDemo(): ReactNode {
  return createElement(OgeMention<User>, {
    label: 'Message',
    items: search,
    displayExpr: 'name',
    searchTimeout: 200,
    minSearchLength: 1,
  });
}

function TemplateDemo(): ReactNode {
  return createElement(OgeMention<User>, {
    label: 'Reply',
    items: USERS,
    displayExpr: 'name',
    renderItem: (user) =>
      createElement(
        'span',
        { className: 'flex flex-col' },
        createElement('strong', { key: 'n' }, user.name),
        createElement('small', { key: 'r' }, user.role),
      ),
  });
}

function FormDemo(): ReactNode {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  return createElement(OgeMention<User>, {
    label: 'Note',
    items: USERS,
    displayExpr: 'name',
    hint: 'Mention a reviewer with @',
    required: true,
    value: note,
    onValueChange: setNote,
    touched,
    onBlur: () => setTouched(true),
    errors: note ? [] : [{ kind: 'required' }],
  });
}

/**
 * The React half of the mention page — the same demo sections as the
 * Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-mention-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['items', 'displayExpr', 'mentions']"
      heading="Getting started"
      description="Type <code>&#64;</code> at the start or after a space. Arrows move, Enter or Tab inserts <code>&#64;Name </code>, Escape closes the list until the next trigger. <code>mentions</code> + <code>onMentionsChange</code> report what was mentioned and follow later edits."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['triggers', 'multiline: false']"
      heading="Several triggers"
      description="<code>triggers</code> takes several characters, each with its own items and expressions — people on <code>&#64;</code>, tags on <code>#</code>. <code>multiline={false}</code> renders a single-line combobox."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="triggers" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'items: (query) => Promise',
        'searchTimeout',
        'minSearchLength',
      ]"
      heading="Remote suggestions"
      description="<code>items</code> may be a function of the typed query returning items or a promise: debounced by <code>searchTimeout</code>, stale answers dropped, loading / error rows meanwhile."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="remote" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderItem', 'context']"
      heading="Custom suggestion rows"
      description="<code>renderItem(item, context)</code> renders each row; the context carries the <code>index</code>, <code>trigger</code>, <code>query</code> and <code>active</code>."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="template" />
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
export class ReactInputsMentionDemos {
  protected readonly demos = INPUTS_MENTION_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly triggers = () => createElement(TriggersDemo);
  protected readonly remote = () => createElement(RemoteDemo);
  protected readonly template = () => createElement(TemplateDemo);
  protected readonly form = () => createElement(FormDemo);
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  OgeMention,
  OgeMentionItemTemplate,
  type OgeMentionToken,
  type OgeMentionTrigger,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_MENTION_SECTIONS,
  ReactInputsMentionDemos,
} from '../react-inputs/mention';
import {
  BASIC_SNIPPET,
  FORMS_SNIPPET,
  REMOTE_SNIPPET,
  TEMPLATE_SNIPPET,
  TRIGGERS_SNIPPET,
} from './mention-snippets';

const SECTIONS = [
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

export const MENTION_DEMO_USERS: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Engineer' },
  { id: 2, name: 'Alan Turing', role: 'Researcher' },
  { id: 3, name: 'Grace Hopper', role: 'Admiral' },
  { id: 4, name: 'Margaret Hamilton', role: 'Director' },
];

/** The remote demo's fake server: filters after a short delay. */
export function searchMentionDemoUsers(query: string): Promise<User[]> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          MENTION_DEMO_USERS.filter((u) =>
            u.name.toLowerCase().includes(query.toLowerCase()),
          ),
        ),
      300,
    ),
  );
}

@Component({
  selector: 'app-inputs-mention',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeMention,
    OgeMentionItemTemplate,
    ReactiveFormsModule,
    ReactInputsMentionDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Mention"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['@ / # triggers', 'caret popup', 'APG combobox', 'forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeMention /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is a text area with
          <code>&#64;</code>-style mentions: a trigger character opens a
          caret-anchored suggestion list, the pick is inserted as plain text,
          and <code>mentions</code> + <code>onMentionsChange</code> report the
          mentioned items and their positions.
        </p>
      } @else {
        <p>
          A text area with <code>&#64;</code>-style mentions — Syncfusion's
          Mention: typing a trigger character at the start or after a space
          opens a caret-anchored suggestion list on the suite's anchored popup,
          and the pick is inserted as a plain-text token. The value is the text;
          <code>[(mentions)]</code> reports what was mentioned — item, value and
          position — and follows every later edit.
        </p>
        <p>
          Arrows move, Enter or Tab inserts, Escape closes until the next
          trigger. A single-line field is a WAI-ARIA combobox; the text area
          keeps its textbox role with <code>aria-activedescendant</code>.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-mention-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'displayExpr', '[(mentions)]']"
        heading="Getting started"
        description="Type <code>&#64;</code> at the start or after a space. Arrows move, Enter or Tab inserts <code>&#64;Name </code>, Escape closes the list until the next trigger. <code>allowSpaces</code> lets a query run across a space (<code>&#64;Ada Lo</code>); a mention edited away drops out of <code>mentions</code>."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-mention
          label="Comment"
          [items]="users"
          displayExpr="name"
          valueExpr="id"
          [allowSpaces]="true"
          [fluid]="true"
          [(value)]="text"
          [(mentions)]="mentioned"
        />
        <p class="mt-3 text-sm">
          Mentioned ids:
          <code data-testid="mention-ids">{{ ids() || '—' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['triggers', 'multiline: false']"
        heading="Several triggers"
        description='<code>triggers</code> takes several characters, each with its own items and expressions — people on <code>&#64;</code>, tags on <code>#</code>. <code>[multiline]="false"</code> renders a single-line combobox.'
        [code]="triggersSnippet"
        language="ts"
      >
        <oge-mention label="Task" [triggers]="triggers" [multiline]="false" />
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'items: (query) => Promise',
          'searchTimeout',
          'minSearchLength',
        ]"
        heading="Remote suggestions"
        description="<code>items</code> may be a function of the typed query returning items or a promise: it is debounced by <code>searchTimeout</code>, stale answers are dropped, and loading / error rows show meanwhile. <code>searchChanged</code> reports each query for your own fetching."
        [code]="remoteSnippet"
        language="ts"
      >
        <oge-mention
          label="Message"
          [items]="search"
          displayExpr="name"
          [searchTimeout]="200"
          [minSearchLength]="1"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeMentionItemTemplate', 'context']"
        heading="Custom suggestion rows"
        description="An <code>&lt;ng-template ogeMentionItemTemplate&gt;</code> child renders each row; its context carries the item (<code>$implicit</code>), <code>index</code>, <code>trigger</code>, <code>query</code> and <code>active</code>."
        [code]="templateSnippet"
        language="ts"
      >
        <oge-mention label="Reply" [items]="users" displayExpr="name">
          <ng-template ogeMentionItemTemplate let-user>
            <span class="flex flex-col">
              <strong>{{ user.name }}</strong>
              <small>{{ user.role }}</small>
            </span>
          </ng-template>
        </oge-mention>
      </app-demo-card>

      <app-demo-card
        [chips]="['formControl', 'Validators.required']"
        heading="Inside a form"
        description="A <code>FormValueControl</code> and a ControlValueAccessor — the bound value is the text itself, so every validator works unchanged."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-mention
          label="Note"
          [items]="users"
          displayExpr="name"
          hint="Mention a reviewer with @"
          [formControl]="note"
        />
        <p class="mt-3 text-sm">
          Valid: <code>{{ note.valid }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsMentionPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_MENTION_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly triggersSnippet = TRIGGERS_SNIPPET;
  protected readonly remoteSnippet = REMOTE_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly users = MENTION_DEMO_USERS;
  protected readonly text = signal('');
  protected readonly mentioned = signal<readonly OgeMentionToken<User>[]>([]);
  protected readonly ids = computed(() =>
    this.mentioned()
      .map((m) => m.value)
      .join(', '),
  );
  protected readonly triggers: OgeMentionTrigger<Tag>[] = [
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
  protected readonly search = searchMentionDemoUsers;
  protected readonly note = new FormControl('', [Validators.required]);
}

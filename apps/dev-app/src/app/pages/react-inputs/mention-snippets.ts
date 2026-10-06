import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const USERS = `interface User {
  id: number;
  name: string;
  role: string;
}

const users: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Engineer' },
  { id: 2, name: 'Alan Turing', role: 'Researcher' },
  { id: 3, name: 'Grace Hopper', role: 'Admiral' },
  { id: 4, name: 'Margaret Hamilton', role: 'Director' },
];`;

/**
 * Demo sources for the React mention page. Pure data — the generator and
 * the compile gate load it in plain Node. Section-for-section mirror of
 * `../inputs/mention.ts`.
 */
export const INPUTS_MENTION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'Type @ at the start or after a space: arrows move, Enter or Tab inserts "@Name ", Escape closes until the next trigger. mentions + onMentionsChange report what was mentioned and follow later edits.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMention'] },
      types: { '@oge-ui/react-inputs': ['OgeMentionToken'] },
      before: USERS,
      name: 'MentionDemo',
      body: `const [text, setText] = useState('');
const [mentioned, setMentioned] = useState<readonly OgeMentionToken<User>[]>([]);`,
      jsx: `<>
  <OgeMention<User>
    label="Comment"
    items={users}
    displayExpr="name"
    valueExpr="id"
    allowSpaces
    fluid
    value={text}
    onValueChange={setText}
    mentions={mentioned}
    onMentionsChange={setMentioned}
  />
  <p className="mt-3 text-sm">
    Mentioned ids: <code>{mentioned.map((m) => String(m.value)).join(', ') || '—'}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Several triggers',
    description:
      'triggers takes several characters, each with its own items and expressions — people on @, tags on #. multiline={false} renders a single-line combobox.',
    source: reactDemoSource({
      use: { '@oge-ui/react-inputs': ['OgeMention'] },
      types: { '@oge-ui/react-inputs': ['OgeMentionTrigger'] },
      before: `interface Tag {
  name: string;
}

const triggers: OgeMentionTrigger<Tag>[] = [
  { char: '@', items: [{ name: 'ada' }, { name: 'grace' }], displayExpr: 'name' },
  { char: '#', items: [{ name: 'urgent' }, { name: 'bug' }, { name: 'docs' }], displayExpr: 'name' },
];`,
      name: 'MentionTriggersDemo',
      jsx: `<OgeMention<Tag> label="Task" triggers={triggers} multiline={false} />`,
    }),
  },
  {
    title: 'Remote suggestions',
    description:
      'items may be a function of the typed query returning items or a promise: debounced by searchTimeout, stale answers dropped, loading / error rows meanwhile.',
    source: reactDemoSource({
      use: { '@oge-ui/react-inputs': ['OgeMention'] },
      before: `${USERS}

const search = (query: string): Promise<User[]> =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())),
        ),
      300,
    ),
  );`,
      name: 'MentionRemoteDemo',
      jsx: `<OgeMention<User>
  label="Message"
  items={search}
  displayExpr="name"
  searchTimeout={200}
  minSearchLength={1}
/>`,
    }),
  },
  {
    title: 'Custom suggestion rows',
    description:
      'renderItem(item, context) renders each row; the context carries the index, trigger, query and whether the row is active.',
    source: reactDemoSource({
      use: { '@oge-ui/react-inputs': ['OgeMention'] },
      before: USERS,
      name: 'MentionTemplateDemo',
      jsx: `<OgeMention<User>
  label="Reply"
  items={users}
  displayExpr="name"
  renderItem={(user) => (
    <span className="flex flex-col">
      <strong>{user.name}</strong>
      <small>{user.role}</small>
    </span>
  )}
/>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'React has no formControl binding — the controlled pair is the integration point; pass required, errors and touched from your form layer.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMention'] },
      before: USERS,
      name: 'MentionFormDemo',
      body: `const [note, setNote] = useState('');
const [touched, setTouched] = useState(false);`,
      jsx: `<OgeMention<User>
  label="Note"
  items={users}
  displayExpr="name"
  hint="Mention a reviewer with @"
  required
  value={note}
  onValueChange={setNote}
  touched={touched}
  onBlur={() => setTouched(true)}
  errors={note ? [] : [{ kind: 'required' }]}
/>`,
    }),
  },
];

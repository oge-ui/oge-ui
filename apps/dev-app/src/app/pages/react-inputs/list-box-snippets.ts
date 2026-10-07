import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const CITIES = `interface City {
  id: number;
  name: string;
  country: string;
  closed?: boolean;
}

const cities: City[] = [
  { id: 1, name: 'Amsterdam', country: 'Netherlands' },
  { id: 2, name: 'Ankara', country: 'Türkiye' },
  { id: 3, name: 'Berlin', country: 'Germany' },
  { id: 4, name: 'Bonn', country: 'Germany', closed: true },
  { id: 5, name: 'Hamburg', country: 'Germany' },
  { id: 6, name: 'İstanbul', country: 'Türkiye' },
  { id: 7, name: 'İzmir', country: 'Türkiye' },
  { id: 8, name: 'Rotterdam', country: 'Netherlands' },
];`;

/**
 * Demo sources for the React list box page. Pure data — the generator and
 * the compile gate load it in plain Node. Section-for-section mirror of
 * `../inputs/list-box.ts`.
 */
export const INPUTS_LIST_BOX_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'One tab stop with aria-activedescendant: arrows, Home/End and PageUp/PageDown move the active option and select it (single mode); typing jumps by prefix; disabled options are skipped.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeListBox'] },
      name: 'ListBoxDemo',
      before: CITIES,
      body: `const [city, setCity] = useState<unknown>(3);`,
      jsx: `<>
  <OgeListBox
    label="City"
    items={cities}
    displayExpr="name"
    valueExpr="id"
    disabledExpr="closed"
    height={220}
    value={city}
    onValueChange={setCity}
  />
  <p className="mt-3 text-sm">
    Value: <code>{JSON.stringify(city)}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Multiple selection',
    description:
      'selectionMode="multiple" sets aria-multiselectable: Space, Enter and clicks toggle, Shift extends from the anchor, Ctrl+Shift+Home/End select to an edge, Ctrl+A selects all. The value is an items-ordered array.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeListBox'] },
      name: 'ListBoxMultipleDemo',
      before: CITIES,
      body: `const [picked, setPicked] = useState<unknown>([2, 6]);`,
      jsx: `<>
  <OgeListBox
    label="Cities to visit"
    items={cities}
    displayExpr="name"
    valueExpr="id"
    disabledExpr="closed"
    selectionMode="multiple"
    showCheckBoxes
    height={220}
    value={picked}
    onValueChange={setPicked}
  />
  <p className="mt-3 text-sm">
    Value: <code>{JSON.stringify(picked)}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Groups and search',
    description:
      'groupBy renders each group as a role="group" labelled by its header; searchEnabled adds a filter field (ArrowDown moves into the list).',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeListBox'] },
      name: 'ListBoxGroupsDemo',
      before: CITIES,
      body: `const [office, setOffice] = useState<unknown>(null);`,
      jsx: `<OgeListBox
  label="Office"
  items={cities}
  displayExpr="name"
  valueExpr="id"
  groupBy="country"
  searchEnabled
  height={260}
  value={office}
  onValueChange={setOffice}
/>`,
    }),
  },
  {
    title: 'Custom templates',
    description:
      'renderItem replaces the option content (role, state and check glyph stay); renderGroup gets the label and the option count.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeListBox'] },
      name: 'ListBoxTemplatesDemo',
      before: CITIES,
      body: `const [value, setValue] = useState<unknown>([1]);`,
      jsx: `<OgeListBox
  label="Cities"
  items={cities}
  displayExpr="name"
  valueExpr="id"
  groupBy="country"
  selectionMode="multiple"
  height={260}
  value={value}
  onValueChange={setValue}
  renderItem={(city, { selected }) => (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true">{city.name.charAt(0)}</span>
      {city.name}
      {selected && <small>selected</small>}
    </span>
  )}
  renderGroup={(label, { count }) => \`\${label} · \${count}\`}
/>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'React has no formControl binding — the controlled pair is the integration point; pass required, errors and touched from your form layer.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeListBox'] },
      name: 'ListBoxFormDemo',
      before: CITIES,
      body: `const [value, setValue] = useState<unknown>([]);
const [touched, setTouched] = useState(false);
const empty = !Array.isArray(value) || value.length === 0;`,
      jsx: `<OgeListBox
  label="Destinations"
  hint="Pick at least one"
  items={cities}
  displayExpr="name"
  valueExpr="id"
  selectionMode="multiple"
  height={200}
  required
  value={value}
  onValueChange={setValue}
  touched={touched}
  onBlur={() => setTouched(true)}
  errors={empty ? [{ kind: 'required' }] : []}
/>`,
    }),
  },
  {
    title: 'Reordering',
    description:
      'allowReordering lets the user reorder the options: Alt+↑/↓ moves the active option, a pointer drag drops it before or after another (touch: after a long press). Each move runs the cancelable onReordering → onReordered pair and is announced; keep the order by storing the items onReordered hands you.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeListBox'] },
      name: 'ListBoxReorderDemo',
      before: CITIES,
      body: `const [route, setRoute] = useState(cities.slice(0, 5));`,
      jsx: `<OgeListBox
  label="Route"
  items={route}
  displayExpr="name"
  valueExpr="id"
  allowReordering
  height={260}
  onReordered={(event) => setRoute(event.items)}
/>`,
    }),
  },
];

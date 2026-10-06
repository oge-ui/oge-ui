import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React avatar & badge page. Pure data, no React imports
 * — the `llms.txt` generator and the compile gate load this module in plain
 * Node.
 *
 * Section-for-section mirror of `../layout/avatar.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same eight sections, same order, same
 * example content, React idiom (`onImageFailed` for `(imageFailed)`,
 * children for the projected content).
 */
const TEAM = `const team: OgeAvatarItem[] = [
  { key: 1, name: 'Ada Lovelace', status: 'online' },
  { key: 2, name: 'Grace Hopper' },
  { key: 3, name: 'Alan Turing', status: 'away' },
  { key: 4, name: 'Edsger Dijkstra' },
  { key: 5, name: 'Barbara Liskov' },
  { key: 6, name: 'Donald Knuth' },
];`;

export const LAYOUT_AVATAR_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Image, initials & icon',
    description:
      'The fallback chain runs on its own: the image while src loads, the initials (explicit, or derived from name) when it fails, the person icon without either. A new src gets a fresh attempt.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAvatar'] },
      name: 'AvatarContentDemo',
      body: `const [failed, setFailed] = useState('');`,
      jsx: `<>
  {/* role="img" named by the name; the image, the initials and the icon are
      aria-hidden content of it. */}
  <OgeAvatar name="OGE UI" src="/logo.png" />
  <OgeAvatar
    name="Ada Lovelace"
    src="/missing-avatar.png"
    onImageFailed={(event) => setFailed(event.src)}
  />
  <OgeAvatar name="Grace Hopper" initials="GH" />
  <OgeAvatar ariaLabel="Guest" />
  <p>imageFailed → {failed || '—'}</p>
</>`,
    }),
  },
  {
    title: 'Sizes & shapes',
    description:
      'Five sizes (24 to 64 px) on one host-local knob, so the fallback never shifts layout; rounded uses the --oge-radius-lg token.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAvatar'] },
      name: 'AvatarSizesDemo',
      before: `const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;`,
      jsx: `<>
  {sizes.map((size) => (
    <OgeAvatar key={size} name="Ada Lovelace" size={size} />
  ))}
  <OgeAvatar name="Grace Hopper" size="lg" shape="rounded" />
  <OgeAvatar name="Alan Turing" size="lg" shape="square" />
</>`,
    }),
  },
  {
    title: 'Presence status',
    description:
      'The dot is aria-hidden; the presence joins the accessible name ("Ada Lovelace (Online)"). Offline is a hollow ring. Beside a visible name, decorative hides the avatar from assistive technology.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAvatar'] },
      name: 'AvatarStatusDemo',
      jsx: `<>
  <OgeAvatar name="Ada Lovelace" status="online" />
  <OgeAvatar name="Grace Hopper" status="away" />
  <OgeAvatar name="Alan Turing" status="busy" />
  <OgeAvatar name="Edsger Dijkstra" status="offline" />
  <span>
    <OgeAvatar name="Ada Lovelace" size="sm" decorative />
    Ada Lovelace
  </span>
</>`,
    }),
  },
  {
    title: 'Avatar group',
    description:
      'max counts the rendered circles INCLUDING the surplus one; total adds the rest of a partially loaded list. The "+N" avatar is a role="img" named "N more", the group a labelled role="group". Children follow the items.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAvatar', 'OgeAvatarGroup'] },
      types: { '@oge-ui/react-layout': ['OgeAvatarItem'] },
      name: 'AvatarGroupDemo',
      before: `${TEAM}
// three of 24 reviewers are loaded — total counts the rest into "+N"
const reviewers = team.slice(0, 3);`,
      jsx: `<>
  <OgeAvatarGroup items={team} max={4} ariaLabel="Project team" />
  <OgeAvatarGroup
    items={reviewers}
    max={4}
    total={24}
    size="sm"
    ariaLabel="Reviewers"
  />
  <OgeAvatarGroup overlap={false} ariaLabel="On call">
    <OgeAvatar name="Ada Lovelace" status="online" />
    <OgeAvatar name="Grace Hopper" status="busy" />
  </OgeAvatarGroup>
</>`,
    }),
  },
  {
    title: 'Badge on an element',
    description:
      'Children become the anchor. The glyph is aria-hidden; the wrapped control’s aria-describedby points at the description, so a screen reader hears "Inbox, 5 new items". Above max it shows 99+; overlap="circle" sits on a round host’s outline.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAvatar', 'OgeBadge'] },
      name: 'BadgeOverlayDemo',
      body: `const [unread, setUnread] = useState(5);`,
      jsx: `<>
  <OgeBadge value={unread}>
    <button type="button" onClick={() => setUnread(unread + 1)}>
      Inbox
    </button>
  </OgeBadge>
  <OgeBadge value={120} severity="accent" position="bottom-end">
    <button type="button">Notifications</button>
  </OgeBadge>
  <OgeBadge dot severity="success" overlap="circle" description="Available">
    <OgeAvatar name="Grace Hopper" />
  </OgeBadge>
</>`,
    }),
  },
  {
    title: 'Standalone badge & dot',
    description:
      'Without children the badge is an inline pill with a visually hidden description. A zero count hides unless showZero; invisible force-hides; a string value reads itself.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeBadge'] },
      name: 'BadgeStandaloneDemo',
      jsx: `<>
  <span>Messages <OgeBadge value={3} /></span>
  <span>Plan <OgeBadge value="Beta" severity="accent" /></span>
  <span>Updates <OgeBadge dot description="New updates" /></span>
  <span>
    Errors <OgeBadge value={0} showZero severity="neutral" size="sm" />
  </span>
</>`,
    }),
  },
  {
    title: 'Live announcements',
    description:
      'announce speaks later changes through a polite live region. The initial value is part of the page and is never announced.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeBadge'] },
      name: 'BadgeAnnounceDemo',
      body: `const [cart, setCart] = useState(1);`,
      jsx: `<>
  <OgeBadge value={cart} announce description={\`\${cart} items in cart\`}>
    <button type="button">Cart</button>
  </OgeBadge>
  <button type="button" onClick={() => setCart(cart + 1)}>
    Add item
  </button>
</>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      'Subtree-scoped defaults. Every user-facing string — presence labels, "N more", the badge descriptions and the "99+" pattern — lives in a messages catalog, and the ready-made language packs cover it.',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-layout': [
          'OgeAvatar',
          'OgeAvatarConfigProvider',
          'OgeBadge',
          'OgeBadgeConfigProvider',
        ],
      },
      name: 'AvatarConfigDemo',
      jsx: `<OgeAvatarConfigProvider
  config={{ size: 'sm', messages: { busy: 'In a meeting' } }}
>
  <OgeBadgeConfigProvider config={{ max: 9, severity: 'accent' }}>
    <OgeAvatar name="Ada Lovelace" status="busy" />
    <OgeBadge value={12} />
  </OgeBadgeConfigProvider>
</OgeAvatarConfigProvider>`,
    }),
  },
];

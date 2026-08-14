import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/navigation/src/lib/breadcrumb.tsx — keep
 * in sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../navigation/breadcrumb-api-data.ts` (the parity
 * gate diffs the two member by member): the same props, the public method on
 * the `ref` handle, a callback in place of the output, render props in place
 * of the two `ng-template` slots and the context provider in place of the DI
 * one.
 *
 * The second block is the React face of `<oge-breadcrumb-item>`: React
 * reserves the `key` prop, so a crumb component could not carry the identity
 * `key` means here — a crumb is an `OgeBreadcrumbItemData` object in the
 * `items` array, with the same fields.
 */

const PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'items',
        type: 'readonly OgeBreadcrumbItemData[] | undefined',
        description:
          'Data-driven trail — a flat list, never nested. The <strong>only</strong> crumb API in React: the Angular layer also accepts declarative <code>&lt;oge-breadcrumb-item&gt;</code> children, which React cannot mirror because <code>key</code> is reserved by React itself.',
      },
      {
        name: 'collapseMode',
        type: "'auto' | 'wrap' | 'none'",
        default: "'auto'",
        description:
          "<code>'auto'</code> collapses the <strong>oldest middle</strong> crumbs into an ellipsis menu against the breadcrumb's own <strong>container</strong> width (never the window) — the first and last crumb always stay visible, and the collapsed crumbs remain reachable as real links. <code>'wrap'</code> breaks onto multiple rows; <code>'none'</code> keeps one scrollable row. The fitting arithmetic is core's pure <code>fitToolbarItems</code>.",
      },
      {
        name: 'messages',
        type: 'Partial&lt;OgeBreadcrumbMessages&gt; | undefined',
        description:
          'Per-instance overrides of the user-facing strings, merged over <code>&lt;OgeBreadcrumbConfigProvider&gt;</code>.',
      },
      {
        name: 'renderItem',
        type: '(context: OgeBreadcrumbItemRenderContext) =&gt; ReactNode',
        description:
          "Replaces the crumb's interior only — the link/current/disabled element semantics stay with the component. The React face of <code>[ogeBreadcrumbItemTemplate]</code> (documented in the Angular block&rsquo;s types table); the context carries <code>item</code>, <code>index</code> and <code>last</code>.",
      },
      {
        name: 'renderSeparator',
        type: '(context: OgeBreadcrumbSeparatorRenderContext) =&gt; ReactNode',
        description:
          'Replaces the default chevron separator — the React face of <code>[ogeBreadcrumbSeparatorTemplate]</code>. Rendered <code>aria-hidden</code>: a separator is decoration, never content (APG).',
      },
    ],
  },
  {
    title: 'Host',
    entries: [
      {
        name: 'className',
        type: 'string | undefined',
        description:
          'Extra classes on the breadcrumb element — the React host styling idiom; an Angular host takes <code>class</code> natively.',
      },
      {
        name: 'style',
        type: 'CSSProperties | undefined',
        description: 'Inline styles on the breadcrumb element.',
      },
      {
        name: 'id',
        type: 'string | undefined',
        description:
          'Id of the breadcrumb element; the crumbs derive their own ids independently.',
      },
    ],
  },
];

const METHOD_GROUPS: readonly ApiGroup[] = [
  {
    title: 'OgeBreadcrumbHandle (ref)',
    entries: [
      {
        name: 'focus()',
        type: 'void',
        description:
          'Focuses the first interactive crumb — or the ellipsis button when the trail is collapsed.',
      },
    ],
  },
];

const EVENT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'onItemClick',
        type: '(event: OgeBreadcrumbItemClickEvent) =&gt; void',
        description:
          'A crumb (inline or inside the ellipsis menu) was activated. <strong>Not fired</strong> by disabled crumbs or by the last crumb — that is the current page. On <code>url</code> crumbs, <code>event.event.preventDefault()</code> hands navigation to a router.',
      },
    ],
  },
];

const TYPE_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeBreadcrumbItemData<T>',
        type: '{ text; key?; value?; url?; hint?; icon?; iconClass?; disabled?; visible? }',
        description:
          'A deliberately narrow interface — no submenu, checked or shortcut fields, because none of them mean anything on a trail. <code>url</code> renders the crumb as a real <code>&lt;a href&gt;</code> (ignored on the last crumb); <code>disabled</code> crumbs are exposed via <code>aria-disabled</code> but inert; <code>visible: false</code> removes the crumb.',
      },
      {
        name: 'OgeBreadcrumbCollapseMode',
        type: "'auto' | 'wrap' | 'none'",
        description: 'How the breadcrumb behaves when room runs out.',
      },
      {
        name: 'OgeBreadcrumbItemClickEvent',
        type: '{ item; key?; index; event }',
        description:
          '<code>index</code> is the position within the full trail, collapsed crumbs included.',
      },
      {
        name: 'OgeBreadcrumbItemRenderContext',
        type: '{ item; index; last }',
        description:
          'Context of <code>renderItem</code> — the React face of <code>OgeBreadcrumbItemTemplateContext</code>. <code>last</code> is <code>true</code> on the current page&rsquo;s crumb.',
      },
      {
        name: 'OgeBreadcrumbSeparatorRenderContext',
        type: '{ index }',
        description:
          'Context of <code>renderSeparator</code> — the index of the crumb the separator precedes.',
      },
      {
        name: 'OgeBreadcrumbHandle',
        type: 'interface',
        description:
          'The <code>ref</code> handle: <code>focus</code> — the React face of the Angular public method.',
      },
      {
        name: 'OgeBreadcrumbProps',
        type: 'interface',
        description:
          'Props of <code>&lt;OgeBreadcrumb&gt;</code>, render props included.',
      },
    ],
  },
];

export const OGE_REACT_BREADCRUMB_API: ApiSections = {
  properties: PROPERTY_GROUPS,
  methods: METHOD_GROUPS,
  events: EVENT_GROUPS,
  types: TYPE_GROUPS,
};

/**
 * The React face of `<oge-breadcrumb-item>`: a crumb is an object in the
 * `items` array — the same fields as the Angular directive's inputs.
 */
export const OGE_REACT_BREADCRUMB_ITEM_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'text',
          type: 'string',
          default: "''",
          description: 'Label of the crumb.',
        },
        {
          name: 'key',
          type: 'string | undefined',
          description:
            'Stable identity used in event payloads and DOM ids. Not React&rsquo;s <code>key</code> — a crumb is data, so nothing collides.',
        },
        {
          name: 'value',
          type: 'unknown',
          description: 'Consumer-defined value carried through click events.',
        },
        {
          name: 'url',
          type: 'string | undefined',
          description:
            'Renders the crumb as a real link (<code>&lt;a href&gt;</code>).',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description: 'Tooltip (native <code>title</code>).',
        },
        {
          name: 'icon',
          type: 'string | undefined',
          description:
            'SVG path data (<code>d</code>) for a leading <code>aria-hidden</code> icon.',
        },
        {
          name: 'iconClass',
          type: 'string | undefined',
          description:
            'Class(es) for a leading icon element — the icon-font hook.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Disabled crumbs are exposed (<code>aria-disabled</code>) but inert.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description: '<code>false</code> removes the crumb entirely.',
        },
      ],
    },
  ],
};

export const OGE_REACT_BREADCRUMB_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeBreadcrumbConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeBreadcrumbMessages',
          description:
            'Every user-facing string: <code>breadcrumb</code> (accessible name of the <code>&lt;nav&gt;</code> landmark, default <code>Breadcrumb</code>) and <code>collapsed</code> (aria label of the ellipsis button, default <code>Show hidden items</code>).',
        },
        {
          name: 'collapseMode',
          type: "'auto' | 'wrap' | 'none' | undefined",
          description: 'Default for the <code>collapseMode</code> prop.',
        },
      ],
    },
  ],
};

import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/navigation/src/lib/breadcrumb/** — keep in sync
 * with the source TSDoc when the public API changes.
 */
export const OGE_BREADCRUMB_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeBreadcrumbItemData[] | undefined',
          description:
            'Data-driven trail — a flat list, never nested. Rendered <strong>after</strong> any declarative <code>&lt;oge-breadcrumb-item&gt;</code> children — the house merge order.',
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
          type: 'Partial<OgeBreadcrumbMessages> | undefined',
          description:
            'Per-instance overrides of the user-facing strings, merged over <code>provideOgeBreadcrumbConfig()</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'focus()',
          type: 'void',
          description:
            'Focuses the first interactive crumb — or the ellipsis button when the trail is collapsed.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'itemClick',
          type: 'OgeBreadcrumbItemClickEvent',
          description:
            'A crumb (inline or inside the ellipsis menu) was activated. <strong>Not fired</strong> by disabled crumbs or by the last crumb — that is the current page. On <code>url</code> crumbs, <code>event.preventDefault()</code> hands navigation to a router.',
        },
      ],
    },
  ],
  types: [
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
          name: 'OgeBreadcrumbItemTemplate',
          type: 'directive — ng-template[ogeBreadcrumbItemTemplate]',
          description:
            "Replaces the crumb's interior only — the link/current/disabled element semantics stay with the component. Context: <code>OgeBreadcrumbItemTemplateContext</code> (<code>$implicit</code>, <code>index</code>, <code>last</code>).",
        },
        {
          name: 'OgeBreadcrumbSeparatorTemplate',
          type: 'directive — ng-template[ogeBreadcrumbSeparatorTemplate]',
          description:
            'Replaces the default chevron separator. Rendered <code>aria-hidden</code> — a separator is decoration, never content (APG). Context: <code>OgeBreadcrumbSeparatorTemplateContext</code>.',
        },
      ],
    },
  ],
};

export const OGE_BREADCRUMB_ITEM_API: ApiSections = {
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
          description: 'Stable identity used in event payloads and DOM ids.',
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

export const OGE_BREADCRUMB_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeBreadcrumbConfig()',
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
          description: 'Default for the <code>collapseMode</code> input.',
        },
      ],
    },
  ],
};

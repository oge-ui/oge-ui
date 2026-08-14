/**
 * Cross-framework parity gate (ROADMAP-REACT R2, ADR 0001 Faz 4).
 *
 * For every family that ships in both render layers, diffs the Angular and
 * React API reference tables — the same `*-api-data.ts` sources the docs and
 * `llms.txt` render — and fails on any member that exists in one layer with
 * no counterpart in the other. Architecture B's known failure mode is parity
 * drift; this makes drift a red build instead of a code-review hope.
 *
 * Mechanical name mapping (the conventions the layers genuinely differ by):
 *   1. React members drop their `on` prefix (`onItemClick` ↔ `itemClick`,
 *      and `onLoadingChange` — documented beside its property — matches the
 *      Angular banana's `loadingChange` event).
 *   2. React `defaultFoo` is the uncontrolled half of `foo` — not a member
 *      the Angular side needs (signal models are both halves at once).
 *   3. Compound rows (`open() / close() / toggle()`) split into their parts.
 *
 * Everything else must either match or be listed in a family's `exceptions`
 * with a reason — deliberate differences are documented, never silent
 * (ROADMAP-REACT, parity principle 3).
 *
 * `types` sections are compared by block presence only: they document shapes
 * whose names legitimately differ per language idiom (events vs callbacks).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readApiBlocks, normalizeName } from './lib/api-data.mjs';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const abs = (...parts) => path.join(workspaceRoot, ...parts);

/**
 * @typedef {{
 *   family: string,
 *   angularApiPage: string | string[],
 *   reactApiPage: string | string[],
 *   exceptions: {
 *     blocksAngularOnly?: Record<string, string>,
 *     blocksReactOnly?: Record<string, string>,
 *     pairs?: Record<string, string>,
 *     angularOnly?: Record<string, string>,
 *     reactOnly?: Record<string, string>,
 *   },
 * }} ParityFamily
 */

/** @type {ParityFamily[]} */
const FAMILIES = [
  {
    family: 'buttons',
    angularApiPage: 'apps/dev-app/src/app/pages/buttons/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-buttons/api.ts',
    exceptions: {
      blocksAngularOnly: {
        buttonsconfiguration:
          'React documents the config as <OgeButtonsConfigProvider> rows inside each component block; a dedicated block lands with the config-API unification.',
      },
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        clicked: 'click', // React idiom: the event IS onClick
        itemtemplate: 'renderitem', // TemplateRef ↔ render prop (ROADMAP exception)
        selectionchanged: 'selectionchange', // React callbacks use the imperative-present form
      },
      angularOnly: {
        ogebuttonicon:
          'Content-projection directive; React passes the icon as the `icon` prop (excepted below).',
        ogedropdowncontent:
          'Structural directive; the React counterpart is the `renderContent` prop (excepted below).',
        isdisabled:
          'Public method the Angular group consumes for its roving tabindex; the React group reads the rendered DOM instead.',
        isselected:
          'Context method the Angular child buttons consume; React children read it via the group context, not a public handle.',
        panel:
          'The Angular anchored-panel model is public for templates/tests; the React handle exposes open()/close()/toggle() instead (present in the React table).',
        selectedkeyschange:
          'The banana half of Angular’s [(selectedKeys)]; React’s controlled pair is selectedKeys + onSelectionChange (present in the React table).',
      },
      reactOnly: {
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        children:
          'JSX content projection; Angular projects via <ng-content> and needs no member.',
        rendercontent:
          'Render prop replacing the Angular `*ogeDropDownContent` structural directive.',
        icon: 'Icon arrives as a prop; the Angular counterpart is the `ogeButtonIcon` projection directive (excepted above).',
      },
    },
  },
  {
    family: 'tabs',
    angularApiPage: 'apps/dev-app/src/app/pages/tabs/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-tabs/api.ts',
    exceptions: {
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        provideogetabsconfig: 'ogetabsconfigprovider', // DI provider ↔ context provider
      },
      reactOnly: {
        tabs: 'The `tabs` prop of OgeTabDefinition objects replaces Angular’s projected <oge-tab> children — the same fields, documented as the "OgeTab (OgeTabDefinition)" block.',
        content:
          'Panel content of an OgeTabDefinition; Angular projects it into <oge-tab> via <ng-content> and needs no member.',
        renderheader:
          'Render prop replacing an [ogeTabHeaderTemplate] placed inside a single <oge-tab> (documented in the Angular block’s types table).',
        rendertabheader:
          'Render prop replacing the component-level [ogeTabHeaderTemplate] slot (documented in the Angular OgeTab block’s types table).',
        rendertabcontent:
          'Render prop replacing the component-level [ogeTabContentTemplate] slot (documented in the Angular OgeTab block’s types table).',
        selectedindexchange:
          'The controlled half of `selectedIndex`; Angular’s [(selectedIndex)] model is both halves at once.',
        selectedkeychange:
          'The controlled half of `selectedKey`; Angular’s [(selectedKey)] model is both halves at once.',
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        useogetabsconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_TABS_CONFIG)`, not a documented member.',
      },
    },
  },
  {
    family: 'layout-accordion',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/api.ts',
    exceptions: {
      blocksAngularOnly: {},
      pairs: {},
      angularOnly: {
        open: 'Per-panel method of <oge-accordion-item>. React has no panel component to hold a handle, so the same pipeline is addressed by index or key on the container’s ref: expand()/collapse()/toggle() (present in the React table).',
        close:
          'Per-panel method of <oge-accordion-item>; the React counterpart is the container handle’s collapse(target).',
        toggle:
          'Per-panel method of <oge-accordion-item>; the React counterpart is the container handle’s toggle(target), which is documented on the <OgeAccordion> block.',
      },
      reactOnly: {
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        content:
          'Panel body of an OgeAccordionItemDefinition; Angular projects it into <oge-accordion-item> via <ng-content> and needs no member.',
        renderheader:
          'Render prop replacing the [ogeAccordionHeaderTemplate] slot (documented in the Angular OgeAccordionItem block’s types table).',
        rendercontent:
          'Render prop replacing the [ogeAccordionContentTemplate] slot (documented in the Angular OgeAccordionItem block’s types table).',
        rendertoggleicon:
          'Render prop replacing the [ogeAccordionToggleIconTemplate] slot (documented in the Angular OgeAccordionItem block’s types table).',
        renderheaderactions:
          'Render prop replacing the [ogeAccordionHeaderActionsTemplate] slot (documented in the Angular OgeAccordionItem block’s types table).',
      },
    },
  },
  {
    family: 'layout-card',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/card-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/card-api.ts',
    exceptions: {
      blocksAngularOnly: {
        slotdirectives:
          'The card sections are attribute directives in Angular and ReactNode props in React — the same six slots, documented under the name each layer actually uses ("Slot props" on the React page, excepted below).',
      },
      blocksReactOnly: {
        slotprops:
          'The React face of the "Slot directives" block: `media` / `avatar` / `headerActions` / `actions` / `footer` nodes plus the `oge-card-separator` class, in the same page position.',
      },
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        provideogecardconfig: 'ogecardconfigprovider', // DI provider ↔ context provider
      },
      angularOnly: {
        ogecardconfig:
          'The `OGE_CARD_CONFIG` InjectionToken behind provideOgeCardConfig(); React resolves the same defaults through the provider’s context, which has no token to document.',
      },
      reactOnly: {
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        children:
          'JSX content projection; Angular projects via <ng-content> and needs no member.',
        useogecardconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_CARD_CONFIG)`, documented as the token instead (excepted above).',
      },
    },
  },
  {
    family: 'layout-progress',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/progress-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/progress-api.ts',
    exceptions: {
      reactOnly: {
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
      },
    },
  },
  {
    family: 'layout-splitter',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/splitter-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/splitter-api.ts',
    exceptions: {
      blocksAngularOnly: {},
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        provideogesplitterconfig: 'ogesplitterconfigprovider', // DI provider ↔ context provider
      },
      angularOnly: {
        collapse:
          'Methods of the declarative <oge-splitter-pane> instance. React has no pane component — a pane is a plain object — so the same three operations are on the splitter handle as collapse(target)/expand(target)/toggle(target), present in the React <OgeSplitter> table.',
        expand:
          'See `collapse`: the pane-level method has no React counterpart; the splitter handle carries it.',
        toggle:
          'See `collapse`: the pane-level method has no React counterpart; the splitter handle carries it.',
        collapsedchange:
          'The banana half of the pane’s [(collapsed)] model. A React pane is a plain object: its `collapsed` field is written by the app, and the splitter reports its own collapses through onPaneCollapsed / onPaneExpanded (both present in the React table).',
      },
      reactOnly: {
        content:
          'Pane body of an OgeSplitterPaneItem; Angular projects it into <oge-splitter-pane> via <ng-content> and needs no member.',
        renderpane:
          'Render prop replacing the [ogeSplitterPaneTemplate] structural directive (documented in the Angular OgeSplitterPane block’s types table).',
        panes:
          'Documented on the React pane item too — a pane nests by carrying its own panes array. Angular documents the same field of OgeSplitterPaneData in its types table and lists `panes` as a splitter input.',
        orientation:
          'Documented on the React pane item too — the axis of a pane’s nested splitter. Angular documents the same field of OgeSplitterPaneData in its types table and lists `orientation` as a splitter input.',
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        id: 'React host attribute idiom; an Angular host takes id natively.',
        useogesplitterconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_SPLITTER_CONFIG)`, not a documented member.',
      },
    },
  },
  {
    family: 'layout-toolbar',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/toolbar-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/toolbar-api.ts',
    exceptions: {
      blocksAngularOnly: {},
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        ogetoolbarbefore: 'before', // projection attribute ↔ ReactNode slot
        ogetoolbarcenter: 'center',
        ogetoolbarafter: 'after',
        ogetoolbaritemtemplate: 'renderitem', // TemplateRef ↔ render prop
        ogetoolbarmenuitemtemplate: 'rendermenuitem',
      },
      angularOnly: {
        // The declarative <oge-toolbar-item> child has no React counterpart:
        // a React item is an OgeToolbarItemData object in the `items` prop, so
        // there is no per-item instance to hang an output on. Both moments are
        // reported by the component-level onItemClick / onActiveChanged, whose
        // payloads carry the item's index, key and data.
        itemclick:
          'Per-item output of the declarative <oge-toolbar-item>; React items are plain data, so the component-level onItemClick (present in the React <OgeToolbar> table) carries the same payload.',
        activechanged:
          'Per-item output of the declarative <oge-toolbar-item>, paired with its two-way [(active)] model; a React toggle is controlled — onActiveChanged reports and the app writes the value back into `items`.',
      },
      reactOnly: {
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        useogetoolbarconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_TOOLBAR_CONFIG)`, not a documented member.',
      },
    },
  },
  {
    family: 'inputs',
    angularApiPage: 'apps/dev-app/src/app/pages/inputs/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-inputs/api.ts',
    exceptions: {
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        itemtemplate: 'renderitem', // TemplateRef ↔ render prop
        celltemplate: 'rendercell', // calendar TemplateRef ↔ render prop
        ogecalendarcelltemplate: 'rendercell', // the projected slot form of the same
        calendarcelltemplate: 'rendercalendarcell', // the date box's calendar passthrough
        selectionchanged: 'selectionchange', // React callbacks use the imperative-present form
        searchchanged: 'searchchange',
        focused: 'focus', // (focused)/(blurred) never collide with DOM events in
        blurred: 'blur', // Angular; React names the callbacks onFocus/onBlur
        ontext: 'text', // <OgeSwitch onText> — the gate strips the `on` prefix
        provideogeinputsconfig: 'ogeinputsconfigprovider', // DI provider ↔ context provider
      },
      angularOnly: {
        reset:
          'Public method that also resets a bound reactive-forms control; React has no forms binding to reset, so the handles expose clear() and the app owns the rest of the state.',
        touch:
          'Signal Forms `FormValueControl` contract output; React reports the same moment through onBlur.',
        clear:
          'Handle method of the field editors; the toggle-style controls (check box, switch) expose toggle() instead, and the slider/radio group/calendar have no empty state to clear.',
        inputchange:
          'Raw-keystroke event. React ships onInputChange on every text-bearing editor, but Angular lists it in the shared COMMON_EVENTS group for the non-text ones (check box, switch, sliders, calendar) too, where no text is typed.',
        selecteditem:
          'Read-only Angular signal; React hands the resolved item to onSelectionChange instead of exposing derived state as a prop.',
        displaytext:
          'Read-only Angular signal; the React select box renders the display text and derives it from displayExpr in the caller when needed.',
        datepartorder:
          'Locale helper exported for consumers building their own date editors; it stays in @oge-ui/inputs until the shared date kernel moves to @oge-ui/behavior.',
      },
      reactOnly: {
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        children:
          'JSX content projection (the check box label); Angular projects via <ng-content> and needs no member.',
        prefix:
          'ReactNode slot replacing the `[ogeInputPrefix]` directive (documented in the Angular types table).',
        suffix:
          'ReactNode slot replacing the `[ogeInputSuffix]` directive (documented in the Angular types table).',
        openedchange:
          'The controlled half of `opened`; Angular’s `[(opened)]` model is both halves at once.',
        valueschange: 'The controlled half of the calendar’s `values` model.',
        rangechange: 'The controlled half of the calendar’s `range` model.',
        zoomlevelchange:
          'The controlled half of the calendar’s `zoomLevel` model.',
        focuseddatechange:
          'The controlled half of the calendar’s `focusedDate` model.',
        useogeinputsconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_INPUTS_CONFIG)`, not a documented member.',
        valuechange:
          'The controlled half of the tree select’s `value`; Angular’s `[(value)]` model is both halves at once.',
        expandedkeyschange:
          'The controlled half of the tree select’s `[(expandedKeys)]` model.',
      },
    },
  },
  {
    // The navigation family documents all six components on one API page in
    // both layers, so it is one entry — unlike layout, which ships five
    // separate Angular API pages and therefore five entries.
    family: 'navigation',
    angularApiPage: 'apps/dev-app/src/app/pages/navigation/api.ts',
    // The React family index composes these six rather than re-declaring
    // their blocks, so the gate reads them directly.
    reactApiPage: [
      'apps/dev-app/src/app/pages/react-navigation/tree-view-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/drawer-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/stepper-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/menubar-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/breadcrumb-api.ts',
      'apps/dev-app/src/app/pages/react-navigation/pagination-api.ts',
    ],
    exceptions: {
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        provideogetreeviewconfig: 'ogetreeviewconfigprovider',
        provideogedrawerconfig: 'ogedrawerconfigprovider',
        provideogestepperconfig: 'ogestepperconfigprovider',
        provideogemenubarconfig: 'ogemenubarconfigprovider',
        provideogebreadcrumbconfig: 'ogebreadcrumbconfigprovider',
        provideogepaginationconfig: 'ogepaginationconfigprovider',
        submenuitemtemplate: 'rendersubmenuitem', // TemplateRef ↔ render prop
      },
      reactOnly: {
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        id: 'React host attribute idiom; an Angular host takes id natively.',
        // The controlled halves of Angular's two-way models. Angular's
        // `[(expandedKeys)]` is both halves at once; React splits them and the
        // gate's rule 2 already absorbs the `default*` half.
        expandedkeyschange:
          'The controlled half of the tree view’s `[(expandedKeys)]` model.',
        selectedkeyschange:
          'The controlled half of the tree view’s `[(selectedKeys)]` model.',
        focusedkeychange:
          'The controlled half of the tree view’s `[(focusedKey)]` model.',
        searchvaluechange:
          'The controlled half of the tree view’s `[(searchValue)]` model.',
        openedchange: 'The controlled half of the drawer’s `[(opened)]` model.',
        activeindexchange:
          'The controlled half of the stepper’s `[(activeIndex)]` model.',
        activekeychange:
          'The controlled half of the stepper’s `[(activeKey)]` model.',
        // Angular exposes these as read-only signals a template can read
        // directly; React has no signal to read off the instance, so the
        // value is on the handle and the transitions are also reported as a
        // callback. Both `closePending` and `changePending` themselves are
        // documented on both sides.
        closependingchange:
          'Callback reporting the drawer’s async close guard settling; Angular’s `closePending` signal is read directly in the template.',
        changependingchange:
          'Callback reporting the stepper’s async step guard settling; Angular’s `changePending` signal is read directly in the template.',
        // Render props replacing structural directives, which Angular
        // documents as directives in its types tables rather than as members.
        renderitem:
          'Render prop replacing the [ogeMenubarItemTemplate] / [ogeBreadcrumbItemTemplate] directives (documented in the Angular types tables).',
        renderseparator:
          'Render prop replacing the [ogeBreadcrumbSeparatorTemplate] directive (documented in the Angular types table).',
        useogetreeviewconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_TREE_VIEW_CONFIG)`, not a documented member.',
        useogedrawerconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_DRAWER_CONFIG)`, not a documented member.',
        useogestepperconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_STEPPER_CONFIG)`, not a documented member.',
        useogemenubarconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_MENUBAR_CONFIG)`, not a documented member.',
        useogebreadcrumbconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_BREADCRUMB_CONFIG)`, not a documented member.',
        useogepaginationconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_PAGINATION_CONFIG)`, not a documented member.',
      },
    },
  },
];

/** `'<OgeButton>'` / `'OgeButton'` → `'ogebutton'`. Angle brackets go first —
 * `normalizeName` truncates at `<` (it exists to strip generics). */
const blockKey = (title) => normalizeName(title.replace(/[<>]/g, ''));

/**
 * Expands one table entry into normalized member names, applying the
 * mechanical React conventions when `side === 'react'`.
 * @returns {string[]}
 */
function memberNames(entry, section, side) {
  const parts = entry.name
    .split('/')
    .map((part) => normalizeName(part))
    .filter(Boolean);
  if (side !== 'react') return parts;
  return parts.map((name) =>
    name.startsWith('on') && name.length > 2 ? name.slice(2) : name,
  );
}

/** @returns {Map<string, string>} normalized name → section it came from */
function collectMembers(block, side) {
  const members = new Map();
  for (const section of ['properties', 'methods', 'events']) {
    for (const group of block.sections[section] ?? []) {
      for (const entry of group.entries ?? []) {
        for (const name of memberNames(entry, section, side)) {
          members.set(name, section);
        }
      }
    }
  }
  if (side === 'react') {
    // Rule 2: `defaultFoo` is the uncontrolled half of a present `foo`.
    for (const name of [...members.keys()]) {
      if (!name.startsWith('default')) continue;
      const base = name.slice('default'.length);
      if (base && members.has(base)) members.delete(name);
    }
  }
  return members;
}

let failures = 0;
const fail = (message) => {
  failures++;
  console.error(`✗ ${message}`);
};

/**
 * Reads one API page, or concatenates several — a layer may split the blocks
 * a family documents on one page of the other layer across per-component
 * pages (React navigation does; its `api.ts` composes those components rather
 * than re-declaring their blocks, because `generate-llms.mjs` would otherwise
 * emit each block twice).
 * @param {string | string[]} pages
 */
async function readApiPages(pages) {
  const list = Array.isArray(pages) ? pages : [pages];
  const perPage = await Promise.all(
    list.map((page) => readApiBlocks(abs(page))),
  );
  return perPage.flat();
}

for (const config of FAMILIES) {
  const [angularBlocks, reactBlocks] = await Promise.all([
    readApiPages(config.angularApiPage),
    readApiPages(config.reactApiPage),
  ]);
  const angularByKey = new Map(
    angularBlocks.map((b) => [blockKey(b.title), b]),
  );
  const reactByKey = new Map(reactBlocks.map((b) => [blockKey(b.title), b]));

  for (const [key, block] of angularByKey) {
    if (reactByKey.has(key)) continue;
    if (config.exceptions.blocksAngularOnly?.[key]) continue;
    fail(
      `${config.family}: Angular block "${block.title}" has no React counterpart (and no documented exception)`,
    );
  }
  for (const [key, block] of reactByKey) {
    if (angularByKey.has(key)) continue;
    if (config.exceptions.blocksReactOnly?.[key]) continue;
    fail(
      `${config.family}: React block "${block.title}" has no Angular counterpart (and no documented exception)`,
    );
  }

  const pairs = config.exceptions.pairs ?? {};
  const reversePairs = Object.fromEntries(
    Object.entries(pairs).map(([a, r]) => [r, a]),
  );

  for (const [key, angularBlock] of angularByKey) {
    const reactBlock = reactByKey.get(key);
    if (!reactBlock) continue;
    const angular = collectMembers(angularBlock, 'angular');
    const react = collectMembers(reactBlock, 'react');

    for (const [name, section] of angular) {
      if (react.has(name)) continue;
      if (pairs[name] && react.has(pairs[name])) continue;
      if (config.exceptions.angularOnly?.[name]) continue;
      fail(
        `${config.family} › ${angularBlock.title} › ${section}: "${name}" is documented for Angular but missing from the React table`,
      );
    }
    for (const [name, section] of react) {
      if (angular.has(name)) continue;
      if (reversePairs[name] && angular.has(reversePairs[name])) continue;
      if (config.exceptions.reactOnly?.[name]) continue;
      fail(
        `${config.family} › ${reactBlock.title} › ${section}: "${name}" is documented for React but missing from the Angular table`,
      );
    }
  }

  if (failures === 0) {
    console.log(
      `✓ ${config.family}: ${angularByKey.size} Angular ↔ ${reactByKey.size} React blocks in parity`,
    );
  }
}

if (failures) {
  console.error(
    `\n${failures} parity gap(s). Either document the member on the missing side` +
      ` (apps/dev-app/src/app/pages/**/*-api-data.ts) or record a deliberate` +
      ` exception with its reason in tools/docs-tools/check-parity.mjs.`,
  );
  process.exit(1);
}

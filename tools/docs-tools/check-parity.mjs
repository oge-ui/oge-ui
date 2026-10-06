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
 *     blockPairs?: Record<string, string>,
 *     pairs?: Record<string, string>,
 *     angularOnly?: Record<string, string>,
 *     reactOnly?: Record<string, string>,
 *   },
 * }} ParityFamily
 */

/** Reasons shared by many families (W8a onwards keeps them in one place). */
const STYLING_IDIOM =
  'React host styling idiom; Angular hosts take class/style natively.';
const JSX_CHILDREN =
  'JSX content projection; Angular projects via <ng-content> and needs no member.';

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
        selectedchanged:
          'The toggle button’s rich event ({ selected, previousValue, event }) beside the [(selected)] banana; React folds both into onSelectedChange, which carries the same payload and pairs with the banana’s selectedChange.',
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
        headeractions:
          'ReactNode prop of <OgeExpansionPanel>; Angular projects real buttons marked with the ogeExpansionPanelActions attribute (documented in the OgeExpansionPanel block’s types table) and needs no member.',
        children:
          'JSX body of <OgeExpansionPanel>; Angular projects the body via <ng-content> (plus the lazy [ogeExpansionPanelContent] template) and needs no member.',
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
      angularOnly: {
        isshown:
          'Public method of the oge-load-panel instance (template ref / viewChild). <OgeLoadPanel> is a plain function component with no ref handle; React readers track the painted state through onShown / onHidden (present in the React table).',
      },
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
  // --- W8a layout and feedback families -------------------------------------
  {
    family: 'layout-avatar',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/avatar-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/avatar-api.ts',
    exceptions: {
      reactOnly: {
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
        children: JSX_CHILDREN,
      },
    },
  },
  {
    family: 'layout-chip',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/chip-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/chip-api.ts',
    exceptions: {
      reactOnly: {
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
        renderchip:
          'Render prop replacing the [ogeChipTemplate] structural directive (documented in the Angular types table).',
      },
    },
  },
  {
    family: 'layout-alert',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/alert-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/alert-api.ts',
    exceptions: {
      reactOnly: {
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
        children: JSX_CHILDREN,
        actions:
          'ReactNode prop replacing the [ogeAlertActions] attribute slot (documented in the Angular types table).',
        icon: 'ReactNode prop replacing the [ogeAlertIcon] attribute slot (documented in the Angular types table).',
      },
    },
  },
  {
    family: 'layout-timeline',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/timeline-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/timeline-api.ts',
    exceptions: {
      pairs: {
        provideogetimelineconfig: 'ogetimelineconfigprovider', // DI provider ↔ context provider
      },
      angularOnly: {
        ogetimelineconfig:
          'The `OGE_TIMELINE_CONFIG` InjectionToken behind provideOgeTimelineConfig(); React resolves the same defaults through the provider’s context, which has no token.',
      },
      reactOnly: {
        rendercontent:
          'Render prop replacing the [ogeTimelineContentTemplate] structural directive (documented in the Angular types table).',
        rendermarker:
          'Render prop replacing the [ogeTimelineMarkerTemplate] structural directive (documented in the Angular types table).',
        renderopposite:
          'Render prop replacing the [ogeTimelineOppositeTemplate] structural directive (documented in the Angular types table).',
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
        useogetimelineconfig:
          'Hook reading the resolved config; the Angular counterpart is the OGE_TIMELINE_CONFIG token (excepted above).',
      },
    },
  },
  {
    family: 'layout-tile-layout',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/tile-layout-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/tile-layout-api.ts',
    exceptions: {
      blocksAngularOnly: {
        ogetilelayoutitem:
          'The declarative <oge-tile-layout-item> child exists because Angular content projection needs a component per tile; React passes the same OgeTileLayoutItemData through `items` and the slots as renderHeader / renderContent.',
      },
      pairs: {
        provideogetilelayoutconfig: 'ogetilelayoutconfigprovider', // DI provider ↔ context provider
      },
      angularOnly: {
        ogetilelayoutconfig:
          'The `OGE_TILE_LAYOUT_CONFIG` InjectionToken behind provideOgeTileLayoutConfig(); React resolves the same defaults through the provider’s context, which has no token.',
      },
      reactOnly: {
        renderheader:
          'Render prop replacing the [ogeTileLayoutHeaderTemplate] structural directive (documented in the Angular types table).',
        rendercontent:
          'Render prop replacing the [ogeTileLayoutContentTemplate] structural directive (documented in the Angular types table).',
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
        useogetilelayoutconfig:
          'Hook reading the resolved config; the Angular counterpart is the OGE_TILE_LAYOUT_CONFIG token (excepted above).',
      },
    },
  },
  {
    family: 'layout-data-view',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/data-view-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/data-view-api.ts',
    exceptions: {
      pairs: {
        provideogedataviewconfig: 'ogedataviewconfigprovider', // DI provider ↔ context provider
      },
      angularOnly: {
        ogedataviewconfig:
          'The `OGE_DATA_VIEW_CONFIG` InjectionToken behind provideOgeDataViewConfig(); React resolves the same defaults through the provider’s context, which has no token.',
      },
      reactOnly: {
        toolbar:
          'ReactNode prop replacing the [ogeDataViewToolbar] attribute slot (documented in the Angular types table).',
        renderitem:
          'Render prop replacing the [ogeDataViewItemTemplate] structural directive (documented in the Angular types table).',
        renderlistitem:
          'Render prop replacing the [ogeDataViewListItemTemplate] structural directive (documented in the Angular types table).',
        renderempty:
          'Render prop replacing the [ogeDataViewEmptyTemplate] structural directive (documented in the Angular types table).',
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
        useogedataviewconfig:
          'Hook reading the resolved config; the Angular counterpart is the OGE_DATA_VIEW_CONFIG token (excepted above).',
      },
    },
  },
  {
    family: 'layout-list-view',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/list-view-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/list-view-api.ts',
    exceptions: {
      pairs: {
        provideogelistviewconfig: 'ogelistviewconfigprovider', // DI provider ↔ context provider
      },
      angularOnly: {
        ogelistviewconfig:
          'The `OGE_LIST_VIEW_CONFIG` InjectionToken behind provideOgeListViewConfig(); React resolves the same defaults through the provider’s context, which has no token.',
      },
      reactOnly: {
        renderitem:
          'Render prop replacing the [ogeListViewItemTemplate] structural directive (documented in the Angular types table).',
        rendergroup:
          'Render prop replacing the [ogeListViewGroupTemplate] structural directive (documented in the Angular types table).',
        renderempty:
          'Render prop replacing the [ogeListViewEmptyTemplate] structural directive (documented in the Angular types table).',
        renderfooter:
          'Render prop replacing the [ogeListViewFooterTemplate] structural directive (documented in the Angular types table).',
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
        useogelistviewconfig:
          'Hook reading the resolved config; the Angular counterpart is the OGE_LIST_VIEW_CONFIG token (excepted above).',
      },
    },
  },
  {
    family: 'layout-carousel',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/carousel-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/carousel-api.ts',
    exceptions: {
      reactOnly: {
        renderslide:
          'Render prop replacing the [ogeCarouselSlideTemplate] structural directive (documented in the Angular types table).',
        children:
          'JSX children carry the declarative <OgeCarouselSlide> elements; Angular projects <oge-carousel-slide> children (documented in the Angular types table).',
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
      },
    },
  },
  {
    family: 'layout-app-bar',
    angularApiPage: 'apps/dev-app/src/app/pages/layout/app-bar-api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-layout/app-bar-api.ts',
    exceptions: {
      pairs: {
        provideogeappbarconfig: 'ogeappbarconfigprovider', // DI provider ↔ context provider
      },
      angularOnly: {
        ogeappbarconfig:
          'The `OGE_APP_BAR_CONFIG` InjectionToken behind provideOgeAppBarConfig(); React resolves the same defaults through the provider’s context, which has no token.',
      },
      reactOnly: {
        start:
          'ReactNode prop replacing the [ogeAppBarStart] attribute slot (documented in the Angular types table).',
        center:
          'ReactNode prop replacing the [ogeAppBarCenter] attribute slot (documented in the Angular types table).',
        end: 'ReactNode prop replacing the [ogeAppBarEnd] attribute slot (documented in the Angular types table).',
        classname: STYLING_IDIOM,
        style: STYLING_IDIOM,
        children: JSX_CHILDREN,
        useogeappbarconfig:
          'Hook reading the resolved config; the Angular counterpart is the OGE_APP_BAR_CONFIG token (excepted above).',
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
        grouptemplate: 'rendergroup', // select box / tag box group header slot
        fieldtemplate: 'renderfield', // select box closed-field slot
        headertemplate: 'renderheader', // select box popup header slot
        footertemplate: 'renderfooter', // select box popup footer slot
        tagtemplate: 'rendertag', // tag box chip slot
        selectionchanged: 'selectionchange', // React callbacks use the imperative-present form
        searchchanged: 'searchchange',
        selectallchanged: 'selectallchange', // check box group — same idiom
        hoverchanged: 'hoverchange', // rating — same idiom
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
        selecteditems:
          'Read-only Angular signal of the multi-column combo box; React hands the selection to onSelectionChange (`selectedItems`) instead of exposing derived state.',
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
    family: 'forms',
    angularApiPage: 'apps/dev-app/src/app/pages/forms/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-forms/api.ts',
    exceptions: {
      blocksAngularOnly: {
        schemametadata:
          'The OGE_FORM_* metadata keys attach layout to an Angular Signal Forms schema. React has no schema binding to read them from — its layout is the `layout` array — so the block is Angular-only by construction, not a missing feature.',
      },
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        ogeformitemtemplate: 'renderitem', // TemplateRef ↔ render prop
        ogeformeditortemplate: 'rendereditor',
        ogeformlabeltemplate: 'renderlabel',
        ogeformgroupcaptiontemplate: 'rendergroupcaption',
        ogeformactions: 'actions', // projection directive ↔ ReactNode slot
        selectedindex: 'activeindex', // one section index name in React, for tabs and steps alike
      },
      angularOnly: {
        fieldtree:
          'Binds an Angular Signal Forms tree. React has no Signal Forms; the same rules run through `validationRules` and the shared evaluator in @oge-ui/behavior.',
        formgroup:
          'Binds an Angular reactive-forms FormGroup — an Angular-only forms engine. A React app keeps its own form state and binds it through `formData` / `onFormDataChange`.',
        mode: 'Reports which of the three Angular bindings resolved. React has one binding, so there is nothing to report.',
      },
      reactOnly: {
        layout:
          'The nested `layout` array replaces Angular’s projected <oge-form-item> / <oge-form-group> / <oge-form-tabs> children — React has no content projection.',
        formdatachange:
          'The controlled half of `formData`; Angular’s [(formData)] model is both halves at once.',
        data: 'The bound model read off the imperative handle; Angular reads the same value from the [(formData)] signal it wrote.',
        kind: 'Discriminates a group from a section inside the `layout` array; Angular discriminates by which component the template used.',
        children:
          'A group’s child nodes as data; Angular projects them via <ng-content> and needs no member.',
        rendercaption:
          'Per-group caption slot, the object form of an [ogeFormGroupCaptionTemplate] placed inside one <oge-form-group>.',
        activeindexchange:
          'The controlled half of a section’s `activeIndex`; Angular’s [(selectedIndex)] / [(activeIndex)] models are both halves at once.',
        expandedkeyschange:
          'The controlled half of the accordion section’s `expandedKeys` model.',
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        id: 'React host attribute idiom; an Angular host takes id natively.',
        useogeformsconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_FORMS_CONFIG)`, not a documented member.',
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
        selectedkeychange:
          'The controlled half of the drawer’s `[(selectedKey)]` model.',
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
  {
    // The commercial charts family (ADR 0003): both layers run
    // @oge-ui/charts-engine, so every difference below is idiom, not behavior.
    family: 'charts',
    angularApiPage: 'apps/dev-app/src/app/pages/charts/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-charts/api.ts',
    exceptions: {
      pairs: {
        // angular ↔ react (both already normalized): DI provider ↔ context provider
        provideogechartsconfig: 'ogechartsconfigprovider',
      },
      reactOnly: {
        classname:
          'React host styling idiom; an Angular host takes `class` natively (and needs a height through `style`, which it also takes natively).',
        style:
          'React host styling idiom; an Angular host takes `style` natively — the docs size every chart with it.',
        renderlegenditem:
          'Render prop replacing the `*ogeChartLegendTemplate` structural directive, which the Angular page documents in the OgeChart types table (the pie and polar charts query the same directive).',
        renderlabel:
          'Render prop replacing the `*ogeChartLabelTemplate` structural directive, which the Angular page documents in the OgeChart types table (the pie and polar charts query the same directive).',
        useogechartsconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_CHARTS_CONFIG)`, not a documented member.',
      },
    },
  },
  {
    family: 'upload',
    angularApiPage: 'apps/dev-app/src/app/pages/upload/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-upload/api.ts',
    exceptions: {
      reactOnly: {
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        valuechange:
          'The controlled half of `[(value)]`, documented as a prop in the React table; Angular documents it inside the events row “thumbnailFailed / valueChange / touch”, where it is matched.',
      },
    },
  },
  {
    family: 'kanban',
    angularApiPage: 'apps/dev-app/src/app/pages/kanban/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-kanban/api.ts',
    exceptions: {
      reactOnly: {
        collapsedcolumnschange:
          'The controlled half of `collapsedColumns`; Angular’s [(collapsedColumns)] model is both halves at once.',
        collapsedswimlaneschange:
          'The controlled half of `collapsedSwimlanes`; Angular’s [(collapsedSwimlanes)] model is both halves at once.',
        columnorderchange:
          'The controlled half of `columnOrder`; Angular’s [(columnOrder)] model is both halves at once.',
        selectedcardkeychange:
          'The controlled half of `selectedCardKey`; Angular’s [(selectedCardKey)] model is both halves at once.',
        selectedcardkeyschange:
          'The controlled half of `selectedCardKeys`; Angular’s [(selectedCardKeys)] model is both halves at once.',
        filtervaluechange:
          'The controlled half of `filterValue`; Angular’s [(filterValue)] model is both halves at once.',
        columnsortchange:
          'The controlled half of `columnSort`; Angular’s [(columnSort)] model is both halves at once.',
        rendercard:
          'Render prop replacing the `*ogeKanbanCardTemplate` structural directive, which the Angular page documents in its Templates types block (ROADMAP exception: TemplateRef ↔ render prop).',
        rendercolumnheader:
          'Render prop replacing the `*ogeKanbanColumnHeaderTemplate` structural directive — same Templates-block split as `renderCard`.',
        classname:
          'React host styling idiom; an Angular host takes `class` natively and needs no input.',
        style:
          'React host styling idiom; an Angular host takes `style` natively and needs no input.',
      },
    },
  },
  {
    // commercial: @oge-ui/bpmn ↔ @oge-ui/react-bpmn, both thin templates over
    // @oge-ui/bpmn-engine's editor core (ADR 0003)
    family: 'bpmn',
    angularApiPage: 'apps/dev-app/src/app/pages/bpmn/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-bpmn/api.ts',
    exceptions: {
      pairs: {
        // structural directive ↔ render prop (custom properties entries, G5b)
        ogebpmnpropertiesentrytemplate: 'renderpropertiesentry',
      },
      reactOnly: {
        modechange:
          'The controlled half of `mode`; Angular’s `[(mode)]` model is both halves at once (its `modeChange` output is implied by the model and documented on the `mode` row).',
        zoomchange:
          'The controlled half of `zoom`; Angular’s `[(zoom)]` model is both halves at once (its `zoomChange` output is implied by the model and documented on the `zoom` row).',
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively — the editor’s height is set the same way in both layers.',
      },
    },
  },
  {
    family: 'overlay',
    angularApiPage: 'apps/dev-app/src/app/pages/overlay/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-overlay/api.ts',
    exceptions: {
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        ogemodaltitle: 'rendertitle', // structural directive ↔ render prop
        ogemodalheaderactions: 'renderheaderactions',
        ogemodalfooter: 'renderfooter',
        itemtemplate: 'renderitem', // TemplateRef ↔ render prop
        template: 'rendercontent', // toast body TemplateRef ↔ render prop
        ogetooltip: 'text', // the directive's selector binding ↔ the prop
        tooltipplacement: 'placement', // directive inputs drop the prefix
        tooltipshowdelay: 'showdelay',
        tooltiphidedelay: 'hidedelay',
        tooltipdisabled: 'disabled',
        tooltipshowmode: 'showmode',
        tooltiparrow: 'arrow',
        tooltipmaxwidth: 'maxwidth',
        ogecontextmenu: 'items', // the directive's selector binding ↔ the prop
        contextmenuarialabel: 'arialabel',
        contextmenudisabled: 'disabled',
        contextmenutarget: 'target',
        contextmenuopening: 'opening',
        // popover: the trigger directive ↔ the trigger prop, structural
        // slots ↔ render props, the two-way model ↔ the controlled prop
        ogepopover: 'trigger',
        ogepopovertitle: 'rendertitle',
        ogepopoverfooter: 'renderfooter',
        visible: 'open',
        contextmenuitemclick: 'itemclick', // outputs drop the prefix too
        contextmenuopened: 'opened',
        contextmenuclosed: 'closed',
        onclosed: 'closed', // hook option, not a callback prop: the gate strips `on`
        provideogeoverlayconfig: 'ogeoverlayconfigprovider', // DI provider ↔ context provider
        // adaptive popup: content-projection attributes ↔ slot props, and the
        // injection-context helpers ↔ hooks
        ogepopupsheetheader: 'sheetheader',
        ogepopupsheetfooter: 'sheetfooter',
        ogeadaptivepresentation: 'useogeadaptivepresentation',
        ogeadaptiveviewport: 'useogeadaptiveviewport',
      },
      angularOnly: {
        destroy:
          'The Angular panel model is torn down from DestroyRef; the React hook destroys its machine on unmount, so there is no member to call.',
        provideogeoverlayconfig:
          'DI provider; the React counterpart is the <OgeOverlayConfigProvider> row (a JSX tag, which the gate cannot pair by name).',
        tooltipcontext:
          'The $implicit of a template ogeTooltip; React’s `content` render function closes over whatever it needs.',
      },
      reactOnly: {
        rendertitle:
          'Target of the `ogeModalTitle` / `ogePopoverTitle` pairs — a pair maps one Angular name to one React name.',
        renderfooter:
          'Target of the `ogeModalFooter` / `ogePopoverFooter` pairs — a pair maps one Angular name to one React name.',
        content:
          'Rich tooltip content as a node / render prop; Angular passes a TemplateRef to `ogeTooltip` itself (paired with `text`).',
        openchange:
          'The controlled half of the popover’s `open`; Angular’s `[(visible)]` model is both halves at once.',
        // The reverse half of the directive-prefix pairs above: a pair maps
        // one Angular name to one React name, while the React `disabled` and
        // `closed` names are the target of two pairs each (tooltip + context
        // menu, context menu + anchored panel).
        disabled:
          'Target of the `tooltipDisabled` / `contextMenuDisabled` pairs — the directive-prefixed Angular inputs.',
        closed:
          'Target of the `contextMenuClosed` / `onClosed` pairs — the directive-prefixed Angular output and the panel option.',
        ogeoverlayconfigprovider:
          'Context provider; the Angular counterpart is `provideOgeOverlayConfig()` (excepted above).',
        classname:
          'React host styling idiom; Angular hosts take class/style natively.',
        style:
          'React host styling idiom; Angular hosts take class/style natively.',
        children:
          'JSX content projection; Angular projects via <ng-content> (modal, popup) or attaches a directive to the element itself (tooltip, context menu).',
        openedchange: 'The controlled half of the modal’s `[(opened)]` model.',
        fullscreenchange:
          'The controlled half of the modal’s `[(fullScreen)]` model.',
        statechange: 'The controlled half of the window’s `[(state)]` model.',
        closependingchange:
          'Callback reporting the modal’s async close guard settling; Angular’s `closePending` signal is read directly in the template.',
        renderitem:
          'The context menu forwards a render prop to its hosted menu list; the Angular directive has no item template input.',
        nested:
          'Set by the React menu list on its own submenus; the Angular menu list derives the same flag from its template.',
        useogeoverlayconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_OVERLAY_CONFIG)`, not a documented member.',
      },
    },
  },
  {
    family: 'grid',
    angularApiPage: 'apps/dev-app/src/app/pages/data-grid/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-grid/api.ts',
    exceptions: {
      blockPairs: {
        // the same column contract: a component in Angular, a props interface
        // in React — every member below is still compared
        ogecolumn: 'ogegridcolumnprops',
      },
      pairs: {
        // same feature, different shape: Angular wraps columns in a
        // <oge-column-group>, React tags each column with the band's caption
        // and adjacent matches merge into one spanning header
        ogecolumngroup: 'bandcaption',
      },
      angularOnly: {
        asyncvalidators:
          'Angular takes `AsyncValidatorFn`s beside its `ValidatorFn`s (Angular forms keep the two lists apart); a React column rule may itself return a promise, so `validators` covers both and there is no second prop.',
        ogegridtoolbaritem:
          'Content-projection directive for the grid toolbar (`ogeToolbar="before|center|after"`, a static attribute). React has no projection; the same three groups are the `toolbarBefore` / `toolbarCenter` / `toolbarAfter` slot props.',
      },
      reactOnly: {
        toolbarbefore:
          'Slot prop standing in for `[ogeToolbar]="before"` content projection (see `ogegridtoolbaritem`).',
        toolbarcenter:
          'Slot prop standing in for `[ogeToolbar]="center"` content projection (see `ogegridtoolbaritem`).',
        toolbarafter:
          'Slot prop standing in for bare / `[ogeToolbar]="after"` content projection (see `ogegridtoolbaritem`).',
        rendercell:
          'React form of the `*ogeCellTemplate` structural directive, documented in the Angular page’s companion-directives block rather than as a column input (ROADMAP exception: TemplateRef ↔ render prop).',
        renderheader:
          'React form of `*ogeHeaderTemplate` — same companion-directive split as `renderCell`.',
        rendereditor:
          'React form of `*ogeEditTemplate` — same companion-directive split as `renderCell`.',
        renderrow:
          'React form of the `*ogeRowTemplate` structural directive, which the Angular page documents in its companion-directives block rather than as a grid input (ROADMAP exception: TemplateRef ↔ render prop).',
        renderdetail:
          'React form of `*ogeDetailTemplate` — same companion-directive split as `renderRow`.',
        rendernodata:
          'React form of `*ogeNoDataTemplate` — same companion-directive split as `renderRow`.',
        statestorage:
          'Per-grid storage override. Angular reaches the same seam by providing the `OGE_STATE_STORAGE` token in the injector tree, documented in the types block; React has no DI, so the escape hatch is a prop.',
        classname:
          'React host styling idiom; an Angular host takes `class` natively and needs no input.',
        style:
          'React host styling idiom; an Angular host takes `style` natively and needs no input.',
        arialabel:
          'React needs a prop to reach the host element; an Angular consumer writes `aria-label` on `<oge-grid>` directly, so there is nothing to document as a grid input.',
        id: 'React needs a prop to set the host element id (the component id row-drag events report); an Angular consumer writes `id` on `<oge-grid>` directly.',
        renderpagerinfo:
          'React form of the `*ogePagerInfoTemplate` structural directive, documented in the Angular types block (ROADMAP exception: TemplateRef ↔ render prop).',
      },
    },
  },
  {
    family: 'tree-list',
    angularApiPage: 'apps/dev-app/src/app/pages/tree-list/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-tree-list/api.ts',
    exceptions: {
      reactOnly: {
        statestorage:
          'Per-tree storage override. Angular reaches the same seam by providing the `OGE_STATE_STORAGE` token in the injector tree; React has no DI, so the escape hatch is a prop (the React grid records the same exception).',
        rendernodata:
          'React form of the `*ogeNoDataTemplate` content child, which the Angular tree list queries from its projected content rather than taking as an input (ROADMAP exception: TemplateRef ↔ render prop).',
        toolbarbefore:
          'Slot prop standing in for projected `[ogeToolbar]` items — the Angular tree list projects every one of them to the toolbar’s start edge (`ngProjectAs="[ogeToolbarBefore]"`), so React has exactly that one slot. React has no content projection.',
        classname:
          'React host styling idiom; an Angular host takes `class` natively and needs no input.',
        style:
          'React host styling idiom; an Angular host takes `style` natively and needs no input.',
        arialabel:
          'React needs a prop to reach the host element; an Angular consumer writes `aria-label` on `<oge-tree-list>` directly.',
      },
    },
  },
  {
    family: 'scheduler',
    angularApiPage: 'apps/dev-app/src/app/pages/scheduler/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-scheduler/api.ts',
    exceptions: {
      pairs: {
        // DI provider ↔ context provider (both documented in the
        // Configuration block)
        provideogeschedulerconfig: 'ogeschedulerconfigprovider',
        // an attribute directive's inputs carry its selector prefix; the
        // hook takes the same three values as plain option fields
        ogeschedulerdraggable: 'data',
        ogeschedulerdraggableduration: 'duration',
        ogeschedulerdraggabletext: 'text',
      },
      blockPairs: {
        // the external drag source: a directive in Angular, a hook in React
        // — every member is still compared
        ogeschedulerdraggable: 'useogeschedulerdraggable',
      },
      reactOnly: {
        renderresourceheader:
          'React form of `[ogeResourceHeaderTemplate]` — same types-table split as `renderAppointment`.',
        renderappointment:
          'React form of the `*ogeAppointmentTemplate` structural directive, which the Angular page documents in its types table rather than as an input (ROADMAP exception: TemplateRef ↔ render prop).',
        rendercell:
          'React form of `[ogeCellTemplate]` — same types-table split as `renderAppointment`.',
        renderdateheader:
          'React form of `[ogeDateHeaderTemplate]` — same types-table split as `renderAppointment`.',
        classname:
          'React host styling idiom; an Angular host takes `class` natively and needs no input.',
        style:
          'React host styling idiom; an Angular host takes `style` natively and needs no input.',
        useogeschedulerconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_SCHEDULER_CONFIG)`, not a documented member.',
      },
    },
  },
  {
    family: 'pivot',
    angularApiPage: 'apps/dev-app/src/app/pages/pivot-grid/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-pivot/api.ts',
    exceptions: {
      blockPairs: {
        // the same field contract: a renderless directive in Angular, a plain
        // object in React's `fields` array — every member below is compared
        ogepivotfield: 'ogepivotfielddef',
      },
      angularOnly: {
        ogepivotstatestore:
          'Documented under "Internals — not a supported API": the Angular grid’s signal-backed subclass of @oge-ui/pivot-engine’s OgePivotStateCore, public only because the class is exported. The React grid holds the same core privately; both layers point applications at stateKey / state() / applyState(), which are compared above.',
      },
      reactOnly: {
        statestorage:
          'Per-grid storage override. Angular reaches the same seam by providing the `OGE_STATE_STORAGE` token in the injector tree; React has no DI, so the escape hatch is a prop (the react-grid precedent).',
        classname:
          'React host styling idiom; an Angular host takes `class` natively and needs no input.',
        style:
          'React host styling idiom; an Angular host takes `style` natively and needs no input.',
        rendercell:
          'Render prop replacing the `*ogePivotCellTemplate` structural directive, which the Angular page documents in its types table (TemplateRef ↔ render prop).',
        renderrowheader:
          'Render prop replacing the `*ogePivotRowHeaderTemplate` structural directive (same types-table split).',
        rendercolumnheader:
          'Render prop replacing the `*ogePivotColumnHeaderTemplate` structural directive (same types-table split).',
      },
    },
  },
  {
    // commercial: both layers run OgeGanttCore from @oge-ui/gantt-engine
    // (ADR 0003), so every member below is one engine method or input
    family: 'gantt',
    angularApiPage: 'apps/dev-app/src/app/pages/gantt/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/react-gantt/api.ts',
    exceptions: {
      pairs: {
        // angular ↔ react (both already normalized): deliberate renames
        provideogeganttconfig: 'ogeganttconfigprovider', // DI provider ↔ context provider
      },
      reactOnly: {
        rendertask:
          'Render prop replacing the `[ogeGanttTaskTemplate]` structural directive, which the Angular page documents in its types table rather than as a component input (TemplateRef ↔ render prop).',
        rendertooltip:
          'Render prop replacing the `[ogeGanttTooltipTemplate]` structural directive — same types-table split as `renderTask`.',
        classname:
          'React host styling idiom; an Angular host takes `class` natively and needs no input.',
        style:
          'React host styling idiom; an Angular host takes `style` natively and needs no input.',
        useogeganttconfig:
          'Hook reading the resolved config; the Angular counterpart is `inject(OGE_GANTT_CONFIG)`, documented inside the provider row rather than as a member.',
      },
    },
  },
  {
    // @oge-ui/locales: the packs are framework-free data; only the one-call
    // wiring differs per layer (oge-ui's provideOgeLocale ↔ @oge-ui/react's
    // <OgeLocaleProvider>)
    family: 'locales',
    angularApiPage: 'apps/dev-app/src/app/pages/locales/api.ts',
    reactApiPage: 'apps/dev-app/src/app/pages/locales/react-api.ts',
    exceptions: {
      blocksAngularOnly: {
        localepacks:
          'The packs block documents framework-free @oge-ui/locales data — identical in both layers, so the page renders it once, outside the framework switch, instead of a React copy.',
      },
      pairs: {
        provideogelocale: 'ogelocaleprovider', // DI provider ↔ context provider
      },
      reactOnly: {
        children:
          'The localized subtree of the context provider; an Angular provider function scopes by injector instead and takes no children.',
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
  // A block whose two layers name the same concept differently (`OgeColumn`
  // is a component, `OgeGridColumnProps` an interface) is *renamed*, not
  // absent — pairing them keeps their members compared, where excepting both
  // blocks would silently drop the whole table from the gate.
  const blockPairs = config.exceptions.blockPairs ?? {};
  const reactByKey = new Map(
    reactBlocks.map((b) => {
      const key = blockKey(b.title);
      const angularName = Object.entries(blockPairs).find(
        ([, react]) => react === key,
      )?.[0];
      return [angularName ?? key, b];
    }),
  );

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

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeButton,
  OgeButtonGroup,
  OgeDropDownButton,
  OgeFab,
} from '@oge-ui/buttons';
import {
  OgeCalendar,
  OgeCheckBox,
  OgeColorBox,
  OgeDateBox,
  OgeNumberBox,
  OgeOtpInput,
  OgeRating,
  OgeSelectBox,
  OgeSlider,
  OgeSwitch,
  OgeTagBox,
  OgeTextBox,
} from '@oge-ui/inputs';
import {
  OgeAccordion,
  OgeAccordionItem,
  OgeAlert,
  OgeCard,
  OgeProgressBar,
  OgeSplitter,
  OgeSplitterPane,
  OgeTimeline,
  OgeToolbar,
  OgeToolbarItem,
} from '@oge-ui/layout';
import {
  OgeBreadcrumb,
  OgeDrawer,
  OgeMenubar,
  OgePagination,
  OgeStep,
  OgeStepper,
  OgeTreeView,
} from '@oge-ui/navigation';
import {
  OgeContextMenu,
  OgeModal,
  OgePopover,
  OgePopoverTrigger,
  OgeTooltip,
  OgeWindow,
} from '@oge-ui/overlay';
import { OgeTab, OgeTabPanel, OgeTabs } from '@oge-ui/tabs';
import type { SsrFamily } from '../render';

const cities = ['Ankara', 'Berlin', 'Lisbon'];

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeTextBox,
    OgeSelectBox,
    OgeDateBox,
    OgeNumberBox,
    OgeSlider,
    OgeCalendar,
    OgeCheckBox,
    OgeSwitch,
    OgeTagBox,
    OgeColorBox,
    OgeRating,
    OgeOtpInput,
  ],
  template: `
    <oge-text-box label="Name" [(value)]="name" />
    <oge-select-box label="City" [items]="cities" [(value)]="city" />
    <oge-date-box label="Delivery" [value]="day" locale="en-US" />
    <oge-number-box label="Price" locale="de-DE" [value]="1234.5" />
    <oge-slider [value]="40" [min]="0" [max]="100" ariaLabel="Volume" />
    <oge-calendar [value]="day" [firstDayOfWeek]="1" locale="en-US" />
    <oge-check-box text="Subscribe" [value]="true" />
    <oge-switch ariaLabel="Notifications" [value]="false" />
    <oge-tag-box label="Cities" [items]="cities" [value]="['Berlin']" />
    <oge-color-box label="Accent" value="#2563eb" />
    <oge-rating [value]="3" ariaLabel="Rating" />
    <oge-otp-input [length]="4" ariaLabel="Code" />
  `,
})
class InputsHost {
  protected readonly cities = cities;
  protected readonly name = signal('Ada');
  protected readonly city = signal<string | null>('Berlin');
  protected readonly day = new Date(2026, 7, 6);
}

export const INPUTS: SsrFamily = {
  name: 'inputs',
  host: InputsHost,
  expect: ['oge-text-box', 'oge-select-box', 'oge-calendar', 'Berlin'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeButton,
    OgeModal,
    OgeWindow,
    OgePopover,
    OgePopoverTrigger,
    OgeTooltip,
    OgeContextMenu,
  ],
  template: `
    <oge-button text="Save" ogeTooltip="Saves your changes" />
    <button type="button" [ogePopover]="share">Share</button>
    <oge-popover #share title="Share report">
      <p>Anyone with the link can view this report.</p>
    </oge-popover>
    <div [ogeContextMenu]="menu">Right-click me</div>
    <oge-modal title="Team settings" [(opened)]="modalOpen">
      <p>Centered dialog with backdrop and focus trap.</p>
    </oge-modal>
    <oge-window title="Quick notes" [(opened)]="windowOpen" [width]="360">
      <p>Notes</p>
    </oge-window>
  `,
})
class OverlayHost {
  // opened on the server on purpose: the portal, focus trap and scroll lock
  // all run their open path during the render
  protected readonly modalOpen = signal(true);
  protected readonly windowOpen = signal(true);
  protected readonly menu = [{ text: 'Copy' }, { text: 'Paste' }];
}

export const OVERLAY: SsrFamily = {
  name: 'overlay',
  host: OverlayHost,
  expect: ['oge-modal', 'Team settings', 'oge-window'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeMenubar,
    OgeBreadcrumb,
    OgeDrawer,
    OgeTreeView,
    OgeStepper,
    OgeStep,
    OgePagination,
  ],
  template: `
    <oge-menubar [items]="menu" />
    <oge-breadcrumb [items]="trail" />
    <oge-drawer [opened]="true" mode="side" [size]="240">
      <oge-tree-view ogeDrawerPanel [items]="tree" />
      <main>Content</main>
    </oge-drawer>
    <oge-stepper [activeIndex]="0">
      <oge-step label="Account">Account fields</oge-step>
      <oge-step label="Shipping">Shipping fields</oge-step>
    </oge-stepper>
    <oge-pagination [pageIndex]="0" [itemCount]="400" [pageSize]="20" />
  `,
})
class NavigationHost {
  protected readonly menu = [
    { text: 'File', items: [{ text: 'New' }, { text: 'Open' }] },
    { text: 'Help' },
  ];
  protected readonly trail = [{ text: 'Home' }, { text: 'Reports' }];
  protected readonly tree = [
    { id: 1, text: 'Inbox', items: [{ id: 2, text: 'Unread' }] },
    { id: 3, text: 'Archive' },
  ];
}

export const NAVIGATION: SsrFamily = {
  name: 'navigation',
  host: NavigationHost,
  expect: ['oge-menubar', 'oge-breadcrumb', 'oge-stepper', 'Inbox'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeAccordion,
    OgeAccordionItem,
    OgeAlert,
    OgeCard,
    OgeProgressBar,
    OgeSplitter,
    OgeSplitterPane,
    OgeTimeline,
    OgeToolbar,
    OgeToolbarItem,
  ],
  template: `
    <oge-toolbar>
      <oge-toolbar-item text="New" />
      <oge-toolbar-item type="separator" />
      <oge-toolbar-item text="Delete" location="after" />
    </oge-toolbar>
    <oge-accordion [selectedIndex]="0" [collapsible]="true">
      <oge-accordion-item title="Account">Account settings</oge-accordion-item>
      <oge-accordion-item title="Notifications">Notices</oge-accordion-item>
    </oge-accordion>
    <oge-splitter style="height: 200px">
      <oge-splitter-pane key="list">Rows</oge-splitter-pane>
      <oge-splitter-pane key="detail">Details</oge-splitter-pane>
    </oge-splitter>
    <oge-card header="Outlined">Card body</oge-card>
    <oge-alert severity="info">Heads up</oge-alert>
    <oge-progress-bar [value]="40" ariaLabel="Progress" />
    <oge-timeline [items]="events" />
  `,
})
class LayoutHost {
  protected readonly events = [
    { title: 'Ordered', date: new Date(2026, 7, 1) },
    { title: 'Shipped', date: new Date(2026, 7, 3) },
  ];
}

export const LAYOUT: SsrFamily = {
  name: 'layout',
  host: LayoutHost,
  expect: ['oge-toolbar', 'oge-accordion', 'oge-splitter', 'Card body'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTabs, OgeTabPanel, OgeTab],
  template: `
    <oge-tabs [items]="tabs" [(selectedIndex)]="index" />
    <oge-tab-panel [selectedIndex]="0">
      <oge-tab text="Overview">Overview panel</oge-tab>
      <oge-tab text="Details">Details panel</oge-tab>
    </oge-tab-panel>
  `,
})
class TabsHost {
  protected readonly index = signal(1);
  protected readonly tabs = [
    { key: 'a', text: 'Inbox', badge: 3 },
    { key: 'b', text: 'Sent' },
    { key: 'c', text: 'Drafts', disabled: true },
  ];
}

export const TABS: SsrFamily = {
  name: 'tabs',
  host: TabsHost,
  expect: ['oge-tabs', 'oge-tab-panel', 'Inbox', 'Overview panel'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeButton, OgeButtonGroup, OgeDropDownButton, OgeFab],
  template: `
    <oge-button text="Save" severity="accent" />
    <oge-button-group selectionMode="single" [(selectedKeys)]="kind">
      <oge-button value="person" text="Person" />
      <oge-button value="company" text="Company" />
    </oge-button-group>
    <oge-drop-down-button text="Export" [items]="exports" />
    <oge-fab ariaLabel="Add" />
  `,
})
class ButtonsHost {
  protected readonly kind = signal<readonly unknown[]>(['person']);
  protected readonly exports = [{ text: 'CSV' }, { text: 'Excel' }];
}

export const BUTTONS: SsrFamily = {
  name: 'buttons',
  host: ButtonsHost,
  expect: ['oge-button', 'oge-button-group', 'Company'],
};

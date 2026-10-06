import type { ReactElement } from 'react';
import { OgeBpmnEditor } from '@oge-ui/react-bpmn';
import {
  OgeButton,
  OgeButtonGroup,
  OgeDropDownButton,
} from '@oge-ui/react-buttons';
import { OgeChart, OgePieChart, OgeCircularGauge } from '@oge-ui/react-charts';
import { OgeForm } from '@oge-ui/react-forms';
import { OgeGantt } from '@oge-ui/react-gantt';
import { OgeGrid } from '@oge-ui/react-grid';
import {
  OgeCalendar,
  OgeCheckBox,
  OgeDateBox,
  OgeNumberBox,
  OgeSelectBox,
  OgeSlider,
  OgeSwitch,
  OgeTagBox,
  OgeTextBox,
} from '@oge-ui/react-inputs';
import { OgeKanban } from '@oge-ui/react-kanban';
import {
  OgeAccordion,
  OgeAlert,
  OgeCard,
  OgeSplitter,
  OgeToolbar,
} from '@oge-ui/react-layout';
import {
  OgeBreadcrumb,
  OgeDrawer,
  OgeMenubar,
  OgePagination,
  OgeStepper,
  OgeTreeView,
} from '@oge-ui/react-navigation';
import { OgeModal, OgePopover, OgeTooltip } from '@oge-ui/react-overlay';
import { OgePivotGrid } from '@oge-ui/react-pivot';
import { OgeScheduler } from '@oge-ui/react-scheduler';
import { OgeTabPanel, OgeTabs } from '@oge-ui/react-tabs';
import { OgeTreeList } from '@oge-ui/react-tree-list';
import { OgeFileUploader } from '@oge-ui/react-upload';
import { OgeEditor } from '@oge-ui/react-editor';

/** One React family: the tree both renders use, and text it must contain. */
export interface ReactSsrFamily {
  readonly name: string;
  readonly tree: () => ReactElement;
  readonly expect: readonly string[];
}

// Fixed local dates and explicit locales: nothing may depend on "today", and
// a family left on its default locale follows `navigator.language` in the
// browser but the runtime default on the server — a mismatch by design, which
// is why SSR apps pass `locale` (ARCHITECTURE → "SSR and hydration").
const day = new Date(2026, 7, 6);
const people = [
  { id: 1, name: 'Ada Lovelace', team: 'Research', salary: 4200 },
  { id: 2, name: 'Grace Hopper', team: 'Compilers', salary: 5100 },
];
const org = [
  { id: 1, parentId: null, name: 'Ada Lovelace', title: 'CEO' },
  { id: 2, parentId: 1, name: 'Alan Turing', title: 'Engineer' },
];

export const REACT_FAMILIES: readonly ReactSsrFamily[] = [
  {
    name: 'react-grid',
    tree: () => (
      <OgeGrid
        data={people}
        keyField="id"
        columns={['id', 'name', 'team', 'salary']}
        paging={{ pageSize: 10 }}
        filterRow
      />
    ),
    // the React grid sets its data source in an effect, so the server markup
    // is the column headers and the empty state (ARCHITECTURE → "SSR and
    // hydration", known gaps); the hydration itself must still match
    expect: ['oge-grid', 'Salary'],
  },
  {
    name: 'react-tree-list',
    tree: () => (
      <OgeTreeList
        data={org}
        keyExpr="id"
        parentIdExpr="parentId"
        autoExpandAll
        columns={['name', 'title']}
      />
    ),
    expect: ['oge-tree-list', 'Title'],
  },
  {
    name: 'react-pivot',
    tree: () => (
      <OgePivotGrid
        data={[
          { region: 'EMEA', year: '2026', amount: 1249 },
          { region: 'APAC', year: '2026', amount: 2140 },
        ]}
        fields={[
          { dataField: 'region', area: 'row' },
          { dataField: 'year', area: 'column' },
          { dataField: 'amount', area: 'data', summaryType: 'sum' },
        ]}
      />
    ),
    expect: ['oge-pivot-grid', 'EMEA'],
  },
  {
    name: 'react-charts',
    tree: () => (
      <>
        <OgeChart
          dataSource={[
            { quarter: 'Q1', product: 120 },
            { quarter: 'Q2', product: 150 },
          ]}
          series={[
            { type: 'bar', argumentField: 'quarter', valueField: 'product' },
          ]}
          title="Quarterly revenue"
          style={{ height: 320 }}
        />
        <OgePieChart
          dataSource={[
            { channel: 'Search', share: 60 },
            { channel: 'Social', share: 40 },
          ]}
          argumentField="channel"
          valueField="share"
          style={{ height: 240 }}
        />
        <OgeCircularGauge value={72} style={{ height: 200 }} />
      </>
    ),
    expect: ['oge-chart', 'Quarterly revenue'],
  },
  {
    name: 'react-scheduler',
    tree: () => (
      <OgeScheduler
        dataSource={[
          {
            id: 1,
            text: 'Design review',
            startDate: new Date(2026, 7, 4, 9, 30),
            endDate: new Date(2026, 7, 4, 11, 0),
          },
        ]}
        defaultCurrentDate={day}
        defaultCurrentView="week"
        locale="en-US"
        style={{ height: 560 }}
      />
    ),
    expect: ['oge-scheduler', 'Design review'],
  },
  {
    // today's week, all day long: the now-line is on screen whenever the
    // spec runs, so its clock-dependent position is exercised for real
    name: 'react-scheduler-today',
    tree: () => (
      <OgeScheduler
        dataSource={[]}
        defaultCurrentView="week"
        dayStartHour={0}
        dayEndHour={24}
        showCurrentTimeIndicator
        locale="en-US"
        style={{ height: 560 }}
      />
    ),
    expect: ['oge-scheduler'],
  },
  {
    name: 'react-gantt',
    tree: () => (
      <OgeGantt
        tasks={[
          {
            id: 1,
            title: 'Release 1.0',
            start: new Date(2026, 7, 3),
            end: new Date(2026, 7, 21),
          },
          {
            id: 2,
            parentId: 1,
            title: 'Design',
            start: new Date(2026, 7, 3),
            end: new Date(2026, 7, 7),
          },
        ]}
        dependencies={[]}
        locale="en-US"
        style={{ height: 420 }}
      />
    ),
    expect: ['oge-gantt', 'Release 1.0'],
  },
  {
    name: 'react-kanban',
    tree: () => (
      <OgeKanban
        dataSource={[
          { id: 1, status: 'todo', title: 'Upgrade CI runners' },
          { id: 2, status: 'done', title: 'Checkout revamp' },
        ]}
        keyExpr="id"
        columnExpr="status"
        titleExpr="title"
        columns={[
          { key: 'todo', title: 'To do' },
          { key: 'done', title: 'Done' },
        ]}
        style={{ height: 420 }}
      />
    ),
    expect: ['oge-kanban', 'Checkout revamp'],
  },
  {
    name: 'react-bpmn',
    tree: () => <OgeBpmnEditor style={{ height: 480 }} />,
    expect: ['oge-bpmn'],
  },
  {
    name: 'react-inputs',
    tree: () => (
      <>
        <OgeTextBox label="Name" defaultValue="Ada" />
        <OgeSelectBox
          label="City"
          items={['Ankara', 'Berlin']}
          defaultValue="Berlin"
        />
        <OgeDateBox label="Delivery" defaultValue={day} locale="en-US" />
        <OgeNumberBox label="Price" defaultValue={1234.5} locale="de-DE" />
        <OgeSlider defaultValue={40} ariaLabel="Volume" />
        <OgeCalendar defaultValue={day} locale="en-US" />
        <OgeCheckBox text="Subscribe" defaultValue />
        <OgeSwitch label="Notifications" />
        <OgeTagBox label="Cities" items={['Ankara', 'Berlin']} />
      </>
    ),
    expect: ['oge-text-box', 'oge-select-box', 'oge-calendar'],
  },
  {
    name: 'react-overlay',
    tree: () => (
      <>
        <OgeTooltip content="Saves your changes">
          <button type="button">Save</button>
        </OgeTooltip>
        <OgePopover
          title="Share report"
          trigger={<button type="button">Share</button>}
        >
          <p>Anyone with the link can view this report.</p>
        </OgePopover>
        <OgeModal title="Team settings" defaultOpened>
          <p>Centered dialog with backdrop and focus trap.</p>
        </OgeModal>
      </>
    ),
    expect: ['Save', 'Share'],
  },
  {
    name: 'react-navigation',
    tree: () => (
      <>
        <OgeMenubar
          items={[{ text: 'File', items: [{ text: 'New' }] }, { text: 'Help' }]}
        />
        <OgeBreadcrumb items={[{ text: 'Home' }, { text: 'Reports' }]} />
        <OgeDrawer mode="side" opened panel={<p>Navigation</p>}>
          <main>Content</main>
        </OgeDrawer>
        <OgeTreeView
          items={[{ id: 1, text: 'Inbox', items: [{ id: 2, text: 'Unread' }] }]}
        />
        <OgeStepper
          steps={[
            { key: 'a', label: 'Account' },
            { key: 'b', label: 'Shipping' },
          ]}
        />
        <OgePagination itemCount={400} pageSize={20} />
      </>
    ),
    expect: ['oge-menubar', 'oge-stepper', 'Inbox'],
  },
  {
    name: 'react-layout',
    tree: () => (
      <>
        <OgeToolbar items={[{ text: 'New' }, { text: 'Delete' }]} />
        <OgeAccordion
          collapsible
          items={[
            { key: 'a', title: 'Account', content: <p>Account settings</p> },
            { key: 'b', title: 'Notices', content: <p>Notices</p> },
          ]}
        />
        <OgeSplitter
          panes={[
            { key: 'list', content: 'Rows' },
            { key: 'detail', content: 'Details' },
          ]}
          style={{ height: 200 }}
        />
        <OgeCard header="Outlined">Card body</OgeCard>
        <OgeAlert severity="info">Heads up</OgeAlert>
      </>
    ),
    expect: ['oge-accordion', 'oge-splitter', 'Card body'],
  },
  {
    name: 'react-tabs',
    tree: () => (
      <>
        <OgeTabs
          items={[
            { key: 'a', text: 'Inbox', badge: 3 },
            { key: 'b', text: 'Sent' },
          ]}
        />
        <OgeTabPanel
          tabs={[
            { key: 'o', text: 'Overview', content: <p>Overview panel</p> },
            { key: 'd', text: 'Details', content: <p>Details panel</p> },
          ]}
        />
      </>
    ),
    expect: ['oge-tabs', 'Overview panel'],
  },
  {
    name: 'react-buttons',
    tree: () => (
      <>
        <OgeButton text="Save" severity="accent" />
        <OgeButtonGroup
          selectionMode="single"
          items={[
            { value: 'person', text: 'Person' },
            { value: 'company', text: 'Company' },
          ]}
        />
        <OgeDropDownButton
          text="Export"
          items={[{ text: 'CSV' }, { text: 'Excel' }]}
        />
      </>
    ),
    expect: ['oge-button', 'Company'],
  },
  {
    name: 'react-forms',
    tree: () => (
      <OgeForm
        defaultFormData={{ firstName: 'Ada', active: true }}
        layout={[
          { field: 'firstName', label: 'First name' },
          { field: 'active', label: 'Active' },
        ]}
      />
    ),
    expect: ['oge-form', 'First name'],
  },
  {
    name: 'react-upload',
    tree: () => <OgeFileUploader accept="image/*,.pdf" maxFileCount={5} />,
    expect: ['oge-upload'],
  },
  {
    name: 'react-editor',
    tree: () => (
      <OgeEditor
        label="Notes"
        defaultValue="<h2>Release notes</h2><p>Hello <strong>world</strong></p>"
        maxLength={500}
      />
    ),
    expect: ['oge-editor', 'Notes'],
  },
];

import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  OgeAccordion,
  OgeAppBar,
  OgeAppBarEnd,
  OgeAppBarStart,
  OgeAvatar,
  OgeAvatarGroup,
  OgeButton,
  OgeButtonGroup,
  OgeButtonIcon,
  OgeCard,
  OgeCardHeaderActions,
  OgeCellTemplate,
  OgeChip,
  OgeColumn,
  OgeDateRangeBox,
  OgeDrawer,
  OgeFileUploader,
  OgeForm,
  OgeGrid,
  OgeModal,
  OgeModalFooter,
  OgeProgressBar,
  OgeSelectBox,
  OgeStep,
  OgeStepper,
  OgeTab,
  OgeTabPanel,
  OgeTimeline,
  OgeToastService,
  OgeTooltip,
  ogeDateRangePresets,
  type OgeAccordionItemData,
  type OgeAvatarItem,
  type OgeButtonGroupItem,
  type OgeButtonGroupSelectionChangedEvent,
  type OgeCalendarRange,
  type OgeChipSeverity,
  type OgeFormItemData,
  type OgeValueFormat,
} from 'oge-ui';
import { exportGridToExcel } from '@oge-ui/grid/export-excel';
import {
  OgeChart,
  OgeCircularGauge,
  OgeFunnelChart,
  OgePieChart,
  OgeSparkline,
  type OgeChartSeriesInput,
} from '@oge-ui/charts';
import {
  OgeKanban,
  type OgeKanbanCardAddedEvent,
  type OgeKanbanCardDeletedEvent,
  type OgeKanbanCardMovedEvent,
  type OgeKanbanCardUpdatedEvent,
  type OgeKanbanColumn,
} from '@oge-ui/kanban';
import {
  OgePivotField,
  OgePivotGrid,
  type OgePivotRowHeaderLayout,
} from '@oge-ui/pivot';
import { OgeSpreadsheet } from '@oge-ui/spreadsheet';
import { OgeScheduler, type OgeSchedulerView } from '@oge-ui/scheduler';
import { OgeGantt } from '@oge-ui/gantt';
import { OgeBpmnEditor } from '@oge-ui/bpmn';
import { OgeChat, OgeGridAssistant, type OgeChatMessage } from '@oge-ui/ai';
import {
  CRM_ACTIVITY_TIMELINE,
  DEAL_STAGES,
  GANTT_DEPENDENCIES,
  GANTT_RESOURCES,
  GANTT_TASKS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_DEALS,
  INITIAL_LEADS,
  MONTHLY_REVENUE_SERIES,
  PIPELINE_FUNNEL_DATA,
  PROJECT_COLUMNS,
  PROJECT_NAMES,
  PROJECT_TASKS,
  REGIONS,
  REGION_SHARE_DATA,
  SALES_TEAM_QUOTAS,
  SAMPLE_BPMN_XML,
  SCHEDULER_APPOINTMENTS,
  SCHEDULER_RESOURCES,
  buildCustomerSummaries,
  createAstraAiTransport,
  generateOrders,
  type CrmDeal,
  type CrmLead,
  type CustomerSummary,
  type DealStage,
  type ProjectTask,
  type ProjectTaskStatus,
  type SalesOrder,
  type SalesRepQuota,
} from './data';

/* 24×24 stroke icons (path data only) */
const ICONS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  sun: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  overview: 'M3 3v18h18M7 14l4-4 4 3 5-6',
  projects: 'M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v12h-4z',
  orders: 'M4 6h16M4 10h16M4 14h16M4 18h10',
  pivot: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm0 6h18M9 3v18',
  workbook: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  roadmap: 'M3 6h10M7 12h12M5 18h14',
  workflows: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 6h6l3 9M6 9v6',
  copilot: 'M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3Z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v5m0-8.5v.5',
} as const;

export type CrmViewKey =
  | 'overview'
  | 'projects'
  | 'orders'
  | 'pivot'
  | 'workbook'
  | 'calendar'
  | 'roadmap'
  | 'workflows'
  | 'copilot';

type NavGroup = 'Workspace' | 'Analytics' | 'Planning' | 'Automation';

export interface NavItem {
  key: CrmViewKey;
  label: string;
  description: string;
  group: NavGroup;
  packageName: string;
  icon: string;
}

interface NewDealDraft {
  title: string;
  company: string;
  contact: string;
  owner: string;
  region: SalesOrder['region'];
  stage: DealStage;
  amount: number;
}

const TEAM = ['Aylin Kaya', 'Kerem Yılmaz', 'Selin Demir', 'Emre Karaca'] as const;

/** True once per browser: the intro opens on the first visit only. */
function firstVisit(flag: string): boolean {
  try {
    if (localStorage.getItem(flag)) return false;
    localStorage.setItem(flag, '1');
    return true;
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-root',
  imports: [
    OgeAccordion,
    OgeAppBar,
    OgeAppBarStart,
    OgeAppBarEnd,
    OgeAvatar,
    OgeAvatarGroup,
    OgeBpmnEditor,
    OgeButton,
    OgeButtonGroup,
    OgeButtonIcon,
    OgeCard,
    OgeCardHeaderActions,
    OgeCellTemplate,
    OgeChart,
    OgeChat,
    OgeChip,
    OgeCircularGauge,
    OgeColumn,
    OgeDateRangeBox,
    OgeDrawer,
    OgeFileUploader,
    OgeForm,
    OgeFunnelChart,
    OgeGantt,
    OgeGrid,
    OgeGridAssistant,
    OgeKanban,
    OgeModal,
    OgeModalFooter,
    OgePieChart,
    OgePivotField,
    OgePivotGrid,
    OgeProgressBar,
    OgeScheduler,
    OgeSelectBox,
    OgeSparkline,
    OgeSpreadsheet,
    OgeStep,
    OgeStepper,
    OgeTab,
    OgeTabPanel,
    OgeTimeline,
    OgeTooltip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <!-- ───────────────── header ───────────────── -->
      <oge-app-bar landmark="banner" positionMode="sticky" ariaLabel="AstraCRM">
        <div ogeAppBarStart class="app-brand-row">
          <button
            type="button"
            class="app-icon-btn"
            aria-label="Toggle navigation"
            [attr.aria-expanded]="sidebarOpen()"
            (click)="toggleSidebar()"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path [attr.d]="icons.menu" />
            </svg>
          </button>

          <span class="app-brand">
            <img src="brand.svg" alt="" width="28" height="28" class="app-brand-mark" />
            <span class="app-brand-name">AstraCRM</span>
          </span>
        </div>

        <div ogeAppBarEnd class="app-actions">
          <oge-avatar-group
            class="app-team"
            [items]="teamAvatars"
            [max]="4"
            size="xs"
            ariaLabel="Account executives online"
          />
          <button
            type="button"
            class="app-icon-btn"
            ogeTooltip="About this demo"
            tooltipPlacement="bottom"
            aria-label="About this demo"
            (click)="aboutOpen.set(true)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path [attr.d]="icons.info" />
            </svg>
          </button>
          <button
            type="button"
            class="app-icon-btn"
            [ogeTooltip]="darkMode() ? 'Switch to light theme' : 'Switch to dark theme'"
            tooltipPlacement="bottom"
            [attr.aria-label]="darkMode() ? 'Switch to light theme' : 'Switch to dark theme'"
            [attr.aria-pressed]="darkMode()"
            (click)="darkMode.set(!darkMode())"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path [attr.d]="darkMode() ? icons.sun : icons.moon" />
            </svg>
          </button>
        </div>
      </oge-app-bar>

      <!-- ───────────────── sidebar + main ───────────────── -->
      <oge-drawer
        class="app-drawer"
        [(opened)]="sidebarOpen"
        mode="side"
        position="start"
        [size]="250"
        [minSize]="64"
        [compactBelow]="960"
        ariaLabel="Workspace navigation"
      >
        <aside ogeDrawerPanel class="app-sidebar" [class.is-rail]="!sidebarOpen()">
          <nav class="app-nav" aria-label="Workspace">
            @for (group of navGroups; track group) {
              <div class="app-nav-group">
                @if (sidebarOpen()) {
                  <span class="app-nav-group-label">{{ group }}</span>
                }
                @for (item of itemsByGroup(group); track item.key) {
                  <button
                    type="button"
                    class="app-nav-item"
                    [class.is-active]="activeView() === item.key"
                    [attr.aria-current]="activeView() === item.key ? 'page' : null"
                    [ogeTooltip]="sidebarOpen() ? '' : item.label"
                    tooltipPlacement="right"
                    [attr.aria-label]="sidebarOpen() ? null : item.label"
                    (click)="selectView(item.key)"
                  >
                    <svg class="app-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path [attr.d]="item.icon" />
                    </svg>
                    @if (sidebarOpen()) {
                      <span class="app-nav-label">{{ item.label }}</span>
                      @if (item.key === 'projects') {
                        <span class="app-nav-count">{{ openTaskCount() }}</span>
                      }
                    }
                  </button>
                }
              </div>
            }
          </nav>

          <div class="app-nav-foot">
            @if (sidebarOpen()) {
              <a class="app-credit" href="https://ogeui.com" target="_blank" rel="noopener">
                <img src="oge-mark.png" alt="" width="16" height="16" />
                <span>Built with <strong>OGE UI 1.1.6</strong></span>
              </a>
              <span class="app-nav-foot-fw">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2 2.5 5.4l1.45 12.56L12 22l8.05-4.04L21.5 5.4 12 2Zm0 2.2 7.3 2.6-1.15 10-6.15 3.1-6.15-3.1-1.15-10L12 4.2Zm0 2.3L7.1 17h1.85l1-2.5h4.1l1 2.5h1.85L12 6.5Zm0 3 1.4 3.5h-2.8L12 9.5Z"/></svg>
                Angular 21
              </span>
            } @else {
              <a class="app-credit" href="https://ogeui.com" target="_blank" rel="noopener" aria-label="Built with OGE UI 1.1.6">
                <img src="oge-mark.png" alt="" width="18" height="18" />
              </a>
            }
          </div>
        </aside>

        <main class="app-main">
          <!-- page header -->
          <header class="page-head">
            <div class="page-head-copy">
              <h1 class="page-title">{{ currentNavItem().label }}</h1>
              <p class="page-desc">{{ currentNavItem().description }}</p>
            </div>
            <div class="page-head-end">
              <code class="page-pkg" [ogeTooltip]="'OGE UI package behind this page'" tooltipPlacement="bottom">{{ currentNavItem().packageName }}</code>
              @switch (activeView()) {
                @case ('overview') {
                  <oge-button text="New deal" severity="accent" stylingMode="contained" size="sm" (clicked)="openNewDealModal()">
                    <svg ogeButtonIcon viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path [attr.d]="icons.plus" /></svg>
                  </oge-button>
                }
                @case ('projects') {
                  <oge-button text="New task" severity="accent" stylingMode="contained" size="sm" (clicked)="newTask()">
                    <svg ogeButtonIcon viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path [attr.d]="icons.plus" /></svg>
                  </oge-button>
                }
                @case ('orders') {
                  <oge-button text="Export .xlsx" stylingMode="outlined" size="sm" (clicked)="exportOrders()">
                    <svg ogeButtonIcon viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="icons.download" /></svg>
                  </oge-button>
                }
                @case ('pivot') {
                  <oge-button text="Export CSV" stylingMode="outlined" size="sm" (clicked)="pivotGrid()?.exportCsv('astra-revenue-pivot.csv')">
                    <svg ogeButtonIcon viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="icons.download" /></svg>
                  </oge-button>
                }
                @case ('workflows') {
                  <oge-button text="Export BPMN" stylingMode="outlined" size="sm" (clicked)="exportBpmnXml()">
                    <svg ogeButtonIcon viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="icons.download" /></svg>
                  </oge-button>
                }
              }
            </div>
          </header>

          <!-- shared filters for the revenue-driven pages -->
          @if (usesFilters()) {
            <section class="filter-bar" aria-label="Workspace filters">
              <oge-select-box
                class="filter-region"
                label="Region"
                labelMode="outside"
                [items]="regionOptions"
                [(value)]="selectedRegion"
                [showClearButton]="true"
                placeholder="All regions"
                size="sm"
              />
              <oge-date-range-box
                class="filter-dates"
                label="Order period"
                labelMode="outside"
                [(value)]="dateRange"
                [presets]="datePresets"
                [showClearButton]="true"
                size="sm"
              />
              <oge-button class="filter-reset" text="Reset" stylingMode="text" size="sm" (clicked)="resetFilters()">
                <svg ogeButtonIcon viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="icons.reset" /></svg>
              </oge-button>
              <span class="filter-summary">{{ filteredOrders().length.toLocaleString('en-US') }} orders in range</span>
            </section>
          }

          <!-- ═══════════ Overview ═══════════ -->
          @if (activeView() === 'overview') {
            <section class="kpi-grid" aria-label="Key metrics">
              <oge-card size="sm">
                <div class="kpi">
                  <span class="kpi-label">Recognized revenue</span>
                  <strong class="kpi-value">{{ formatCurrency(totalRevenue()) }}</strong>
                  <span class="kpi-foot"><oge-chip label="+18.4% YoY" severity="success" size="sm" /></span>
                </div>
              </oge-card>
              <oge-card size="sm">
                <div class="kpi">
                  <span class="kpi-label">Open pipeline</span>
                  <strong class="kpi-value">{{ formatCurrency(openPipelineAmount()) }}</strong>
                  <span class="kpi-foot">{{ openDealsCount() }} open deals · {{ formatCurrency(closedWonAmount()) }} won</span>
                </div>
              </oge-card>
              <oge-card size="sm">
                <div class="kpi">
                  <span class="kpi-label">Qualified leads</span>
                  <strong class="kpi-value">{{ filteredLeads().length }}</strong>
                  <span class="kpi-foot">{{ formatCurrency(leadsPipelineValue()) }} estimated value</span>
                </div>
              </oge-card>
              <oge-card size="sm">
                <div class="kpi">
                  <span class="kpi-label">Delivery on track</span>
                  <strong class="kpi-value">{{ deliveryProgress() }}%</strong>
                  <oge-progress-bar [value]="deliveryProgress()" [max]="100" severity="accent" [showLabel]="false" ariaLabel="Delivery progress across projects" />
                </div>
              </oge-card>
            </section>

            <section class="grid-2-1">
              <oge-card header="Revenue trend" subheader="Recognized and expansion ARR against the operating target, $K">
                <oge-chart
                  [dataSource]="monthlyRevenueData"
                  [series]="revenueChartSeries"
                  [legend]="{ visible: true, position: 'top', interactive: true }"
                  [tooltip]="{ enabled: true, shared: true }"
                  [crosshair]="{ enabled: true }"
                  class="chart-lg"
                />
              </oge-card>
              <oge-card header="Revenue by region" subheader="Share of recognized revenue, $K">
                <oge-pie-chart
                  [dataSource]="regionShareData"
                  type="doughnut"
                  argumentField="region"
                  valueField="revenue"
                  [innerRadius]="0.62"
                  centerLabel="$9.44M"
                  [legend]="{ visible: true, position: 'bottom' }"
                  [tooltipEnabled]="true"
                  class="chart-lg"
                />
              </oge-card>
            </section>

            <section class="grid-3">
              <oge-card header="Conversion funnel" subheader="Qualified inbound to closed won">
                <oge-funnel-chart
                  [dataSource]="pipelineFunnelData"
                  argumentField="stage"
                  valueField="value"
                  [legend]="{ visible: true, position: 'bottom' }"
                  class="chart-md"
                />
              </oge-card>
              <oge-card header="Quarter health" subheader="Quota attainment and customer health index">
                <div class="gauge-row">
                  <oge-circular-gauge [value]="91" [subvalues]="[85]" title="Quota attainment" class="gauge" />
                  <oge-circular-gauge [value]="94" [subvalues]="[90]" title="Customer health" class="gauge" />
                </div>
              </oge-card>
              <oge-card header="Team attainment" subheader="Quarter to date, by account executive">
                <ul class="rep-list">
                  @for (rep of salesTeamQuotas; track rep.id) {
                    <li class="rep-row">
                      <oge-avatar [name]="rep.name" [status]="rep.status" size="sm" />
                      <span class="rep-meta">
                        <strong>{{ rep.name }}</strong>
                        <span>{{ rep.region }} · {{ rep.attainment }}%</span>
                      </span>
                      <oge-sparkline [dataSource]="rep.trend" type="area" class="rep-spark" />
                    </li>
                  }
                </ul>
              </oge-card>
            </section>

            <section class="grid-2-1">
              <oge-card header="Open opportunities" subheader="Highest-value deals in flight">
                <oge-grid [data]="filteredDeals()" keyField="id" [rowHeight]="42" sortable="single" [paging]="{ pageSize: 6 }">
                  <oge-column field="dealCode" caption="Code" [width]="95" />
                  <oge-column field="title" caption="Opportunity" [minWidth]="210" />
                  <oge-column field="company" caption="Account" [width]="175" />
                  <oge-column field="stage" caption="Stage" [width]="135">
                    <ng-container *ogeCellTemplate="let stage">
                      <oge-chip [label]="$any(stage)" [severity]="dealStageSeverity($any(stage))" size="sm" />
                    </ng-container>
                  </oge-column>
                  <oge-column field="amount" caption="Value" dataType="number" alignment="end" [format]="currencyFormat" [width]="130" />
                </oge-grid>
              </oge-card>
              <oge-card header="Activity" subheader="Latest events across accounts">
                <oge-timeline [items]="activityTimeline" density="compact" />
              </oge-card>
            </section>
          }

          <!-- ═══════════ Projects (delivery board) ═══════════ -->
          @if (activeView() === 'projects') {
            <section class="board-summary">
              <oge-card size="sm" class="board-stats">
                <dl class="stat-list">
                  <div class="stat"><dt>Open tasks</dt><dd>{{ openTaskCount() }}</dd></div>
                  <div class="stat"><dt>In progress</dt><dd>{{ taskCountFor('in-progress') }}</dd></div>
                  <div class="stat"><dt>In review</dt><dd>{{ taskCountFor('review') }}</dd></div>
                  <div class="stat" [class.is-danger]="overdueTaskCount() > 0"><dt>Overdue</dt><dd>{{ overdueTaskCount() }}</dd></div>
                </dl>
              </oge-card>
              <oge-card size="sm" header="Projects" class="board-projects">
                <ul class="project-list">
                  @for (p of projectProgress(); track p.name) {
                    <li class="project-row">
                      <span class="project-name">{{ p.name }}</span>
                      <span class="project-count">{{ p.done }}/{{ p.total }}</span>
                      <oge-progress-bar [value]="p.done" [max]="p.total" [severity]="p.done === p.total ? 'success' : 'accent'" [showLabel]="false" [ariaLabel]="p.name + ' progress'" />
                    </li>
                  }
                </ul>
              </oge-card>
            </section>

            <oge-card header="Delivery board" subheader="Drag tasks between stages. Columns carry work-in-progress limits; lanes are projects.">
              <div ogeCardHeaderActions class="card-tools">
                <oge-button-group
                  [items]="boardModeItems"
                  selectionMode="single"
                  [selectedKeys]="[boardMode()]"
                  size="sm"
                  ariaLabel="Board layout"
                  (selectionChanged)="onBoardModeChange($event)"
                />
              </div>

              @if (boardMode() === 'board') {
                <oge-kanban
                  #board
                  [dataSource]="tasks()"
                  [columns]="projectColumns"
                  keyExpr="id"
                  columnExpr="status"
                  titleExpr="title"
                  descriptionExpr="summary"
                  swimlaneExpr="project"
                  assigneeExpr="assignee"
                  priorityExpr="priority"
                  dueDateExpr="dueDate"
                  tagsExpr="tags"
                  checklistExpr="checklist"
                  locale="en-US"
                  [showToolbar]="true"
                  [showFilterBar]="true"
                  [quickAdd]="true"
                  [inlineTitleEditing]="true"
                  [virtualScrolling]="false"
                  [columnWidth]="272"
                  [(collapsedSwimlanes)]="collapsedLanes"
                  (cardMoved)="onTaskMoved($event)"
                  (cardAdded)="onTaskAdded($event)"
                  (cardUpdated)="onTaskUpdated($event)"
                  (cardDeleted)="onTaskDeleted($event)"
                  style="height: 680px"
                />
              } @else {
                <oge-grid [data]="tasks()" keyField="id" [rowHeight]="42" sortable="multi" [groupPanel]="true" [searchPanel]="true" [paging]="{ pageSize: 12 }">
                  <oge-column field="title" caption="Task" [minWidth]="240" />
                  <oge-column field="project" caption="Project" [minWidth]="200" />
                  <oge-column field="status" caption="Stage" [width]="130">
                    <ng-container *ogeCellTemplate="let status">
                      <oge-chip [label]="statusLabel($any(status))" [severity]="statusSeverity($any(status))" size="sm" />
                    </ng-container>
                  </oge-column>
                  <oge-column field="assignee" caption="Owner" [width]="150" />
                  <oge-column field="priority" caption="Priority" [width]="110" />
                  <oge-column field="dueDate" caption="Due" dataType="date" [format]="shortDateFormat" [width]="110" />
                  <oge-column field="estimateHours" caption="Est. h" dataType="number" alignment="end" [width]="80" />
                </oge-grid>
              }
            </oge-card>
          }

          <!-- ═══════════ Orders ═══════════ -->
          @if (activeView() === 'orders') {
            <oge-card>
              <oge-tab-panel [(selectedIndex)]="ledgerTabIndex" ariaLabel="Ledger views">
                <oge-tab text="Orders">
                  <div class="tab-body">
                    <oge-grid
                      #ordersGridRef
                      [data]="filteredOrders()"
                      keyField="id"
                      [rowHeight]="40"
                      [filterRow]="true"
                      [searchPanel]="true"
                      [groupPanel]="true"
                      sortable="multi"
                      [paging]="{ pageSize: 12, pageSizes: [12, 25, 50, 100] }"
                    >
                      <oge-column field="orderNumber" caption="Order #" [width]="120" />
                      <oge-column field="orderDate" caption="Date" dataType="date" [format]="shortDateFormat" [width]="120" />
                      <oge-column field="company" caption="Company" [minWidth]="180" />
                      <oge-column field="customer" caption="Contact" [minWidth]="150" />
                      <oge-column field="region" caption="Region" [width]="135" />
                      <oge-column field="category" caption="Category" [width]="150" />
                      <oge-column field="quantity" caption="Units" dataType="number" alignment="end" [format]="integerFormat" [width]="90" />
                      <oge-column field="total" caption="Total" dataType="number" alignment="end" [format]="currencyFormat" [width]="130" />
                      <oge-column field="status" caption="Status" [width]="125">
                        <ng-container *ogeCellTemplate="let status">
                          <oge-chip [label]="$any(status)" [severity]="statusChipSeverity($any(status))" size="sm" />
                        </ng-container>
                      </oge-column>
                    </oge-grid>
                  </div>
                </oge-tab>
                <oge-tab text="Accounts">
                  <div class="tab-body">
                    <oge-grid [data]="customerSummaries()" keyField="id" [rowHeight]="42" [filterRow]="true" [searchPanel]="true" sortable="multi" [paging]="{ pageSize: 10 }">
                      <oge-column field="company" caption="Account" [minWidth]="190" />
                      <oge-column field="customer" caption="Sponsor" [minWidth]="155" />
                      <oge-column field="region" caption="Region" [width]="135" />
                      <oge-column field="tier" caption="Tier" [width]="120" />
                      <oge-column field="ordersCount" caption="Orders" dataType="number" alignment="end" [format]="integerFormat" [width]="100" />
                      <oge-column field="totalSpent" caption="Lifetime spend" dataType="number" alignment="end" [format]="currencyFormat" [width]="145" />
                    </oge-grid>
                  </div>
                </oge-tab>
              </oge-tab-panel>
            </oge-card>

            <section class="grid-2">
              <oge-card header="Onboarding playbook" subheader="Where new enterprise accounts are in the rollout">
                <oge-stepper [(activeIndex)]="onboardingStep" orientation="horizontal">
                  <oge-step label="Security & DPA">
                    <p class="step-desc">Mutual NDA, SOC 2 report and the data-processing addendum signed by legal.</p>
                  </oge-step>
                  <oge-step label="Provisioning">
                    <p class="step-desc">Dedicated VPC peering, KMS keys and SAML SSO configured in the primary regions.</p>
                  </oge-step>
                  <oge-step label="Telemetry">
                    <p class="step-desc">Ingest and inference endpoints benchmarked with the customer workload.</p>
                  </oge-step>
                  <oge-step label="Go-live">
                    <p class="step-desc">Production cut-over verified; QBR cadence scheduled with customer success.</p>
                  </oge-step>
                </oge-stepper>
              </oge-card>
              <oge-card header="Commercial terms" subheader="What every enterprise agreement includes">
                <oge-accordion [items]="playbookFaqItems" [multiple]="false" [collapsible]="true" />
              </oge-card>
            </section>
          }

          <!-- ═══════════ Pivot ═══════════ -->
          @if (activeView() === 'pivot') {
            <oge-card header="Revenue cube" subheader="Drag fields between rows, columns and measures; expand hierarchies in place.">
              <div ogeCardHeaderActions class="card-tools">
                <oge-button-group
                  [items]="pivotLayoutItems"
                  selectionMode="single"
                  [selectedKeys]="[pivotRowLayout()]"
                  size="sm"
                  ariaLabel="Row header layout"
                  (selectionChanged)="onPivotLayoutChange($event)"
                />
                <oge-button text="Expand rows" stylingMode="text" size="sm" (clicked)="pivotGrid()?.expandAll('row')" />
              </div>
              <oge-pivot-grid
                #pivotRef
                [data]="filteredOrders()"
                [fieldPanel]="true"
                [rowHeaderLayout]="pivotRowLayout()"
                [showRowTotals]="true"
                [showColumnTotals]="true"
                [showRowGrandTotals]="true"
                [showColumnGrandTotals]="true"
              >
                <oge-pivot-field dataField="region" caption="Region" area="row" />
                <oge-pivot-field dataField="category" caption="Product category" area="row" />
                <oge-pivot-field dataField="channel" caption="Channel" area="column" />
                <oge-pivot-field dataField="status" caption="Order status" area="filter" />
                <oge-pivot-field dataField="total" caption="Revenue" area="data" dataType="number" summaryType="sum" [format]="currencyFormat" />
                <oge-pivot-field dataField="quantity" caption="Units" area="data" dataType="number" summaryType="sum" />
              </oge-pivot-grid>
            </oge-card>
          }

          <!-- ═══════════ Workbook ═══════════ -->
          @if (activeView() === 'workbook') {
            <oge-card header="Commission workbook" subheader="Formulas, tables and sparklines read directly from .xlsx — or open your own file.">
              <div ogeCardHeaderActions class="card-tools">
                <oge-button-group
                  [items]="workbookPresetItems"
                  selectionMode="single"
                  [selectedKeys]="[selectedWorkbookUrl()]"
                  size="sm"
                  ariaLabel="Sample workbook"
                  (selectionChanged)="onWorkbookPresetChange($event)"
                />
              </div>
              <div class="workbook-upload">
                <oge-file-uploader accept=".xlsx,.xlsm" [multiple]="false" [showFileList]="false" [(value)]="uploadedSpreadsheets" ariaLabel="Open an .xlsx workbook" />
              </div>
              <oge-spreadsheet
                [source]="activeSpreadsheetSource()"
                [showFormulaBar]="true"
                [showSheetTabs]="true"
                [showStatusBar]="true"
                style="height: 560px"
              />
            </oge-card>
          }

          <!-- ═══════════ Calendar ═══════════ -->
          @if (activeView() === 'calendar') {
            <oge-card header="Executive calendar" subheader="Quarterly business reviews and architecture briefings, colour-coded by owner">
              <oge-scheduler
                [dataSource]="schedulerAppointments"
                [resources]="schedulerResources"
                [(currentDate)]="schedulerDate"
                [(currentView)]="schedulerView"
                [views]="['day', 'week', 'workWeek', 'month', 'agenda']"
                [dayStartHour]="8"
                [dayEndHour]="19"
                [showWeekNumbers]="true"
                style="height: 620px"
              />
            </oge-card>
          }

          <!-- ═══════════ Roadmap ═══════════ -->
          @if (activeView() === 'roadmap') {
            <oge-card header="Rollout roadmap" subheader="Work breakdown with dependencies, resource load and the critical path">
              <div ogeCardHeaderActions class="card-tools">
                <oge-button-group
                  [items]="ganttScaleItems"
                  selectionMode="single"
                  [selectedKeys]="[ganttScale()]"
                  size="sm"
                  ariaLabel="Timeline scale"
                  (selectionChanged)="onGanttScaleChange($event)"
                />
                <oge-button
                  text="Critical path"
                  [toggle]="true"
                  [(selected)]="showCriticalPath"
                  stylingMode="outlined"
                  size="sm"
                />
              </div>
              <oge-gantt
                [tasks]="ganttTasks"
                [dependencies]="ganttDependencies"
                [resources]="ganttResources"
                [(scaleType)]="ganttScale"
                [showCriticalPath]="showCriticalPath()"
                [showResourceWorkload]="true"
                [taskListWidth]="320"
                style="height: 560px"
              />
            </oge-card>
          }

          <!-- ═══════════ Workflows ═══════════ -->
          @if (activeView() === 'workflows') {
            <oge-card header="Deal approval workflow" subheader="BPMN 2.0 model of deal-desk approval and cloud provisioning, with live validation">
              <div ogeCardHeaderActions class="card-tools">
                <oge-button text="Zoom to fit" stylingMode="text" size="sm" (clicked)="bpmnEditor()?.zoomToFit()" />
              </div>
              <oge-bpmn-editor
                #bpmnRef
                [showMinimap]="true"
                [showPropertiesPanel]="true"
                [allowModeToggle]="true"
                [lint]="true"
                style="height: 580px"
              />
            </oge-card>
          }

          <!-- ═══════════ Copilot ═══════════ -->
          @if (activeView() === 'copilot') {
            <section class="grid-1-2">
              <oge-card header="Ask the workspace" subheader="Pipeline, quota and account questions answered from your data">
                <oge-chat
                  [transport]="aiTransport"
                  [(conversation)]="chatHistory"
                  [suggestions]="[
                    'Summarize the Q4 pipeline forecast',
                    'Who leads regional quota attainment?',
                    'Show EMEA enterprise health'
                  ]"
                  style="height: 520px"
                />
              </oge-card>
              <oge-card header="Orders, in plain language" subheader="Describe the view you want; the grid sorts, filters and groups itself.">
                <oge-grid-assistant
                  [target]="aiOrdersGrid"
                  [transport]="aiTransport"
                  mode="apply"
                  [suggestions]="['Group by region', 'Highest total first', 'Only refunded orders', 'Reset all filters']"
                />
                <div class="assistant-grid">
                  <oge-grid #aiOrdersGrid [data]="filteredOrders()" keyField="id" [rowHeight]="40" [groupPanel]="true" sortable="multi" [paging]="{ pageSize: 8 }">
                    <oge-column field="orderNumber" caption="Order #" [width]="115" />
                    <oge-column field="company" caption="Company" [minWidth]="170" />
                    <oge-column field="region" caption="Region" [width]="135" />
                    <oge-column field="category" caption="Category" [width]="145" />
                    <oge-column field="total" caption="Total" dataType="number" alignment="end" [format]="currencyFormat" [width]="125" />
                    <oge-column field="orderDate" caption="Date" dataType="date" [format]="shortDateFormat" [width]="120" />
                  </oge-grid>
                </div>
              </oge-card>
            </section>
          }
        </main>
      </oge-drawer>

      <!-- about this demo -->
      <oge-modal [(opened)]="aboutOpen" title="About this demo" ariaLabel="About this demo" [width]="680">
        <div class="about-hero">
          <img src="brand.svg" alt="" width="56" height="56" class="about-mark" />
          <div class="about-copy">
            <h2 class="about-title">AstraCRM</h2>
            <p class="about-tagline">Revenue operations, pipeline and delivery for enterprise sales teams.</p>
            <div class="about-chips">
              <oge-chip label="Angular 21" size="sm" />
              <oge-chip label="OGE UI 1.1.6" size="sm" severity="accent" />
              <oge-chip label="All 7 Pro families" size="sm" />
            </div>
          </div>
        </div>
        <p class="about-text">
          AstraCRM is a sample product built entirely with OGE UI: one shell, nine pages, and every
          commercial family next to the MIT grid, forms and overlays. Filters, edits, drag and drop
          and exports all work on local sample data — explore freely.
        </p>
        <ul class="about-grid">
          @for (item of navItems; track item.key) {
            <li class="about-item">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
              <span class="about-item-label">{{ item.label }}</span>
              <code class="about-item-pkg">{{ item.packageName }}</code>
            </li>
          }
        </ul>
        <div *ogeModalFooter class="about-links">
          <a class="about-link" href="https://github.com/oge-ui/oge-ui/tree/main/examples/sales-dashboard" target="_blank" rel="noopener">View source</a>
          <a class="about-link" href="https://stackblitz.com/github/oge-ui/oge-ui/tree/main/examples/sales-dashboard" target="_blank" rel="noopener">Open in StackBlitz</a>
          <a class="about-link" href="https://ogeui.com" target="_blank" rel="noopener">OGE UI docs</a>
          <a class="about-link" href="https://ogeui.com/pricing" target="_blank" rel="noopener">Pricing</a>
          <oge-button text="Start exploring" severity="accent" stylingMode="contained" size="sm" (clicked)="aboutOpen.set(false)" />
        </div>
      </oge-modal>

      <!-- new deal -->
      <oge-modal [(opened)]="newDealModalOpen" title="New deal" ariaLabel="Create a deal">
        <oge-form #dealForm [(formData)]="newDealDraft" [items]="newDealFormItems" [colCount]="2" labelLocation="top" />
        <div *ogeModalFooter class="modal-actions">
          <oge-button text="Cancel" stylingMode="text" (clicked)="newDealModalOpen.set(false)" />
          <oge-button text="Create deal" severity="accent" stylingMode="contained" (clicked)="saveNewDeal()" />
        </div>
      </oge-modal>
    </div>
  `,
})
export class App {
  private readonly doc = inject(DOCUMENT);
  private readonly toast = inject(OgeToastService);

  protected readonly ordersGrid = viewChild<OgeGrid<SalesOrder>>('ordersGridRef');
  protected readonly pivotGrid = viewChild<OgePivotGrid<SalesOrder>>('pivotRef');
  protected readonly bpmnEditor = viewChild<OgeBpmnEditor>('bpmnRef');
  protected readonly dealForm = viewChild<OgeForm>('dealForm');
  protected readonly board = viewChild<OgeKanban<ProjectTask>>('board');

  protected readonly icons = ICONS;

  protected readonly darkMode = signal(false);
  protected readonly aboutOpen = signal(firstVisit('astra-crm-intro-seen'));
  protected readonly sidebarOpen = signal(typeof window === 'undefined' || window.innerWidth >= 960);
  protected readonly activeView = signal<CrmViewKey>('overview');
  protected readonly ledgerTabIndex = signal(0);
  protected readonly onboardingStep = signal(2);

  protected readonly navGroups: readonly NavGroup[] = ['Workspace', 'Analytics', 'Planning', 'Automation'];

  protected readonly navItems: readonly NavItem[] = [
    { key: 'overview', label: 'Overview', group: 'Workspace', packageName: '@oge-ui/charts', icon: ICONS.overview,
      description: 'Revenue, pipeline and team performance for the selected period.' },
    { key: 'projects', label: 'Projects', group: 'Workspace', packageName: '@oge-ui/kanban', icon: ICONS.projects,
      description: 'Implementation work across customer projects, from backlog to done.' },
    { key: 'orders', label: 'Orders', group: 'Workspace', packageName: '@oge-ui/grid', icon: ICONS.orders,
      description: 'Ten thousand orders and the accounts behind them.' },
    { key: 'pivot', label: 'Revenue cube', group: 'Analytics', packageName: '@oge-ui/pivot', icon: ICONS.pivot,
      description: 'Slice revenue by region, product and channel.' },
    { key: 'workbook', label: 'Workbook', group: 'Analytics', packageName: '@oge-ui/spreadsheet', icon: ICONS.workbook,
      description: 'Commission models and ledgers opened straight from Excel.' },
    { key: 'calendar', label: 'Calendar', group: 'Planning', packageName: '@oge-ui/scheduler', icon: ICONS.calendar,
      description: 'Business reviews and briefings for the executive team.' },
    { key: 'roadmap', label: 'Roadmap', group: 'Planning', packageName: '@oge-ui/gantt', icon: ICONS.roadmap,
      description: 'Cloud rollout plan with dependencies and resource load.' },
    { key: 'workflows', label: 'Workflows', group: 'Automation', packageName: '@oge-ui/bpmn', icon: ICONS.workflows,
      description: 'Approval and provisioning processes as executable BPMN.' },
    { key: 'copilot', label: 'Copilot', group: 'Automation', packageName: '@oge-ui/ai', icon: ICONS.copilot,
      description: 'Ask questions and shape the data in plain language.' },
  ];

  protected readonly currentNavItem = computed(
    () => this.navItems.find((i) => i.key === this.activeView()) ?? this.navItems[0],
  );

  protected readonly usesFilters = computed(() =>
    this.activeView() === 'overview' || this.activeView() === 'orders' || this.activeView() === 'pivot' || this.activeView() === 'copilot',
  );

  /* ── data ─────────────────────────────────────────────── */
  private readonly allOrders: readonly SalesOrder[] = generateOrders(10_000);
  protected readonly deals = signal<readonly CrmDeal[]>(INITIAL_DEALS);
  protected readonly leads = signal<readonly CrmLead[]>(INITIAL_LEADS);
  protected readonly salesTeamQuotas: readonly SalesRepQuota[] = SALES_TEAM_QUOTAS;
  protected readonly activityTimeline = CRM_ACTIVITY_TIMELINE;
  protected readonly monthlyRevenueData = MONTHLY_REVENUE_SERIES;
  protected readonly regionShareData = REGION_SHARE_DATA;
  protected readonly pipelineFunnelData = PIPELINE_FUNNEL_DATA;

  protected readonly revenueChartSeries: readonly OgeChartSeriesInput[] = [
    { type: 'area', argumentField: 'month', valueField: 'arr', name: 'Recognized ARR', opacity: 0.2 },
    { type: 'bar', argumentField: 'month', valueField: 'expansion', name: 'Expansion ARR' },
    { type: 'spline', argumentField: 'month', valueField: 'target', name: 'Target', dashStyle: 'dash' },
  ];

  /* ── projects ─────────────────────────────────────────── */
  protected readonly tasks = signal<readonly ProjectTask[]>(PROJECT_TASKS);
  protected readonly projectColumns: readonly OgeKanbanColumn[] = PROJECT_COLUMNS;
  protected readonly collapsedLanes = signal<readonly string[]>([]);
  protected readonly boardMode = signal<'board' | 'list'>('board');
  protected readonly boardModeItems: readonly OgeButtonGroupItem[] = [
    { value: 'board', text: 'Board' },
    { value: 'list', text: 'List' },
  ];

  protected readonly openTaskCount = computed(() => this.tasks().filter((t) => t.status !== 'done').length);
  protected readonly overdueTaskCount = computed(() => {
    const now = Date.now();
    return this.tasks().filter((t) => t.status !== 'done' && t.dueDate.getTime() < now).length;
  });
  protected readonly deliveryProgress = computed(() => {
    const all = this.tasks();
    if (all.length === 0) return 0;
    return Math.round((all.filter((t) => t.status === 'done').length / all.length) * 100);
  });
  protected readonly projectProgress = computed(() =>
    PROJECT_NAMES.map((name) => {
      const mine = this.tasks().filter((t) => t.project === name);
      return { name, total: mine.length, done: mine.filter((t) => t.status === 'done').length };
    }),
  );

  /* ── pivot / workbook / scheduler / gantt / ai ───────── */
  protected readonly pivotRowLayout = signal<OgePivotRowHeaderLayout>('outline');
  protected readonly pivotLayoutItems: readonly OgeButtonGroupItem[] = [
    { value: 'compact', text: 'Compact' },
    { value: 'outline', text: 'Outline' },
    { value: 'tabular', text: 'Tabular' },
  ];

  protected readonly selectedWorkbookUrl = signal<string>('/demo/spreadsheet/tables.xlsx');
  protected readonly uploadedSpreadsheets = signal<readonly File[]>([]);
  protected readonly activeSpreadsheetSource = computed(
    () => this.uploadedSpreadsheets()[0] ?? this.selectedWorkbookUrl(),
  );
  protected readonly workbookPresetItems: readonly OgeButtonGroupItem[] = [
    { value: '/demo/spreadsheet/tables.xlsx', text: 'Tables' },
    { value: '/demo/spreadsheet/formulas.xlsx', text: 'Formulas' },
    { value: '/demo/spreadsheet/sparklines.xlsx', text: 'Sparklines' },
    { value: '/demo/spreadsheet/structure.xlsx', text: 'Multi-sheet' },
  ];

  protected readonly schedulerAppointments = SCHEDULER_APPOINTMENTS;
  protected readonly schedulerResources = SCHEDULER_RESOURCES;
  protected readonly schedulerDate = signal(new Date(2026, 9, 21));
  protected readonly schedulerView = signal<OgeSchedulerView>('week');

  protected readonly ganttTasks = GANTT_TASKS;
  protected readonly ganttDependencies = GANTT_DEPENDENCIES;
  protected readonly ganttResources = GANTT_RESOURCES;
  protected readonly ganttScale = signal<'days' | 'weeks' | 'months'>('weeks');
  protected readonly showCriticalPath = signal(true);
  protected readonly ganttScaleItems: readonly OgeButtonGroupItem[] = [
    { value: 'days', text: 'Days' },
    { value: 'weeks', text: 'Weeks' },
    { value: 'months', text: 'Months' },
  ];

  protected readonly aiTransport = createAstraAiTransport();
  protected readonly chatHistory = signal<readonly OgeChatMessage[]>(INITIAL_CHAT_MESSAGES);

  protected readonly playbookFaqItems: readonly OgeAccordionItemData[] = [
    {
      key: 'sla',
      title: '99.99% uptime with multi-region failover',
      description: 'Active-active failover across US-East, EU-Central and AP-Northeast with a 15 ms recovery point objective.',
    },
    {
      key: 'sec',
      title: 'SOC 2 Type II, ISO 27001 and HIPAA',
      description: 'Customer-managed encryption keys and single-tenant worker pools are provisioned during onboarding.',
    },
    {
      key: 'rev',
      title: 'Volume commitment and annual true-up',
      description: 'Seat and compute expansions keep the baseline tier discount for the remaining term of the agreement.',
    },
  ];

  /* ── filters ──────────────────────────────────────────── */
  protected readonly regionOptions: readonly string[] = [...REGIONS];
  protected readonly selectedRegion = signal<SalesOrder['region'] | null>(null);
  protected readonly datePresets = [
    ogeDateRangePresets.today(),
    ogeDateRangePresets.last7Days(),
    ogeDateRangePresets.last30Days(),
    ogeDateRangePresets.thisMonth(),
    ogeDateRangePresets.thisYear(),
  ];
  protected readonly dateRange = signal<OgeCalendarRange>([this.daysBeforeToday(90), this.todayNoon()]);

  protected readonly currencyFormat: OgeValueFormat = { type: 'currency', currency: 'USD', maximumFractionDigits: 0 };
  protected readonly integerFormat: OgeValueFormat = { type: 'number', maximumFractionDigits: 0 };
  protected readonly shortDateFormat: OgeValueFormat = { type: 'date', dateStyle: 'short' };

  protected readonly teamAvatars: readonly OgeAvatarItem[] = [
    { name: TEAM[0], status: 'online' },
    { name: TEAM[1], status: 'online' },
    { name: TEAM[2], status: 'busy' },
    { name: TEAM[3], status: 'away' },
  ];

  protected readonly filteredOrders = computed<readonly SalesOrder[]>(() => {
    const region = this.selectedRegion();
    const [startDate, endDate] = this.dateRange();
    const startMs = startDate ? this.startOfDayMs(startDate) : null;
    const endMs = endDate ? this.endOfDayMs(endDate) : null;
    return this.allOrders.filter((order) => {
      if (region && order.region !== region) return false;
      const t = order.orderDate.getTime();
      if (startMs !== null && t < startMs) return false;
      if (endMs !== null && t > endMs) return false;
      return true;
    });
  });

  protected readonly customerSummaries = computed<readonly CustomerSummary[]>(() =>
    buildCustomerSummaries(this.filteredOrders()),
  );

  protected readonly filteredDeals = computed<readonly CrmDeal[]>(() => {
    const region = this.selectedRegion();
    return this.deals().filter((d) => !region || d.region === region);
  });

  protected readonly filteredLeads = computed<readonly CrmLead[]>(() => {
    const region = this.selectedRegion();
    return this.leads().filter((l) => !region || l.region === region);
  });

  protected readonly totalRevenue = computed(() => this.filteredOrders().reduce((sum, o) => sum + o.total, 0));
  protected readonly openPipelineAmount = computed(() =>
    this.deals().filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').reduce((s, d) => s + d.amount, 0),
  );
  protected readonly closedWonAmount = computed(() =>
    this.deals().filter((d) => d.stage === 'Closed Won').reduce((s, d) => s + d.amount, 0),
  );
  protected readonly openDealsCount = computed(
    () => this.deals().filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length,
  );
  protected readonly leadsPipelineValue = computed(() =>
    this.filteredLeads().reduce((s, l) => s + l.estimatedValue, 0),
  );

  /* ── new deal ─────────────────────────────────────────── */
  protected readonly newDealModalOpen = signal(false);
  protected readonly newDealDraft = signal<Record<string, unknown>>(this.emptyDeal());
  protected readonly newDealFormItems: readonly OgeFormItemData[] = [
    { field: 'title', label: 'Opportunity', editorType: 'textBox', colSpan: 2, isRequired: true },
    { field: 'company', label: 'Account', editorType: 'textBox', isRequired: true },
    { field: 'contact', label: 'Primary contact', editorType: 'textBox', isRequired: true },
    { field: 'region', label: 'Region', editorType: 'selectBox', editorOptions: { items: [...REGIONS] } },
    { field: 'stage', label: 'Stage', editorType: 'selectBox', editorOptions: { items: [...DEAL_STAGES] } },
    { field: 'owner', label: 'Account executive', editorType: 'selectBox', editorOptions: { items: [...TEAM] } },
    { field: 'amount', label: 'Contract value (USD)', editorType: 'numberBox', editorOptions: { min: 5000, max: 5_000_000, step: 5000 } },
  ];

  constructor() {
    effect(() => {
      const root = this.doc.documentElement;
      const isDark = this.darkMode();
      root.classList.toggle('oge-theme-dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    });

    // Load the sample process once the editor is in the view. The import
    // runs untracked: it reads and writes the editor's own signals, which
    // must not become dependencies of this effect.
    effect(() => {
      const editor = this.bpmnEditor();
      if (!editor || this.activeView() !== 'workflows') return;
      untracked(() => {
        void editor.importXml(SAMPLE_BPMN_XML).then(() => requestAnimationFrame(() => editor.zoomToFit()));
      });
    });
  }

  /* ── navigation ───────────────────────────────────────── */
  protected itemsByGroup(group: NavGroup): readonly NavItem[] {
    return this.navItems.filter((item) => item.group === group);
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected selectView(view: CrmViewKey): void {
    this.activeView.set(view);
  }

  /* ── projects ─────────────────────────────────────────── */
  protected taskCountFor(status: ProjectTaskStatus): number {
    return this.tasks().filter((t) => t.status === status).length;
  }

  protected statusLabel(status: ProjectTaskStatus): string {
    return PROJECT_COLUMNS.find((c) => c.key === status)?.title ?? status;
  }

  protected statusSeverity(status: ProjectTaskStatus): OgeChipSeverity {
    switch (status) {
      case 'done':
        return 'success';
      case 'review':
        return 'warning';
      case 'in-progress':
        return 'accent';
      default:
        return 'neutral';
    }
  }

  protected onBoardModeChange(event: OgeButtonGroupSelectionChangedEvent): void {
    const picked = event.selectedKeys[0];
    if (picked === 'board' || picked === 'list') this.boardMode.set(picked);
  }

  protected newTask(): void {
    const board = this.board();
    if (board) {
      board.openNewCard('todo', PROJECT_NAMES[0]);
    } else {
      this.boardMode.set('board');
      this.toast.info('Switched to the board — use “New task” again to add one.');
    }
  }

  protected onTaskMoved(event: OgeKanbanCardMovedEvent<ProjectTask>): void {
    this.tasks.update((list) => list.map((t) => (t.id === event.card.id ? event.card : t)));
    this.toast.info(`“${event.card.title}” moved to ${this.statusLabel(event.card.status)}.`);
  }

  protected onTaskAdded(event: OgeKanbanCardAddedEvent<ProjectTask>): void {
    const card = event.card;
    const created: ProjectTask = {
      ...card,
      id: card.id ?? Date.now(),
      status: (event.column as ProjectTaskStatus) ?? 'todo',
      project: event.swimlane ?? card.project ?? PROJECT_NAMES[0],
      summary: card.summary ?? '',
      assignee: card.assignee ?? TEAM[0],
      priority: card.priority ?? 'medium',
      dueDate: card.dueDate instanceof Date ? card.dueDate : new Date(Date.now() + 7 * 86_400_000),
      estimateHours: card.estimateHours ?? 4,
      tags: card.tags ?? [],
      checklist: card.checklist ?? [],
    };
    this.tasks.update((list) => [...list, created]);
  }

  protected onTaskUpdated(event: OgeKanbanCardUpdatedEvent<ProjectTask>): void {
    this.tasks.update((list) => list.map((t) => (t.id === event.oldData.id ? { ...t, ...event.newData } : t)));
  }

  protected onTaskDeleted(event: OgeKanbanCardDeletedEvent<ProjectTask>): void {
    this.tasks.update((list) => list.filter((t) => t.id !== event.card.id));
  }

  /* ── page tools ───────────────────────────────────────── */
  protected onPivotLayoutChange(event: OgeButtonGroupSelectionChangedEvent): void {
    const picked = event.selectedKeys[0];
    if (picked === 'compact' || picked === 'outline' || picked === 'tabular') this.pivotRowLayout.set(picked);
  }

  protected onWorkbookPresetChange(event: OgeButtonGroupSelectionChangedEvent): void {
    const picked = event.selectedKeys[0];
    if (typeof picked === 'string') {
      this.uploadedSpreadsheets.set([]);
      this.selectedWorkbookUrl.set(picked);
    }
  }

  protected onGanttScaleChange(event: OgeButtonGroupSelectionChangedEvent): void {
    const picked = event.selectedKeys[0];
    if (picked === 'days' || picked === 'weeks' || picked === 'months') this.ganttScale.set(picked);
  }

  protected exportBpmnXml(): void {
    const xml = this.bpmnEditor()?.exportXml() ?? '';
    this.toast.success(`Exported BPMN 2.0 XML (${xml.length} bytes).`);
  }

  protected resetFilters(): void {
    this.selectedRegion.set(null);
    this.dateRange.set([this.daysBeforeToday(90), this.todayNoon()]);
  }

  protected openNewDealModal(): void {
    this.newDealDraft.set(this.emptyDeal());
    this.newDealModalOpen.set(true);
  }

  protected saveNewDeal(): void {
    if (this.dealForm()?.validate() === false) return;
    const raw = this.newDealDraft() as unknown as NewDealDraft;
    const title = (raw.title || '').trim();
    const company = (raw.company || '').trim();
    if (!title || !company) return;

    const created: CrmDeal = {
      id: Date.now(),
      dealCode: `DL-${this.deals().length + 401}`,
      title,
      company,
      contact: (raw.contact || 'Executive sponsor').trim(),
      owner: raw.owner || TEAM[0],
      region: raw.region || 'EMEA',
      stage: raw.stage || 'Discovery',
      probability: raw.stage === 'Closed Won' ? 100 : 50,
      amount: Number(raw.amount) || 95_000,
      priority: 'high',
      tags: [raw.region || 'EMEA', 'Enterprise'],
      closeDate: new Date(2026, 10, 30),
    };
    this.deals.update((list) => [created, ...list]);
    this.newDealModalOpen.set(false);
    this.toast.success(`Added “${created.title}” (${created.dealCode}).`);
  }

  protected exportOrders(): void {
    const grid = this.ordersGrid();
    if (!grid) {
      this.ledgerTabIndex.set(0);
      this.toast.info('Open the Orders tab, then export again.');
      return;
    }
    void exportGridToExcel(grid, { filename: 'astra-crm-orders.xlsx', sheetName: 'Orders' });
    this.toast.success(`Exporting ${this.filteredOrders().length.toLocaleString('en-US')} orders to Excel.`);
  }

  /* ── formatting ───────────────────────────────────────── */
  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  protected statusChipSeverity(status: SalesOrder['status']): OgeChipSeverity {
    switch (status) {
      case 'Fulfilled':
        return 'success';
      case 'Invoiced':
        return 'accent';
      case 'Processing':
        return 'warning';
      case 'Refunded':
        return 'danger';
    }
  }

  protected dealStageSeverity(stage: DealStage): OgeChipSeverity {
    switch (stage) {
      case 'Closed Won':
        return 'success';
      case 'Negotiation':
        return 'accent';
      case 'Proposal':
        return 'neutral';
      case 'Discovery':
        return 'warning';
      case 'Closed Lost':
        return 'danger';
    }
  }

  private emptyDeal(): Record<string, unknown> {
    return { title: '', company: '', contact: '', owner: TEAM[0], region: 'EMEA', stage: 'Discovery', amount: 95_000 };
  }

  private todayNoon(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  }

  private daysBeforeToday(days: number): Date {
    return new Date(this.todayNoon().getTime() - days * 86_400_000);
  }

  private startOfDayMs(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
  }

  private endOfDayMs(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
  }
}

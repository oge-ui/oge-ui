import { useEffect, useMemo, useRef, useState } from 'react';
import {
  OgeAccordion,
  OgeAppBar,
  OgeAvatar,
  OgeAvatarGroup,
  OgeBreadcrumb,
  OgeButton,
  OgeButtonGroup,
  OgeCard,
  OgeChat,
  OgeChip,
  OgeDrawer,
  OgeFileUploader,
  OgeForm,
  OgeGrid,
  OgeGridAssistant,
  OgeModal,
  OgeProgressBar,
  OgeSelectBox,
  OgeSmartPaste,
  OgeStepper,
  OgeSwitch,
  useOgeModals,
  useOgeToasts,
  type OgeAccordionItemDefinition,
  type OgeAvatarItem,
  type OgeBreadcrumbItemData,
  type OgeButtonGroupItem,
  type OgeChatMessage,
  type OgeFormHandle,
  type OgeFormItemDefinition,
  type OgeGridColumnProps,
  type OgeGridHandle,
  type OgeSmartPasteHandle,
  type OgeStepDefinition,
} from '@oge-ui/react';
import {
  OgeChart,
  OgeCircularGauge,
  OgeFunnelChart,
  OgePieChart,
  OgeSparkline,
  type OgeChartSeriesInput,
} from '@oge-ui/react-charts';
import { OgeKanban, type OgeKanbanColumn, type OgeKanbanHandle } from '@oge-ui/react-kanban';
import {
  OgePivotGrid,
  type OgePivotCalculatedField,
  type OgePivotFieldDef,
  type OgePivotGridHandle,
  type OgePivotRowHeaderLayout,
} from '@oge-ui/react-pivot';
import { OgeSpreadsheet } from '@oge-ui/react-spreadsheet';
import { OgeScheduler, type OgeSchedulerView } from '@oge-ui/react-scheduler';
import { OgeGantt } from '@oge-ui/react-gantt';
import { OgeBpmnEditor, type OgeBpmnEditorHandle } from '@oge-ui/react-bpmn';
import {
  COHORT_METRICS,
  CUSTOMER_JOURNEY_FUNNEL,
  INITIAL_COPILOT_MESSAGES,
  INITIAL_CUSTOMERS,
  INITIAL_QBR_APPOINTMENTS,
  MRR_SPARKLINE,
  NRR_SPARKLINE,
  ONBOARDING_GANTT_DEPS,
  ONBOARDING_GANTT_RESOURCES,
  ONBOARDING_GANTT_TASKS,
  PIVOT_CUSTOMER_ROWS,
  PROJECT_COLUMNS,
  PROJECT_NAMES,
  PROJECT_TASKS,
  QBR_RESOURCES,
  REGION_OPTIONS,
  RENEWAL_BPMN_XML,
  SMART_PASTE_SAMPLE,
  STATUS_OPTIONS,
  TIER_OPTIONS,
  TIER_SHARE_DATA,
  createPulseAiTransport,
  type CustomerPivotRow,
  type CustomerRecord,
  type CustomerStatus,
  type CustomerTier,
  type ProjectTask,
  type ProjectTaskStatus,
} from './data';

/* 24×24 stroke icons (path data only) */
const ICONS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  sun: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  accounts: 'M3 5h18v14H3V5zm0 5h18M9 10v9',
  projects: 'M4 5h4v14H4V5zm6 0h4v10h-4V5zm6 0h4v12h-4V5z',
  charts: 'M4 19h16M6 15l4-5 4 3 4-7',
  pivot: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 3h7v4h-7v-4z',
  workbook: 'M4 4h16v16H4V4zm0 5h16M10 9v11',
  calendar: 'M4 5h16v15H4V5zm0 5h16M8 3v4M16 3v4',
  gantt: 'M3 6h10v3H3V6zm4 5h11v3H7v-3zm3 5h11v3H10v-3z',
  bpmn: 'M5 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0zm8 0h6m-3-3l3 3-3 3',
  copilot: 'M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6L12 2z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v5m0-8.5v.5',
} as const;

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

type PulseView =
  | 'accounts'
  | 'projects'
  | 'charts'
  | 'pivot'
  | 'workbook'
  | 'calendar'
  | 'gantt'
  | 'bpmn'
  | 'copilot';

type NavGroup = 'Workspace' | 'Analytics' | 'Planning' | 'Automation';

interface NavItem {
  id: PulseView;
  group: NavGroup;
  label: string;
  description: string;
  packageName: string;
  icon: string;
}

const NAV_GROUPS: readonly NavGroup[] = ['Workspace', 'Analytics', 'Planning', 'Automation'];

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'accounts', group: 'Workspace', label: 'Accounts', packageName: '@oge-ui/react-grid', icon: ICONS.accounts,
    description: 'Every customer account with inline editing, health and renewal data.' },
  { id: 'projects', group: 'Workspace', label: 'Projects', packageName: '@oge-ui/react-kanban', icon: ICONS.projects,
    description: 'Implementation work across customer projects, from backlog to done.' },
  { id: 'charts', group: 'Analytics', label: 'Revenue', packageName: '@oge-ui/react-charts', icon: ICONS.charts,
    description: 'Recurring revenue, expansion and retention over the last ten months.' },
  { id: 'pivot', group: 'Analytics', label: 'Retention cube', packageName: '@oge-ui/react-pivot', icon: ICONS.pivot,
    description: 'Slice ARR and seats by region, country, tier and fiscal year.' },
  { id: 'workbook', group: 'Analytics', label: 'Workbook', packageName: '@oge-ui/react-spreadsheet', icon: ICONS.workbook,
    description: 'Billing models opened straight from Excel, formulas included.' },
  { id: 'calendar', group: 'Planning', label: 'Calendar', packageName: '@oge-ui/react-scheduler', icon: ICONS.calendar,
    description: 'Business reviews and renewal calls, grouped by customer success manager.' },
  { id: 'gantt', group: 'Planning', label: 'Onboarding plan', packageName: '@oge-ui/react-gantt', icon: ICONS.gantt,
    description: 'Tenant onboarding and migration plan with dependencies and workload.' },
  { id: 'bpmn', group: 'Automation', label: 'Renewal workflow', packageName: '@oge-ui/react-bpmn', icon: ICONS.bpmn,
    description: 'The 90-day health and renewal process as executable BPMN.' },
  { id: 'copilot', group: 'Automation', label: 'Copilot', packageName: '@oge-ui/react-ai', icon: ICONS.copilot,
    description: 'Ask questions, paste anything into a form and shape grids in plain language.' },
];

interface NewCustomerDraft {
  name: string;
  company: string;
  email: string;
  region: string;
  tier: CustomerTier;
  status: CustomerStatus;
  mrr: number;
  seats: number;
}

const EMPTY_DRAFT: NewCustomerDraft = {
  name: '',
  company: '',
  email: '',
  region: 'North America',
  tier: 'Growth',
  status: 'Active',
  mrr: 4200,
  seats: 45,
};

const TEAM = ['Elena Rostova', 'Defne Arslan', 'Kenji Watanabe', 'Clara Vance'] as const;

const CSM_AVATARS: readonly OgeAvatarItem[] = [
  { name: TEAM[0], status: 'online' },
  { name: TEAM[1], status: 'online' },
  { name: TEAM[2], status: 'busy' },
  { name: TEAM[3], status: 'away' },
];

const BOARD_COLUMNS: readonly OgeKanbanColumn[] = PROJECT_COLUMNS;

const CHART_SERIES: readonly OgeChartSeriesInput[] = [
  { type: 'splineArea', argumentField: 'month', valueField: 'arr', name: 'Portfolio ARR' },
  { type: 'bar', argumentField: 'month', valueField: 'expansionArr', name: 'Expansion ARR' },
  { type: 'spline', argumentField: 'month', valueField: 'churnArr', name: 'Contraction', dashStyle: 'dash' },
];

const PIVOT_FIELDS: readonly OgePivotFieldDef<CustomerPivotRow>[] = [
  { dataField: 'region', caption: 'Region', area: 'row' },
  { dataField: 'country', caption: 'Country', area: 'row' },
  { dataField: 'tier', caption: 'Tier', area: 'column' },
  {
    dataField: 'date',
    caption: 'Fiscal year',
    area: 'column',
    groupInterval: 'year',
    headerFormat: { type: 'number', pattern: "'FY'0" },
  },
  {
    dataField: 'arr', id: 'arr', caption: 'ARR', area: 'data', summaryType: 'sum',
    format: { type: 'currency', currency: 'USD', maximumFractionDigits: 0 },
  },
  {
    dataField: 'expansion', id: 'expansion', caption: 'Expansion', area: 'data', summaryType: 'sum',
    format: { type: 'currency', currency: 'USD', maximumFractionDigits: 0 },
  },
  { dataField: 'seats', id: 'seats', caption: 'Seats', area: 'data', summaryType: 'sum' },
];

const PIVOT_CALC_FIELDS: readonly OgePivotCalculatedField[] = [
  {
    name: 'arpuSeat',
    caption: 'ARR / seat',
    expression: (v) => (v['seats'] ? (v['arr'] ?? 0) / v['seats'] : null),
    format: (val) => `$${Math.round(Number(val)).toLocaleString('en-US')}`,
  },
  {
    name: 'arrShare',
    caption: '% of ARR',
    expression: (v) => v['arr'] ?? null,
    displayMode: 'percentOfGrandTotal',
  },
];

const WORKBOOK_PRESETS: readonly OgeButtonGroupItem[] = [
  { value: '/demo/spreadsheet/tables.xlsx', text: 'Tables' },
  { value: '/demo/spreadsheet/formulas.xlsx', text: 'Formulas' },
  { value: '/demo/spreadsheet/sparklines.xlsx', text: 'Sparklines' },
  { value: '/demo/spreadsheet/structure.xlsx', text: 'Multi-sheet' },
];

const PIVOT_LAYOUT_ITEMS: readonly OgeButtonGroupItem[] = [
  { value: 'compact', text: 'Compact' },
  { value: 'outline', text: 'Outline' },
  { value: 'tabular', text: 'Tabular' },
];

const GANTT_SCALE_ITEMS: readonly OgeButtonGroupItem[] = [
  { value: 'days', text: 'Days' },
  { value: 'weeks', text: 'Weeks' },
  { value: 'months', text: 'Months' },
];

const BOARD_MODE_ITEMS: readonly OgeButtonGroupItem[] = [
  { value: 'board', text: 'Board' },
  { value: 'list', text: 'List' },
];

const PLAYBOOK_ACCORDION_ITEMS: readonly OgeAccordionItemDefinition[] = [
  {
    key: 'sla',
    title: '99.99% uptime with multi-region failover',
    description: 'Active-active EU / US / APAC routing',
    text: 'Enterprise and Scale tiers include automated multi-region failover, zero-downtime schema migrations and a dedicated support channel.',
    expanded: true,
  },
  {
    key: 'security',
    title: 'SOC 2 Type II, ISO 27001 and customer-managed keys',
    description: 'Zero-trust tenant isolation and audit trail',
    text: 'Every workspace supports SAML 2.0 single sign-on, SCIM directory sync and customer-managed KMS keys with immutable audit exports.',
  },
  {
    key: 'nrr',
    title: 'Automated health scoring',
    description: 'Real-time product usage signals',
    text: 'Health scores combine weekly active seats, API throughput and support ticket velocity to start renewal playbooks 90 days before contract end.',
  },
];

function statusChipSeverity(status: CustomerStatus) {
  switch (status) {
    case 'Active':
      return 'success' as const;
    case 'Trial':
      return 'accent' as const;
    case 'Onboarding':
      return 'warning' as const;
    case 'At Risk':
      return 'danger' as const;
  }
}

function stageLabel(status: ProjectTaskStatus): string {
  return PROJECT_COLUMNS.find((c) => c.key === status)?.title ?? status;
}

function stageSeverity(status: ProjectTaskStatus) {
  switch (status) {
    case 'done':
      return 'success' as const;
    case 'review':
      return 'warning' as const;
    case 'in-progress':
      return 'accent' as const;
    default:
      return 'neutral' as const;
  }
}

function Icon({ d, size = 18, className }: { d: string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function ReactMark({ size = 14, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  );
}

export function App() {
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);
  const [activeView, setActiveView] = useState<PulseView>('accounts');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 960);
  const [darkMode, setDarkMode] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(() => firstVisit('pulse-crm-intro-seen'));
  const [regionFilter, setRegionFilter] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [draft, setDraft] = useState<NewCustomerDraft>(EMPTY_DRAFT);
  const [avatarFiles, setAvatarFiles] = useState<readonly File[]>([]);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>(undefined);
  const [playbookStep, setPlaybookStep] = useState(1);

  const [tasks, setTasks] = useState<ProjectTask[]>(PROJECT_TASKS);
  const [boardMode, setBoardMode] = useState<'board' | 'list'>('board');
  const [collapsedLanes, setCollapsedLanes] = useState<readonly string[]>([]);

  const [pivotLayout, setPivotLayout] = useState<OgePivotRowHeaderLayout>('outline');
  const [workbookUrl, setWorkbookUrl] = useState<string>('/demo/spreadsheet/tables.xlsx');
  const [uploadedSheets, setUploadedSheets] = useState<readonly File[]>([]);
  const [schedulerDate, setSchedulerDate] = useState<Date>(new Date(2026, 9, 21));
  const [schedulerView, setSchedulerView] = useState<OgeSchedulerView>('week');
  const [ganttScale, setGanttScale] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [chatHistory, setChatHistory] = useState<readonly OgeChatMessage[]>(INITIAL_COPILOT_MESSAGES);

  const gridRef = useRef<OgeGridHandle<CustomerRecord>>(null);
  const aiGridRef = useRef<OgeGridHandle<CustomerRecord>>(null);
  const formRef = useRef<OgeFormHandle<NewCustomerDraft>>(null);
  const smartPasteFormRef = useRef<OgeFormHandle<NewCustomerDraft>>(null);
  const smartPasteRef = useRef<OgeSmartPasteHandle>(null);
  const pivotRef = useRef<OgePivotGridHandle<CustomerPivotRow>>(null);
  const bpmnRef = useRef<OgeBpmnEditorHandle>(null);
  const boardRef = useRef<OgeKanbanHandle<ProjectTask>>(null);

  const modals = useOgeModals();
  const toasts = useOgeToasts();
  const aiTransport = useMemo(() => createPulseAiTransport(), []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('oge-theme-dark', darkMode);
    root.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  useEffect(() => {
    if (activeView === 'bpmn') {
      const timer = setTimeout(() => {
        void bpmnRef.current?.importXml(RENEWAL_BPMN_XML).then(() => requestAnimationFrame(() => bpmnRef.current?.zoomToFit()));
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeView]);

  useEffect(() => {
    const file = avatarFiles[0];
    if (!file) {
      setAvatarPreviewUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(objectUrl);
    return () => {
      if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFiles]);

  const currentNavItem = useMemo(
    () => NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0],
    [activeView],
  );

  const filteredCustomers = useMemo(
    () => (regionFilter ? customers.filter((c) => c.region === regionFilter) : customers),
    [customers, regionFilter],
  );

  const metrics = useMemo(() => {
    const totalMrr = filteredCustomers.reduce((sum, c) => sum + c.mrr, 0);
    const totalSeats = filteredCustomers.reduce((sum, c) => sum + c.seats, 0);
    const activeCount = filteredCustomers.filter((c) => c.status === 'Active').length;
    const atRiskCount = filteredCustomers.filter((c) => c.status === 'At Risk').length;
    const avgHealth = filteredCustomers.length
      ? Math.round(filteredCustomers.reduce((sum, c) => sum + c.healthScore, 0) / filteredCustomers.length)
      : 0;
    return { totalMrr, totalSeats, activeCount, atRiskCount, avgHealth };
  }, [filteredCustomers]);

  const openTaskCount = useMemo(() => tasks.filter((t) => t.status !== 'done').length, [tasks]);
  const overdueTaskCount = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => t.status !== 'done' && t.dueDate.getTime() < now).length;
  }, [tasks]);
  const taskCountFor = (status: ProjectTaskStatus) => tasks.filter((t) => t.status === status).length;
  const projectProgress = useMemo(
    () =>
      PROJECT_NAMES.map((name) => {
        const mine = tasks.filter((t) => t.project === name);
        return { name, total: mine.length, done: mine.filter((t) => t.status === 'done').length };
      }),
    [tasks],
  );

  const breadcrumbItems = useMemo<readonly OgeBreadcrumbItemData[]>(
    () => [
      { key: 'root', text: 'PulseCRM' },
      { key: currentNavItem.id, text: currentNavItem.label, current: true },
    ],
    [currentNavItem],
  );

  const onboardingSteps = useMemo<readonly OgeStepDefinition[]>(
    () => [
      {
        key: 'provision',
        label: 'Tenant & SSO',
        description: 'Multi-region cluster and SCIM',
        completed: true,
        content: <p className="step-desc">Dedicated EU/US cluster provisioned with SAML 2.0 and automated role mapping.</p>,
      },
      {
        key: 'telemetry',
        label: 'Billing & webhooks',
        description: 'Stripe and ERP event ingestion',
        completed: playbookStep > 1,
        content: <p className="step-desc">Real-time MRR, seat utilisation and expansion events streaming into the workspace.</p>,
      },
      {
        key: 'qbr',
        label: 'QBR & copilot',
        description: '90-day renewal automation',
        completed: playbookStep > 2,
        content: <p className="step-desc">Copilot and the renewal workflow activated for every enterprise account.</p>,
      },
    ],
    [playbookStep],
  );

  const confirmAndDelete = async (customer: CustomerRecord) => {
    const confirmed = await modals.confirm({
      title: 'Delete customer account?',
      message: `Remove ${customer.name} (${customer.company}) with $${customer.mrr.toLocaleString('en-US')}/mo MRR? This cannot be undone.`,
      severity: 'danger',
      danger: true,
      okText: 'Delete',
      cancelText: 'Keep',
    });
    if (!confirmed) return;
    setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
    toasts.info(`${customer.name} (${customer.company}) was removed.`, { title: 'Customer deleted' });
  };

  const columns = useMemo<OgeGridColumnProps<CustomerRecord>[]>(
    () => [
      {
        field: 'name',
        caption: 'Contact',
        minWidth: 185,
        required: true,
        renderCell: ({ row }) => (
          <div className="person-cell">
            <OgeAvatar
              name={row.name}
              src={row.avatarUrl}
              size="sm"
              decorative
              status={
                row.status === 'Active' ? 'online' : row.status === 'At Risk' ? 'busy' : row.status === 'Onboarding' ? 'away' : 'offline'
              }
            />
            <div className="person-cell-meta">
              <span className="person-cell-name">{row.name}</span>
              <span className="person-cell-sub">{row.csmOwner}</span>
            </div>
          </div>
        ),
      },
      { field: 'company', caption: 'Company', minWidth: 170, required: true },
      {
        field: 'tier',
        caption: 'Tier',
        width: 120,
        lookup: { dataSource: TIER_OPTIONS, valueExpr: 'value', displayExpr: 'label' },
        renderCell: ({ value }) => (
          <OgeChip
            label={String(value ?? 'Growth')}
            size="sm"
            severity={value === 'Enterprise' ? 'accent' : value === 'Scale' ? 'success' : 'neutral'}
          />
        ),
      },
      {
        field: 'mrr',
        caption: 'MRR',
        dataType: 'number',
        width: 130,
        required: true,
        format: { type: 'currency', currency: 'USD', maximumFractionDigits: 0 },
        totalSummary: 'sum',
      },
      { field: 'seats', caption: 'Seats', dataType: 'number', width: 95, required: true, totalSummary: 'sum' },
      {
        field: 'healthScore',
        caption: 'Health',
        dataType: 'number',
        width: 145,
        renderCell: ({ row }) => (
          <div className="health-cell">
            <OgeProgressBar
              value={row.healthScore}
              max={100}
              severity={row.healthScore >= 85 ? 'success' : row.healthScore >= 70 ? 'accent' : 'danger'}
              showLabel={false}
              ariaLabel={`${row.company} health score ${row.healthScore}%`}
            />
            <span className="health-num">{row.healthScore}%</span>
          </div>
        ),
      },
      {
        field: 'status',
        caption: 'Status',
        width: 125,
        lookup: { dataSource: STATUS_OPTIONS, valueExpr: 'value', displayExpr: 'label' },
        renderCell: ({ value }) => {
          const status = (value as CustomerStatus) || 'Active';
          return <OgeChip label={status} size="sm" severity={statusChipSeverity(status)} />;
        },
      },
      {
        field: 'region',
        caption: 'Region',
        width: 135,
        lookup: { dataSource: REGION_OPTIONS, valueExpr: 'value', displayExpr: 'label' },
      },
      {
        caption: '',
        width: 90,
        alignment: 'center',
        sortable: false,
        filterable: false,
        editable: false,
        renderCell: ({ row }) => (
          <OgeButton
            text="Delete"
            size="sm"
            severity="danger"
            stylingMode="text"
            ariaLabel={`Delete ${row.name}`}
            onClick={(event) => {
              event.stopPropagation();
              void confirmAndDelete(row);
            }}
          />
        ),
      },
    ],
    [],
  );

  const formItems = useMemo<OgeFormItemDefinition[]>(
    () => [
      {
        field: 'name', label: 'Full name', placeholder: 'e.g. Elena Rostova', isRequired: true,
        validationRules: [
          { type: 'required', message: 'Full name is required.' },
          { type: 'stringLength', min: 2, max: 60, message: 'Full name must be between 2 and 60 characters.' },
        ],
      },
      {
        field: 'company', label: 'Company', placeholder: 'e.g. Borealis Cloud Corp', isRequired: true,
        validationRules: [{ type: 'required', message: 'Company name is required.' }],
      },
      {
        field: 'email', label: 'Work email', placeholder: 'elena@borealis-example.test', isRequired: true,
        validationRules: [
          { type: 'required', message: 'Work email is required.' },
          { type: 'email', message: 'Enter a valid email address.' },
        ],
      },
      {
        field: 'region', label: 'Region', editorType: 'selectBox', isRequired: true,
        editorOptions: { items: REGION_OPTIONS, displayExpr: 'label', valueExpr: 'value' },
      },
      {
        field: 'tier', label: 'Subscription tier', editorType: 'selectBox', isRequired: true,
        editorOptions: { items: TIER_OPTIONS, displayExpr: 'label', valueExpr: 'value' },
      },
      {
        field: 'status', label: 'Account status', editorType: 'selectBox', isRequired: true,
        editorOptions: { items: STATUS_OPTIONS, displayExpr: 'label', valueExpr: 'value' },
      },
      {
        field: 'mrr', label: 'Monthly recurring revenue (USD)', dataType: 'number', editorType: 'numberBox', isRequired: true,
        editorOptions: { min: 0, max: 250000, step: 100, showSpinButtons: true },
      },
      {
        field: 'seats', label: 'Licensed seats', dataType: 'number', editorType: 'numberBox', isRequired: true,
        editorOptions: { min: 1, max: 5000, step: 1, showSpinButtons: true },
      },
    ],
    [],
  );

  const openAddCustomerModal = () => {
    setDraft(EMPTY_DRAFT);
    setAvatarFiles([]);
    setAddModalOpen(true);
  };

  const handleFormSubmitted = async ({ data }: { data: NewCustomerDraft }) => {
    let persistentAvatarUrl: string | undefined;
    const uploadedFile = avatarFiles[0];
    if (uploadedFile) {
      persistentAvatarUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(uploadedFile);
      });
    }
    const nextId = customers.reduce((maxId, item) => Math.max(maxId, item.id), 100) + 1;
    const created: CustomerRecord = {
      id: nextId,
      name: data.name.trim(),
      company: data.company.trim(),
      email: (data.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}@example.test`).trim(),
      region: data.region,
      tier: data.tier,
      status: data.status,
      mrr: Number(data.mrr),
      seats: Number(data.seats),
      healthScore: 92,
      renewalQuarter: 'Q2 2027',
      csmOwner: TEAM[0],
      avatarUrl: persistentAvatarUrl,
    };
    setCustomers((prev) => [created, ...prev]);
    setAddModalOpen(false);
    toasts.success(`${created.name} (${created.company}) added.`, { title: 'Customer created' });
  };

  const exportCustomersExcel = async () => {
    if (!gridRef.current) return;
    const { exportGridToExcel } = await import('@oge-ui/react-grid/export-excel');
    await exportGridToExcel(gridRef.current, { filename: 'pulsecrm-customers.xlsx' });
    toasts.success('Exported customer accounts to pulsecrm-customers.xlsx', { title: 'Excel export' });
  };

  const exportPivotExcel = async () => {
    if (!pivotRef.current) return;
    const { exportPivotToExcel } = await import('@oge-ui/react-pivot/export-excel');
    await exportPivotToExcel(pivotRef.current, { filename: 'pulsecrm-arr-pivot.xlsx' });
    toasts.success('Exported the retention cube to pulsecrm-arr-pivot.xlsx', { title: 'Excel export' });
  };

  const validateBpmnWorkflow = () => {
    const issues = bpmnRef.current?.validate() ?? [];
    if (issues.length === 0) {
      toasts.success('The renewal workflow passed every structural check.', { title: 'No issues' });
    } else {
      toasts.warning(`${issues.length} issue(s) highlighted on the canvas.`, { title: 'Validation complete' });
    }
  };

  const newTask = () => {
    if (boardRef.current) {
      boardRef.current.openNewCard('todo', PROJECT_NAMES[0]);
    } else {
      setBoardMode('board');
      toasts.info('Switched to the board — use “New task” again to add one.');
    }
  };

  const pageActions = (() => {
    switch (activeView) {
      case 'accounts':
        return (
          <>
            <OgeSelectBox
              className="region-filter"
              label="Region"
              labelMode="hidden"
              size="sm"
              width={170}
              placeholder="All regions"
              showClearButton
              items={REGION_OPTIONS.map((r) => r.value)}
              value={regionFilter}
              onValueChange={(v) => setRegionFilter((v as string | null) ?? null)}
            />
            <OgeButton
              text="Export .xlsx"
              stylingMode="outlined"
              size="sm"
              icon={<Icon d={ICONS.download} size={15} />}
              onClick={() => void exportCustomersExcel()}
            />
            <OgeButton
              text="New customer"
              severity="accent"
              size="sm"
              icon={<Icon d={ICONS.plus} size={15} />}
              onClick={openAddCustomerModal}
            />
          </>
        );
      case 'projects':
        return (
          <OgeButton text="New task" severity="accent" size="sm" icon={<Icon d={ICONS.plus} size={15} />} onClick={newTask} />
        );
      case 'pivot':
        return (
          <OgeButton
            text="Export .xlsx"
            stylingMode="outlined"
            size="sm"
            icon={<Icon d={ICONS.download} size={15} />}
            onClick={() => void exportPivotExcel()}
          />
        );
      case 'bpmn':
        return <OgeButton text="Validate" stylingMode="outlined" size="sm" onClick={validateBpmnWorkflow} />;
      default:
        return null;
    }
  })();

  return (
    <div className="app-shell">
      <OgeAppBar
        landmark="banner"
        positionMode="sticky"
        start={
          <div className="app-brand-row">
            <button
              type="button"
              className="app-icon-btn"
              aria-label="Toggle navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <Icon d={ICONS.menu} size={20} />
            </button>
            <span className="app-brand">
              <img src="/brand.svg" alt="" width={28} height={28} className="app-brand-mark" />
              <span className="app-brand-name">PulseCRM</span>
            </span>
          </div>
        }
        end={
          <div className="app-actions">
            <OgeAvatarGroup className="app-team" items={CSM_AVATARS} max={4} size="xs" ariaLabel="Customer success managers online" />
            <button type="button" className="app-icon-btn" title="About this demo" aria-label="About this demo" onClick={() => setAboutOpen(true)}>
              <Icon d={ICONS.info} />
            </button>
            <button
              type="button"
              className="app-icon-btn"
              title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-pressed={darkMode}
              onClick={() => setDarkMode((v) => !v)}
            >
              <Icon d={darkMode ? ICONS.sun : ICONS.moon} />
            </button>
          </div>
        }
      />

      <OgeDrawer
        className="app-drawer"
        opened={sidebarOpen}
        onOpenedChange={setSidebarOpen}
        mode="side"
        size={250}
        minSize={64}
        compactBelow={960}
        ariaLabel="Workspace navigation"
        panel={
          <aside className={sidebarOpen ? 'app-sidebar' : 'app-sidebar is-rail'}>
            <nav className="app-nav" aria-label="Workspace">
              {NAV_GROUPS.map((group) => (
                <div key={group} className="app-nav-group">
                  {sidebarOpen && <span className="app-nav-group-label">{group}</span>}
                  {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                    const active = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={active ? 'app-nav-item is-active' : 'app-nav-item'}
                        aria-current={active ? 'page' : undefined}
                        title={sidebarOpen ? undefined : item.label}
                        aria-label={sidebarOpen ? undefined : item.label}
                        onClick={() => setActiveView(item.id)}
                      >
                        <Icon d={item.icon} className="app-nav-icon" />
                        {sidebarOpen && <span className="app-nav-label">{item.label}</span>}
                        {sidebarOpen && item.id === 'projects' && <span className="app-nav-count">{openTaskCount}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="app-nav-foot">
              {sidebarOpen ? (
                <>
                  <a className="app-credit" href="https://ogeui.com" target="_blank" rel="noopener">
                    <img src="/oge-mark.png" alt="" width={16} height={16} />
                    <span>
                      Built with <strong>OGE UI 1.1.6</strong>
                    </span>
                  </a>
                  <span className="app-nav-foot-fw">
                    <ReactMark />
                    React 19
                  </span>
                </>
              ) : (
                <a className="app-credit" href="https://ogeui.com" target="_blank" rel="noopener" aria-label="Built with OGE UI 1.1.6">
                  <img src="/oge-mark.png" alt="" width={18} height={18} />
                </a>
              )}
            </div>
          </aside>
        }
      >
        <main className="app-main">
          <header className="page-head">
            <div className="page-head-copy">
              <OgeBreadcrumb
                className="page-crumbs"
                items={breadcrumbItems}
                onItemClick={(ev) => {
                  if (ev.item.key === 'root') setActiveView('accounts');
                }}
              />
              <h1 className="page-title">{currentNavItem.label}</h1>
              <p className="page-desc">{currentNavItem.description}</p>
            </div>
            <div className="page-head-end">
              <code className="page-pkg" title="OGE UI package behind this page">
                {currentNavItem.packageName}
              </code>
              {pageActions}
            </div>
          </header>

          {/* ═══════════ Accounts ═══════════ */}
          {activeView === 'accounts' && (
            <>
              <section className="kpi-grid" aria-label="Portfolio summary">
                <OgeCard size="sm">
                  <div className="kpi">
                    <span className="kpi-label">Portfolio MRR</span>
                    <strong className="kpi-value">${metrics.totalMrr.toLocaleString('en-US')}</strong>
                    <OgeSparkline dataSource={MRR_SPARKLINE} type="area" className="kpi-spark" />
                  </div>
                </OgeCard>
                <OgeCard size="sm">
                  <div className="kpi">
                    <span className="kpi-label">Accounts</span>
                    <strong className="kpi-value">{filteredCustomers.length}</strong>
                    <span className="kpi-foot">
                      {metrics.activeCount} active · {metrics.totalSeats.toLocaleString('en-US')} seats
                    </span>
                  </div>
                </OgeCard>
                <OgeCard size="sm">
                  <div className="kpi">
                    <span className="kpi-label">Average health</span>
                    <strong className="kpi-value">{metrics.avgHealth}%</strong>
                    <OgeProgressBar
                      value={metrics.avgHealth}
                      max={100}
                      severity="success"
                      showLabel={false}
                      ariaLabel={`Average health ${metrics.avgHealth}%`}
                    />
                  </div>
                </OgeCard>
                <OgeCard size="sm" severity={metrics.atRiskCount > 0 ? 'warning' : undefined}>
                  <div className="kpi">
                    <span className="kpi-label">Renewal watchlist</span>
                    <strong className="kpi-value">{metrics.atRiskCount}</strong>
                    <span className="kpi-foot">{metrics.atRiskCount > 0 ? 'accounts below 70% health' : 'every account is healthy'}</span>
                  </div>
                </OgeCard>
              </section>

              <OgeCard header="Customer directory" subheader="Double-click a cell or press F2 to edit in place. Changes are validated before they save.">
                <OgeGrid
                  ref={gridRef}
                  ariaLabel="Customer accounts"
                  data={filteredCustomers}
                  keyField="id"
                  columns={columns}
                  searchPanel
                  filterRow
                  rowAlternation
                  focusedRowEnabled
                  columnChooser
                  paging={{ pageSize: 10, pageSizes: [5, 10, 20], showInfo: true }}
                  editing={{ mode: 'cell', allowUpdating: true }}
                  onRowUpdated={({ key, values }) => {
                    setCustomers((prev) =>
                      prev.map((customer) => (customer.id === key ? ({ ...customer, ...values } as CustomerRecord) : customer)),
                    );
                    toasts.success('Customer record updated.', { title: 'Saved' });
                  }}
                />
              </OgeCard>

              <section className="grid-2">
                <OgeCard header="Onboarding playbook" subheader="Where new enterprise accounts are in the rollout">
                  <OgeStepper steps={onboardingSteps} activeIndex={playbookStep} onActiveIndexChange={setPlaybookStep} showNavigation />
                </OgeCard>
                <OgeCard header="Commercial terms" subheader="What every enterprise agreement includes">
                  <OgeAccordion items={PLAYBOOK_ACCORDION_ITEMS} multiple collapsible ariaLabel="Commercial terms" />
                </OgeCard>
              </section>
            </>
          )}

          {/* ═══════════ Projects ═══════════ */}
          {activeView === 'projects' && (
            <>
              <section className="board-summary">
                <OgeCard size="sm">
                  <dl className="stat-list">
                    <div className="stat">
                      <dt>Open tasks</dt>
                      <dd>{openTaskCount}</dd>
                    </div>
                    <div className="stat">
                      <dt>In progress</dt>
                      <dd>{taskCountFor('in-progress')}</dd>
                    </div>
                    <div className="stat">
                      <dt>In review</dt>
                      <dd>{taskCountFor('review')}</dd>
                    </div>
                    <div className={overdueTaskCount > 0 ? 'stat is-danger' : 'stat'}>
                      <dt>Overdue</dt>
                      <dd>{overdueTaskCount}</dd>
                    </div>
                  </dl>
                </OgeCard>
                <OgeCard size="sm" header="Projects">
                  <ul className="project-list">
                    {projectProgress.map((p) => (
                      <li key={p.name} className="project-row">
                        <span className="project-name">{p.name}</span>
                        <span className="project-count">
                          {p.done}/{p.total}
                        </span>
                        <OgeProgressBar
                          value={p.done}
                          max={p.total}
                          severity={p.done === p.total ? 'success' : 'accent'}
                          showLabel={false}
                          ariaLabel={`${p.name} progress`}
                        />
                      </li>
                    ))}
                  </ul>
                </OgeCard>
              </section>

              <OgeCard
                header="Delivery board"
                subheader="Drag tasks between stages. Columns carry work-in-progress limits; lanes are projects."
                headerActions={
                  <OgeButtonGroup
                    items={BOARD_MODE_ITEMS}
                    selectionMode="single"
                    selectedKeys={[boardMode]}
                    size="sm"
                    stylingMode="outlined"
                    ariaLabel="Board layout"
                    onSelectionChange={(e) => {
                      const next = e.selectedKeys[0];
                      if (next === 'board' || next === 'list') setBoardMode(next);
                    }}
                  />
                }
              >
                {boardMode === 'board' ? (
                  <OgeKanban
                    ref={boardRef}
                    dataSource={tasks}
                    columns={BOARD_COLUMNS}
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
                    showToolbar
                    showFilterBar
                    quickAdd
                    inlineTitleEditing
                    virtualScrolling={false}
                    columnWidth={272}
                    collapsedSwimlanes={collapsedLanes}
                    onCollapsedSwimlanesChange={setCollapsedLanes}
                    onCardMoved={(e) => {
                      setTasks((prev) => prev.map((t) => (t.id === e.card.id ? e.card : t)));
                      toasts.info(`“${e.card.title}” moved to ${stageLabel(e.card.status)}.`);
                    }}
                    onCardAdded={(e) => {
                      const card = e.card;
                      const created: ProjectTask = {
                        ...card,
                        id: card.id ?? Date.now(),
                        status: (e.column as ProjectTaskStatus) ?? 'todo',
                        project: e.swimlane ?? card.project ?? PROJECT_NAMES[0],
                        summary: card.summary ?? '',
                        assignee: card.assignee ?? TEAM[0],
                        priority: card.priority ?? 'medium',
                        dueDate: card.dueDate instanceof Date ? card.dueDate : new Date(Date.now() + 7 * 86_400_000),
                        estimateHours: card.estimateHours ?? 4,
                        tags: card.tags ?? [],
                        checklist: card.checklist ?? [],
                      };
                      setTasks((prev) => [...prev, created]);
                    }}
                    onCardUpdated={(e) => {
                      setTasks((prev) => prev.map((t) => (t.id === e.oldData.id ? { ...t, ...e.newData } : t)));
                    }}
                    onCardDeleted={(e) => setTasks((prev) => prev.filter((t) => t.id !== e.card.id))}
                    style={{ height: 680 }}
                  />
                ) : (
                  <OgeGrid
                    ariaLabel="Project tasks"
                    data={tasks}
                    keyField="id"
                    groupPanel
                    searchPanel
                    paging={{ pageSize: 12 }}
                    columns={[
                      { field: 'title', caption: 'Task', minWidth: 240 },
                      { field: 'project', caption: 'Project', minWidth: 200 },
                      {
                        field: 'status',
                        caption: 'Stage',
                        width: 130,
                        renderCell: ({ value }) => (
                          <OgeChip label={stageLabel(value as ProjectTaskStatus)} severity={stageSeverity(value as ProjectTaskStatus)} size="sm" />
                        ),
                      },
                      { field: 'assignee', caption: 'Owner', width: 150 },
                      { field: 'priority', caption: 'Priority', width: 110 },
                      { field: 'dueDate', caption: 'Due', dataType: 'date', width: 110, format: { type: 'date', dateStyle: 'short' } },
                      { field: 'estimateHours', caption: 'Est. h', dataType: 'number', alignment: 'end', width: 80 },
                    ]}
                  />
                )}
              </OgeCard>
            </>
          )}

          {/* ═══════════ Revenue ═══════════ */}
          {activeView === 'charts' && (
            <>
              <section className="grid-2-1">
                <OgeCard header="Recurring revenue" subheader="Portfolio ARR, expansion and contraction, $K">
                  <OgeChart
                    dataSource={COHORT_METRICS}
                    series={CHART_SERIES}
                    tooltip={{ enabled: true, shared: true }}
                    crosshair={{ enabled: true }}
                    legend={{ visible: true, position: 'top', interactive: true }}
                    zoomEnabled="both"
                    panEnabled
                    className="chart-lg"
                  />
                </OgeCard>
                <OgeCard header="ARR by tier" subheader="Share of annual recurring revenue">
                  <OgePieChart
                    dataSource={TIER_SHARE_DATA}
                    argumentField="tier"
                    valueField="arr"
                    type="doughnut"
                    innerRadius={0.62}
                    tooltipEnabled
                    legend={{ visible: true, position: 'bottom', interactive: true }}
                    className="chart-lg"
                  />
                </OgeCard>
              </section>
              <section className="grid-2">
                <OgeCard header="Customer journey" subheader="Trial to enterprise agreement">
                  <OgeFunnelChart dataSource={CUSTOMER_JOURNEY_FUNNEL} argumentField="stage" valueField="accounts" tooltipEnabled className="chart-md" />
                </OgeCard>
                <OgeCard header="Retention" subheader="Renewal quota attainment and the net revenue retention trend">
                  <div className="gauge-stack">
                    <OgeCircularGauge value={94} subvalues={[85, 98]} title="Renewal quota attainment, %" className="gauge" />
                    <div className="spark-card">
                      <span>Net revenue retention, 10 months</span>
                      <OgeSparkline dataSource={NRR_SPARKLINE} type="line" markers className="spark-wide" />
                    </div>
                  </div>
                </OgeCard>
              </section>
            </>
          )}

          {/* ═══════════ Pivot ═══════════ */}
          {activeView === 'pivot' && (
            <OgeCard
              header="Retention cube"
              subheader="Drag fields between rows, columns and measures. Calculated measures: ARR per seat and share of ARR."
              headerActions={
                <OgeButtonGroup
                  items={PIVOT_LAYOUT_ITEMS}
                  selectionMode="single"
                  selectedKeys={[pivotLayout]}
                  size="sm"
                  stylingMode="outlined"
                  ariaLabel="Row header layout"
                  onSelectionChange={(e) => {
                    const next = e.selectedKeys[0] as OgePivotRowHeaderLayout | undefined;
                    if (next) setPivotLayout(next);
                  }}
                />
              }
            >
              <OgePivotGrid
                ref={pivotRef}
                data={PIVOT_CUSTOMER_ROWS}
                fields={PIVOT_FIELDS}
                calculatedFields={PIVOT_CALC_FIELDS}
                rowHeaderLayout={pivotLayout}
                fieldPanel
                showRowTotals
                showColumnTotals
                showRowGrandTotals
                showColumnGrandTotals
                style={{ maxHeight: 580 }}
              />
            </OgeCard>
          )}

          {/* ═══════════ Workbook ═══════════ */}
          {activeView === 'workbook' && (
            <OgeCard
              header="Billing workbook"
              subheader="Formulas, tables and sparklines read directly from .xlsx — or open your own file."
              headerActions={
                <OgeButtonGroup
                  items={WORKBOOK_PRESETS}
                  selectionMode="single"
                  selectedKeys={[workbookUrl]}
                  size="sm"
                  stylingMode="outlined"
                  ariaLabel="Sample workbook"
                  onSelectionChange={(e) => {
                    const next = e.selectedKeys[0];
                    if (next) {
                      setUploadedSheets([]);
                      setWorkbookUrl(next);
                    }
                  }}
                />
              }
            >
              <div className="workbook-upload">
                <OgeFileUploader
                  accept=".xlsx,.xlsm"
                  multiple={false}
                  uploadMode="select"
                  showFileList={false}
                  value={uploadedSheets}
                  onValueChange={setUploadedSheets}
                  messages={{
                    buttons: { selectSingle: 'Open an .xlsx workbook' },
                    dropZone: { labelSingle: 'Drop an Excel workbook here or {browse}' },
                  }}
                />
              </div>
              <OgeSpreadsheet source={uploadedSheets[0] ?? workbookUrl} showFormulaBar showSheetTabs showStatusBar style={{ height: 560 }} />
            </OgeCard>
          )}

          {/* ═══════════ Calendar ═══════════ */}
          {activeView === 'calendar' && (
            <OgeCard header="Success calendar" subheader="Business reviews, renewals and escalations grouped by customer success manager">
              <OgeScheduler
                dataSource={INITIAL_QBR_APPOINTMENTS}
                resources={QBR_RESOURCES}
                groups={['csmId']}
                currentDate={schedulerDate}
                onCurrentDateChange={setSchedulerDate}
                currentView={schedulerView}
                onCurrentViewChange={setSchedulerView}
                views={['day', 'week', 'workWeek', 'month', 'timelineWeek', 'agenda']}
                dayStartHour={8}
                dayEndHour={19}
                workHours={{ start: 9, end: 17 }}
                showCurrentTimeIndicator
                style={{ height: 620 }}
              />
            </OgeCard>
          )}

          {/* ═══════════ Onboarding plan ═══════════ */}
          {activeView === 'gantt' && (
            <OgeCard
              header="Onboarding plan"
              subheader="Work breakdown with dependencies, resource load and the critical path"
              headerActions={
                <div className="card-tools">
                  <OgeButtonGroup
                    items={GANTT_SCALE_ITEMS}
                    selectionMode="single"
                    selectedKeys={[ganttScale]}
                    size="sm"
                    stylingMode="outlined"
                    ariaLabel="Timeline scale"
                    onSelectionChange={(e) => {
                      const next = e.selectedKeys[0] as 'days' | 'weeks' | 'months' | undefined;
                      if (next) setGanttScale(next);
                    }}
                  />
                  <OgeSwitch value={showCriticalPath} onValueChange={setShowCriticalPath} label="Critical path" />
                </div>
              }
            >
              <OgeGantt
                tasks={ONBOARDING_GANTT_TASKS}
                dependencies={ONBOARDING_GANTT_DEPS}
                resources={ONBOARDING_GANTT_RESOURCES}
                scaleType={ganttScale}
                onScaleTypeChange={(s) => {
                  if (s === 'days' || s === 'weeks' || s === 'months') setGanttScale(s);
                }}
                showCriticalPath={showCriticalPath}
                showDependencies
                showRowLines
                showResourceWorkload
                taskListWidth={320}
                style={{ height: 560 }}
              />
            </OgeCard>
          )}

          {/* ═══════════ Renewal workflow ═══════════ */}
          {activeView === 'bpmn' && (
            <OgeCard
              header="Renewal workflow"
              subheader="The 90-day customer health and renewal process, with live validation"
              headerActions={<OgeButton text="Zoom to fit" stylingMode="text" size="sm" onClick={() => bpmnRef.current?.zoomToFit()} />}
            >
              <OgeBpmnEditor ref={bpmnRef} showHeader showPropertiesPanel showMinimap allowModeToggle lint gridVisible snapEnabled style={{ height: 580 }} />
            </OgeCard>
          )}

          {/* ═══════════ Copilot ═══════════ */}
          {activeView === 'copilot' && (
            <>
              <section className="grid-2">
                <OgeCard header="Ask the workspace" subheader="Account, retention and portfolio questions answered from your data">
                  <OgeChat
                    transport={aiTransport}
                    conversation={chatHistory}
                    onConversationChange={setChatHistory}
                    suggestions={['Which accounts are at risk?', 'Summarize October net revenue retention', 'Give me a portfolio ARR snapshot']}
                    style={{ height: 440 }}
                  />
                </OgeCard>
                <OgeCard header="Smart paste" subheader="Paste an email or a signature block; the form fills itself.">
                  <div className="smart-paste-bar">
                    <OgeSmartPaste ref={smartPasteRef} target={smartPasteFormRef} transport={aiTransport} mode="apply" />
                    <OgeButton
                      text="Try a sample lead"
                      size="sm"
                      stylingMode="outlined"
                      onClick={() => void smartPasteRef.current?.paste(SMART_PASTE_SAMPLE)}
                    />
                  </div>
                  <OgeForm ref={smartPasteFormRef} formData={draft} onFormDataChange={setDraft} colCount={2} items={formItems} />
                </OgeCard>
              </section>
              <OgeCard header="Accounts, in plain language" subheader="Describe the view you want; the grid sorts, filters and groups itself.">
                <OgeGridAssistant
                  target={aiGridRef}
                  transport={aiTransport}
                  mode="apply"
                  suggestions={['Enterprise accounts sorted by MRR', 'Only at-risk accounts', 'Group accounts by region']}
                />
                <div className="assistant-grid">
                  <OgeGrid ref={aiGridRef} ariaLabel="AI assisted customer grid" data={customers} keyField="id" columns={columns} groupPanel paging={{ pageSize: 6 }} />
                </div>
              </OgeCard>
            </>
          )}
        </main>
      </OgeDrawer>

      <OgeModal
        opened={aboutOpen}
        onOpenedChange={setAboutOpen}
        title="About this demo"
        width={680}
        renderFooter={({ close }) => (
          <div className="about-links">
            <a className="about-link" href="https://github.com/oge-ui/oge-ui/tree/main/examples/customer-manager" target="_blank" rel="noopener">
              View source
            </a>
            <a className="about-link" href="https://stackblitz.com/github/oge-ui/oge-ui/tree/main/examples/customer-manager" target="_blank" rel="noopener">
              Open in StackBlitz
            </a>
            <a className="about-link" href="https://ogeui.com" target="_blank" rel="noopener">
              OGE UI docs
            </a>
            <a className="about-link" href="https://ogeui.com/pricing" target="_blank" rel="noopener">
              Pricing
            </a>
            <OgeButton text="Start exploring" severity="accent" size="sm" onClick={() => close()} />
          </div>
        )}
      >
        <div className="about-hero">
          <img src="/brand.svg" alt="" width={56} height={56} className="about-mark" />
          <div className="about-copy">
            <h2 className="about-title">PulseCRM</h2>
            <p className="about-tagline">Accounts, renewals and delivery for customer-success teams.</p>
            <div className="about-chips">
              <OgeChip label="React 19" size="sm" />
              <OgeChip label="OGE UI 1.1.6" size="sm" severity="accent" />
              <OgeChip label="All 7 Pro families" size="sm" />
            </div>
          </div>
        </div>
        <p className="about-text">
          PulseCRM is a sample product built entirely with OGE UI for React: one shell, nine pages, and every commercial family next to the MIT
          grid, forms and overlays. Edits, drag and drop and exports all work on local sample data — explore freely.
        </p>
        <ul className="about-grid">
          {NAV_ITEMS.map((item) => (
            <li key={item.id} className="about-item">
              <Icon d={item.icon} size={16} />
              <span className="about-item-label">{item.label}</span>
              <code className="about-item-pkg">{item.packageName}</code>
            </li>
          ))}
        </ul>
      </OgeModal>

      <OgeModal
        opened={addModalOpen}
        onOpenedChange={setAddModalOpen}
        title="New customer"
        width={640}
        renderFooter={({ close }) => (
          <div className="modal-actions">
            <OgeButton text="Cancel" stylingMode="text" onClick={() => close()} />
            <OgeButton text="Create customer" severity="accent" onClick={() => void formRef.current?.submit()} />
          </div>
        )}
      >
        <div className="avatar-picker">
          <div className="avatar-picker-preview">
            <OgeAvatar name={draft.name.trim() || 'New customer'} src={avatarPreviewUrl} size="xl" status="online" />
            <span className="avatar-picker-label">Preview</span>
          </div>
          <div className="avatar-picker-uploader">
            <OgeFileUploader
              accept="image/*"
              listType="pictureCard"
              previewWidth={64}
              multiple={false}
              uploadMode="select"
              maxFileSize={2 * 1024 * 1024}
              value={avatarFiles}
              onValueChange={setAvatarFiles}
              onFileRejected={(event) =>
                toasts.warning(event.errors[0]?.message ?? 'The selected image did not pass validation.', { title: 'Image rejected' })
              }
            />
          </div>
        </div>
        <OgeForm
          ref={formRef}
          formData={draft}
          onFormDataChange={setDraft}
          colCountByScreen={{ xs: 1, sm: 2 }}
          showValidationSummary
          items={formItems}
          onSubmitted={(event) => void handleFormSubmitted(event)}
        />
      </OgeModal>
    </div>
  );
}

export default App;

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  OgeAppBar,
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
  OgeSwitch,
  OgeTimeline,
  useOgeToasts,
  type OgeAvatarItem,
  type OgeBreadcrumbItemData,
  type OgeButtonGroupItem,
  type OgeChatMessage,
  type OgeFormHandle,
  type OgeFormItemDefinition,
  type OgeGridColumnProps,
  type OgeGridHandle,
  type OgeSmartPasteHandle,
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
  ACTIVITY,
  BUYERS,
  CATEGORIES,
  CATEGORY_OPTIONS,
  GL_ENTRIES,
  INITIAL_COPILOT_MESSAGES,
  INVENTORY_BY_CATEGORY,
  LINE_RESOURCES,
  MONTHLY_OPS,
  ORDER_FUNNEL,
  PLANTS,
  PLANT_OTIF,
  PRODUCTION_RESOURCES,
  PURCHASE_APPROVAL_BPMN,
  REQUISITIONS,
  REQUISITION_COLUMNS,
  SHIFTS,
  SMART_PASTE_SAMPLE,
  STATUS_OPTIONS,
  WAREHOUSES,
  WAREHOUSE_OPTIONS,
  WORK_ORDERS,
  WORK_ORDER_DEPS,
  createVantageAiTransport,
  generateInventory,
  type GlEntry,
  type InventoryItem,
  type Requisition,
  type RequisitionStatus,
  type StockStatus,
} from './data';

/* 24×24 stroke icons (path data only) */
const ICONS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  sun: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v5m0-8.5v.5',
  dashboard: 'M3 3v18h18M7 14l4-4 4 3 5-6',
  inventory: 'M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8',
  procurement: 'M4 5h4v14H4V5zm6 0h4v10h-4V5zm6 0h4v12h-4V5z',
  production: 'M3 6h10v3H3V6zm4 5h11v3H7v-3zm3 5h11v3H10v-3z',
  shifts: 'M4 5h16v15H4V5zm0 5h16M8 3v4M16 3v4',
  finance: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 3h7v4h-7v-4z',
  ledger: 'M4 4h16v16H4V4zm0 5h16M10 9v11',
  approvals: 'M5 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0zm8 0h6m-3-3l3 3-3 3',
  copilot: 'M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6L12 2z',
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

type VantageView =
  | 'dashboard'
  | 'inventory'
  | 'procurement'
  | 'production'
  | 'shifts'
  | 'finance'
  | 'ledger'
  | 'approvals'
  | 'copilot';

type NavGroup = 'Operations' | 'Planning' | 'Finance' | 'Automation';

interface NavItem {
  id: VantageView;
  group: NavGroup;
  label: string;
  description: string;
  packageName: string;
  icon: string;
}

const NAV_GROUPS: readonly NavGroup[] = ['Operations', 'Planning', 'Finance', 'Automation'];

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', group: 'Operations', label: 'Dashboard', packageName: '@oge-ui/react-charts', icon: ICONS.dashboard,
    description: 'Revenue, margin, order flow and on-time delivery across the three plants.' },
  { id: 'inventory', group: 'Operations', label: 'Inventory', packageName: '@oge-ui/react-grid', icon: ICONS.inventory,
    description: 'Two thousand stock items across five warehouses, editable in place.' },
  { id: 'procurement', group: 'Operations', label: 'Procurement', packageName: '@oge-ui/react-kanban', icon: ICONS.procurement,
    description: 'Purchase requisitions from request to goods receipt, by plant.' },
  { id: 'production', group: 'Planning', label: 'Production', packageName: '@oge-ui/react-gantt', icon: ICONS.production,
    description: 'Work orders per line with dependencies, load and the critical path.' },
  { id: 'shifts', group: 'Planning', label: 'Shifts', packageName: '@oge-ui/react-scheduler', icon: ICONS.shifts,
    description: 'Shifts, inbound deliveries and maintenance windows per line.' },
  { id: 'finance', group: 'Finance', label: 'Finance cube', packageName: '@oge-ui/react-pivot', icon: ICONS.finance,
    description: 'Actuals against budget by account; slice by cost center, plant and month.' },
  { id: 'ledger', group: 'Finance', label: 'Ledger', packageName: '@oge-ui/react-spreadsheet', icon: ICONS.ledger,
    description: 'Costing models opened straight from Excel, formulas included.' },
  { id: 'approvals', group: 'Automation', label: 'Approvals', packageName: '@oge-ui/react-bpmn', icon: ICONS.approvals,
    description: 'The purchase approval process as executable BPMN.' },
  { id: 'copilot', group: 'Automation', label: 'Copilot', packageName: '@oge-ui/react-ai', icon: ICONS.copilot,
    description: 'Ask about stock, deliveries and margin; paste a supplier card into a form.' },
];

const TEAM: readonly OgeAvatarItem[] = [
  { name: BUYERS[0], status: 'online' },
  { name: BUYERS[1], status: 'online' },
  { name: BUYERS[2], status: 'busy' },
  { name: BUYERS[3], status: 'away' },
];

const BOARD_COLUMNS: readonly OgeKanbanColumn[] = REQUISITION_COLUMNS;

const OPS_SERIES: readonly OgeChartSeriesInput[] = [
  { type: 'bar', argumentField: 'month', valueField: 'revenue', name: 'Revenue' },
  { type: 'bar', argumentField: 'month', valueField: 'cost', name: 'Cost of goods' },
  { type: 'spline', argumentField: 'month', valueField: 'margin', name: 'Gross margin %', axis: 1, dashStyle: 'dash' },
];

const PIVOT_FIELDS: readonly OgePivotFieldDef<GlEntry>[] = [
  { dataField: 'accountGroup', caption: 'Account group', area: 'row' },
  { dataField: 'account', caption: 'Account', area: 'row' },
  { dataField: 'costCenter', caption: 'Cost center', area: 'filter' },
  { dataField: 'plant', caption: 'Plant', area: 'filter' },
  { dataField: 'date', caption: 'Month', area: 'filter', groupInterval: 'month' },
  { dataField: 'actual', id: 'actual', caption: 'Actual', area: 'data', summaryType: 'sum', format: { type: 'currency', currency: 'USD', maximumFractionDigits: 0 } },
  { dataField: 'budget', id: 'budget', caption: 'Budget', area: 'data', summaryType: 'sum', format: { type: 'currency', currency: 'USD', maximumFractionDigits: 0 } },
];

const PIVOT_CALC_FIELDS: readonly OgePivotCalculatedField[] = [
  {
    name: 'variance',
    caption: 'Variance %',
    expression: (v) => (v['budget'] ? ((v['actual'] ?? 0) - v['budget']) / v['budget'] : null),
    format: (val) => `${(Number(val) * 100).toFixed(1)}%`,
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

interface NewItemDraft {
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  onHand: number;
  reorderPoint: number;
  unitCost: number;
}

const EMPTY_ITEM: NewItemDraft = { sku: '', name: '', category: 'Components', warehouse: 'IZM-01', onHand: 0, reorderPoint: 50, unitCost: 10 };

interface SupplierDraft {
  name: string;
  contact: string;
  email: string;
  category: string;
  paymentTerms: string;
  leadTimeDays: number;
  plant: string;
}

const EMPTY_SUPPLIER: SupplierDraft = { name: '', contact: '', email: '', category: 'Components', paymentTerms: 'Net 30', leadTimeDays: 14, plant: 'İzmir Plant' };

function stockSeverity(status: StockStatus) {
  switch (status) {
    case 'In stock':
      return 'success' as const;
    case 'Low':
      return 'warning' as const;
    case 'Backorder':
      return 'danger' as const;
    case 'Discontinued':
      return 'neutral' as const;
  }
}

function stageLabel(status: RequisitionStatus): string {
  return REQUISITION_COLUMNS.find((c) => c.key === status)?.title ?? status;
}

function stageSeverity(status: RequisitionStatus) {
  switch (status) {
    case 'closed':
      return 'success' as const;
    case 'receiving':
      return 'warning' as const;
    case 'ordered':
    case 'approved':
      return 'accent' as const;
    default:
      return 'neutral' as const;
  }
}

const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;

function Icon({ d, size = 18, className }: { d: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function ReactMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  );
}

export function App() {
  const [items, setItems] = useState<InventoryItem[]>(() => generateInventory(2000));
  const [activeView, setActiveView] = useState<VantageView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 960);
  const [darkMode, setDarkMode] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(() => firstVisit('vantage-erp-intro-seen'));
  const [warehouseFilter, setWarehouseFilter] = useState<string | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemDraft, setItemDraft] = useState<NewItemDraft>(EMPTY_ITEM);
  const [supplierDraft, setSupplierDraft] = useState<SupplierDraft>(EMPTY_SUPPLIER);

  const [requisitions, setRequisitions] = useState<Requisition[]>(REQUISITIONS);
  const [boardMode, setBoardMode] = useState<'board' | 'list'>('board');
  const [collapsedLanes, setCollapsedLanes] = useState<readonly string[]>([]);

  const [pivotLayout, setPivotLayout] = useState<OgePivotRowHeaderLayout>('outline');
  const [workbookUrl, setWorkbookUrl] = useState<string>('/demo/spreadsheet/formulas.xlsx');
  const [uploadedSheets, setUploadedSheets] = useState<readonly File[]>([]);
  const [schedulerDate, setSchedulerDate] = useState<Date>(new Date(2026, 9, 21));
  const [schedulerView, setSchedulerView] = useState<OgeSchedulerView>('timelineWeek');
  const [ganttScale, setGanttScale] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [chatHistory, setChatHistory] = useState<readonly OgeChatMessage[]>(INITIAL_COPILOT_MESSAGES);

  const gridRef = useRef<OgeGridHandle<InventoryItem>>(null);
  const aiGridRef = useRef<OgeGridHandle<InventoryItem>>(null);
  const itemFormRef = useRef<OgeFormHandle<NewItemDraft>>(null);
  const supplierFormRef = useRef<OgeFormHandle<SupplierDraft>>(null);
  const smartPasteRef = useRef<OgeSmartPasteHandle>(null);
  const pivotRef = useRef<OgePivotGridHandle<GlEntry>>(null);
  const bpmnRef = useRef<OgeBpmnEditorHandle>(null);
  const boardRef = useRef<OgeKanbanHandle<Requisition>>(null);

  const toasts = useOgeToasts();
  const aiTransport = useMemo(() => createVantageAiTransport(), []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('oge-theme-dark', darkMode);
    root.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  useEffect(() => {
    if (activeView === 'approvals') {
      const timer = setTimeout(() => {
        void bpmnRef.current?.importXml(PURCHASE_APPROVAL_BPMN).then(() => requestAnimationFrame(() => bpmnRef.current?.zoomToFit()));
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeView]);

  const currentNavItem = useMemo(() => NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0], [activeView]);

  const filteredItems = useMemo(
    () => (warehouseFilter ? items.filter((i) => i.warehouse === warehouseFilter) : items),
    [items, warehouseFilter],
  );

  const stock = useMemo(() => {
    const value = filteredItems.reduce((sum, i) => sum + i.value, 0);
    const low = filteredItems.filter((i) => i.status === 'Low').length;
    const backorder = filteredItems.filter((i) => i.status === 'Backorder').length;
    return { value, low, backorder, count: filteredItems.length };
  }, [filteredItems]);

  const lowStock = useMemo(
    () => items.filter((i) => i.status === 'Low' || i.status === 'Backorder').sort((a, b) => a.onHand - b.onHand).slice(0, 8),
    [items],
  );

  const openPrCount = useMemo(() => requisitions.filter((r) => r.status !== 'closed').length, [requisitions]);
  const openPrAmount = useMemo(() => requisitions.filter((r) => r.status !== 'closed').reduce((s, r) => s + r.amount, 0), [requisitions]);
  const overduePrCount = useMemo(() => {
    const now = Date.now();
    return requisitions.filter((r) => r.status !== 'closed' && r.dueDate.getTime() < now).length;
  }, [requisitions]);
  const prCountFor = (status: RequisitionStatus) => requisitions.filter((r) => r.status === status).length;
  const plantProgress = useMemo(
    () =>
      PLANTS.map((name) => {
        const mine = requisitions.filter((r) => r.plant === name);
        return { name, total: mine.length, done: mine.filter((r) => r.status === 'closed').length, amount: mine.filter((r) => r.status !== 'closed').reduce((s, r) => s + r.amount, 0) };
      }),
    [requisitions],
  );

  const breadcrumbItems = useMemo<readonly OgeBreadcrumbItemData[]>(
    () => [
      { key: 'root', text: 'Vantage ERP' },
      { key: currentNavItem.id, text: currentNavItem.label, current: true },
    ],
    [currentNavItem],
  );

  const columns = useMemo<OgeGridColumnProps<InventoryItem>[]>(
    () => [
      { field: 'sku', caption: 'SKU', width: 110, editable: false },
      { field: 'name', caption: 'Item', minWidth: 220, required: true },
      { field: 'category', caption: 'Category', width: 140, lookup: { dataSource: CATEGORY_OPTIONS, valueExpr: 'value', displayExpr: 'label' } },
      { field: 'warehouse', caption: 'Warehouse', width: 110, lookup: { dataSource: WAREHOUSE_OPTIONS, valueExpr: 'value', displayExpr: 'label' } },
      { field: 'supplier', caption: 'Supplier', minWidth: 170, editable: false },
      { field: 'onHand', caption: 'On hand', dataType: 'number', width: 100, totalSummary: 'sum' },
      { field: 'reorderPoint', caption: 'Reorder at', dataType: 'number', width: 105 },
      { field: 'unitCost', caption: 'Unit cost', dataType: 'number', width: 110, format: { type: 'currency', currency: 'USD', maximumFractionDigits: 2 } },
      { field: 'value', caption: 'Stock value', dataType: 'number', width: 125, editable: false, format: { type: 'currency', currency: 'USD', maximumFractionDigits: 0 }, totalSummary: 'sum' },
      { field: 'leadTimeDays', caption: 'Lead time', dataType: 'number', width: 100, editable: false },
      {
        field: 'status',
        caption: 'Status',
        width: 125,
        editable: false,
        lookup: { dataSource: STATUS_OPTIONS, valueExpr: 'value', displayExpr: 'label' },
        renderCell: ({ value }) => {
          const status = (value as StockStatus) || 'In stock';
          return <OgeChip label={status} size="sm" severity={stockSeverity(status)} />;
        },
      },
    ],
    [],
  );

  const itemFormItems = useMemo<OgeFormItemDefinition[]>(
    () => [
      { field: 'sku', label: 'SKU', placeholder: 'e.g. CO-1234', isRequired: true, validationRules: [{ type: 'required', message: 'SKU is required.' }] },
      { field: 'name', label: 'Item name', isRequired: true, validationRules: [{ type: 'required', message: 'Item name is required.' }] },
      { field: 'category', label: 'Category', editorType: 'selectBox', editorOptions: { items: [...CATEGORIES] }, isRequired: true },
      { field: 'warehouse', label: 'Warehouse', editorType: 'selectBox', editorOptions: { items: [...WAREHOUSES] }, isRequired: true },
      { field: 'onHand', label: 'On hand', dataType: 'number', editorType: 'numberBox', editorOptions: { min: 0, max: 100000, step: 1, showSpinButtons: true } },
      { field: 'reorderPoint', label: 'Reorder point', dataType: 'number', editorType: 'numberBox', editorOptions: { min: 0, max: 10000, step: 5, showSpinButtons: true } },
      { field: 'unitCost', label: 'Unit cost (USD)', dataType: 'number', editorType: 'numberBox', editorOptions: { min: 0, max: 100000, step: 0.5, showSpinButtons: true } },
    ],
    [],
  );

  const supplierFormItems = useMemo<OgeFormItemDefinition[]>(
    () => [
      { field: 'name', label: 'Supplier', isRequired: true, validationRules: [{ type: 'required', message: 'Supplier name is required.' }] },
      { field: 'contact', label: 'Contact' },
      { field: 'email', label: 'Email', validationRules: [{ type: 'email', message: 'Enter a valid email address.' }] },
      { field: 'category', label: 'Category', editorType: 'selectBox', editorOptions: { items: [...CATEGORIES] } },
      { field: 'paymentTerms', label: 'Payment terms', editorType: 'selectBox', editorOptions: { items: ['Net 30', 'Net 45', 'Net 60', 'Prepaid'] } },
      { field: 'leadTimeDays', label: 'Lead time (days)', dataType: 'number', editorType: 'numberBox', editorOptions: { min: 1, max: 180, step: 1, showSpinButtons: true } },
      { field: 'plant', label: 'Plant', editorType: 'selectBox', editorOptions: { items: [...PLANTS] } },
    ],
    [],
  );

  const handleItemSubmitted = ({ data }: { data: NewItemDraft }) => {
    const nextId = items.reduce((maxId, i) => Math.max(maxId, i.id), 0) + 1;
    const onHand = Number(data.onHand) || 0;
    const reorderPoint = Number(data.reorderPoint) || 0;
    const unitCost = Number(data.unitCost) || 0;
    const created: InventoryItem = {
      id: nextId,
      sku: data.sku.trim().toUpperCase(),
      name: data.name.trim(),
      category: data.category as InventoryItem['category'],
      warehouse: data.warehouse as InventoryItem['warehouse'],
      supplier: 'Unassigned',
      onHand,
      reorderPoint,
      unitCost,
      value: Math.round(onHand * unitCost),
      leadTimeDays: 14,
      status: onHand === 0 ? 'Backorder' : onHand < reorderPoint ? 'Low' : 'In stock',
      updatedAt: new Date(),
    };
    setItems((prev) => [created, ...prev]);
    setItemModalOpen(false);
    toasts.success(`${created.sku} · ${created.name} added to ${created.warehouse}.`, { title: 'Item created' });
  };

  const exportInventory = async () => {
    if (!gridRef.current) return;
    const { exportGridToExcel } = await import('@oge-ui/react-grid/export-excel');
    await exportGridToExcel(gridRef.current, { filename: 'vantage-inventory.xlsx' });
    toasts.success('Exported the inventory to vantage-inventory.xlsx', { title: 'Excel export' });
  };

  const exportPivot = async () => {
    if (!pivotRef.current) return;
    const { exportPivotToExcel } = await import('@oge-ui/react-pivot/export-excel');
    await exportPivotToExcel(pivotRef.current, { filename: 'vantage-finance-cube.xlsx' });
    toasts.success('Exported the finance cube to vantage-finance-cube.xlsx', { title: 'Excel export' });
  };

  const validateWorkflow = () => {
    const issues = bpmnRef.current?.validate() ?? [];
    if (issues.length === 0) toasts.success('The approval process passed every structural check.', { title: 'No issues' });
    else toasts.warning(`${issues.length} issue(s) highlighted on the canvas.`, { title: 'Validation complete' });
  };

  const newRequisition = () => {
    if (boardRef.current) boardRef.current.openNewCard('requested', PLANTS[0]);
    else {
      setBoardMode('board');
      toasts.info('Switched to the board — use “New requisition” again to add one.');
    }
  };

  const pageActions = (() => {
    switch (activeView) {
      case 'inventory':
        return (
          <>
            <OgeSelectBox
              className="warehouse-filter"
              label="Warehouse"
              labelMode="hidden"
              size="sm"
              width={160}
              placeholder="All warehouses"
              showClearButton
              items={[...WAREHOUSES]}
              value={warehouseFilter}
              onValueChange={(v) => setWarehouseFilter((v as string | null) ?? null)}
            />
            <OgeButton text="Export .xlsx" stylingMode="outlined" size="sm" icon={<Icon d={ICONS.download} size={15} />} onClick={() => void exportInventory()} />
            <OgeButton text="New item" severity="accent" size="sm" icon={<Icon d={ICONS.plus} size={15} />} onClick={() => { setItemDraft(EMPTY_ITEM); setItemModalOpen(true); }} />
          </>
        );
      case 'procurement':
        return <OgeButton text="New requisition" severity="accent" size="sm" icon={<Icon d={ICONS.plus} size={15} />} onClick={newRequisition} />;
      case 'finance':
        return <OgeButton text="Export .xlsx" stylingMode="outlined" size="sm" icon={<Icon d={ICONS.download} size={15} />} onClick={() => void exportPivot()} />;
      case 'approvals':
        return <OgeButton text="Validate" stylingMode="outlined" size="sm" onClick={validateWorkflow} />;
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
            <button type="button" className="app-icon-btn" aria-label="Toggle navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}>
              <Icon d={ICONS.menu} size={20} />
            </button>
            <span className="app-brand">
              <img src="/brand.svg" alt="" width={28} height={28} className="app-brand-mark" />
              <span className="app-brand-name">Vantage ERP</span>
            </span>
          </div>
        }
        end={
          <div className="app-actions">
            <OgeAvatarGroup className="app-team" items={TEAM} max={4} size="xs" ariaLabel="Buyers online" />
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
                        {sidebarOpen && item.id === 'procurement' && <span className="app-nav-count">{openPrCount}</span>}
                        {sidebarOpen && item.id === 'inventory' && stock.low + stock.backorder > 0 && (
                          <span className="app-nav-count">{stock.low + stock.backorder}</span>
                        )}
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
                  if (ev.item.key === 'root') setActiveView('dashboard');
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

          {/* ═══════════ Dashboard ═══════════ */}
          {activeView === 'dashboard' && (
            <>
              <section className="kpi-grid" aria-label="Operations summary">
                <OgeCard size="sm">
                  <div className="kpi">
                    <span className="kpi-label">Revenue, October</span>
                    <strong className="kpi-value">$2.74M</strong>
                    <span className="kpi-foot">
                      <OgeChip label="+4.8% vs Sep" severity="success" size="sm" />
                    </span>
                  </div>
                </OgeCard>
                <OgeCard size="sm">
                  <div className="kpi">
                    <span className="kpi-label">Gross margin</span>
                    <strong className="kpi-value">34.9%</strong>
                    <span className="kpi-foot">target 33% · materials 3.7% over budget</span>
                  </div>
                </OgeCard>
                <OgeCard size="sm">
                  <div className="kpi">
                    <span className="kpi-label">Inventory at cost</span>
                    <strong className="kpi-value">{money(stock.value)}</strong>
                    <span className="kpi-foot">
                      {stock.count.toLocaleString('en-US')} items · {stock.low} low · {stock.backorder} on backorder
                    </span>
                  </div>
                </OgeCard>
                <OgeCard size="sm" severity={overduePrCount > 0 ? 'warning' : undefined}>
                  <div className="kpi">
                    <span className="kpi-label">Open requisitions</span>
                    <strong className="kpi-value">{openPrCount}</strong>
                    <span className="kpi-foot">
                      {money(openPrAmount)} committed · {overduePrCount} overdue
                    </span>
                  </div>
                </OgeCard>
              </section>

              <section className="grid-2-1">
                <OgeCard header="Revenue and cost" subheader="Monthly revenue, cost of goods and gross margin, $K">
                  <OgeChart
                    dataSource={MONTHLY_OPS}
                    series={OPS_SERIES}
                    valueAxis={[{ title: '$K' }, { position: 'end', title: '%', min: 0, max: 50 }]}
                    tooltip={{ enabled: true, shared: true }}
                    crosshair={{ enabled: true }}
                    legend={{ visible: true, position: 'top', interactive: true }}
                    className="chart-lg"
                  />
                </OgeCard>
                <OgeCard header="Inventory by category" subheader="Stock value at cost, $K">
                  <OgePieChart dataSource={INVENTORY_BY_CATEGORY} argumentField="category" valueField="value" type="doughnut" innerRadius={0.62} tooltipEnabled legend={{ visible: true, position: 'bottom', interactive: true }} className="chart-lg" />
                </OgeCard>
              </section>

              <section className="grid-3">
                <OgeCard header="Order flow" subheader="Quotes to invoiced orders, quarter to date">
                  <OgeFunnelChart dataSource={ORDER_FUNNEL} argumentField="stage" valueField="count" tooltipEnabled className="chart-md" />
                </OgeCard>
                <OgeCard header="On-time in full" subheader="Deliveries that arrived complete and on the promised day">
                  <OgeCircularGauge value={95.6} subvalues={[95]} title="Group OTIF, %" className="gauge" />
                </OgeCard>
                <OgeCard header="Plants" subheader="OTIF trend, last ten weeks">
                  <ul className="rep-list">
                    {PLANT_OTIF.map((p) => (
                      <li key={p.plant} className="rep-row">
                        <span className="rep-meta">
                          <strong>{p.plant}</strong>
                          <span>{p.otif}% OTIF</span>
                        </span>
                        <OgeSparkline dataSource={p.trend} type="area" className="rep-spark" />
                      </li>
                    ))}
                  </ul>
                </OgeCard>
              </section>

              <section className="grid-2-1">
                <OgeCard header="Stock-out risk" subheader="Items below their reorder point, lowest stock first">
                  <OgeGrid
                    ariaLabel="Stock-out risk"
                    data={lowStock}
                    keyField="id"
                    columns={[
                      { field: 'sku', caption: 'SKU', width: 100 },
                      { field: 'name', caption: 'Item', minWidth: 200 },
                      { field: 'warehouse', caption: 'Warehouse', width: 110 },
                      { field: 'onHand', caption: 'On hand', dataType: 'number', width: 95 },
                      { field: 'reorderPoint', caption: 'Reorder at', dataType: 'number', width: 105 },
                      { field: 'leadTimeDays', caption: 'Lead time', dataType: 'number', width: 100 },
                      {
                        field: 'status',
                        caption: 'Status',
                        width: 115,
                        renderCell: ({ value }) => <OgeChip label={String(value)} size="sm" severity={stockSeverity(value as StockStatus)} />,
                      },
                    ]}
                  />
                </OgeCard>
                <OgeCard header="Activity" subheader="Latest events across the plants">
                  <OgeTimeline items={ACTIVITY} />
                </OgeCard>
              </section>
            </>
          )}

          {/* ═══════════ Inventory ═══════════ */}
          {activeView === 'inventory' && (
            <>
              <section className="kpi-grid" aria-label="Inventory summary">
                <OgeCard size="sm">
                  <div className="kpi">
                    <span className="kpi-label">Items</span>
                    <strong className="kpi-value">{stock.count.toLocaleString('en-US')}</strong>
                    <span className="kpi-foot">{warehouseFilter ?? 'all warehouses'}</span>
                  </div>
                </OgeCard>
                <OgeCard size="sm">
                  <div className="kpi">
                    <span className="kpi-label">Stock value</span>
                    <strong className="kpi-value">{money(stock.value)}</strong>
                    <span className="kpi-foot">at unit cost</span>
                  </div>
                </OgeCard>
                <OgeCard size="sm" severity={stock.low > 0 ? 'warning' : undefined}>
                  <div className="kpi">
                    <span className="kpi-label">Below reorder point</span>
                    <strong className="kpi-value">{stock.low}</strong>
                    <span className="kpi-foot">requisitions raise automatically</span>
                  </div>
                </OgeCard>
                <OgeCard size="sm" severity={stock.backorder > 0 ? 'danger' : undefined}>
                  <div className="kpi">
                    <span className="kpi-label">On backorder</span>
                    <strong className="kpi-value">{stock.backorder}</strong>
                    <span className="kpi-foot">zero on hand</span>
                  </div>
                </OgeCard>
              </section>

              <OgeCard header="Stock items" subheader="Double-click a cell or press F2 to edit on hand, reorder point or unit cost. Totals follow the filters.">
                <OgeGrid
                  ref={gridRef}
                  ariaLabel="Inventory"
                  data={filteredItems}
                  keyField="id"
                  columns={columns}
                  searchPanel
                  filterRow
                  groupPanel
                  rowAlternation
                  focusedRowEnabled
                  columnChooser
                  paging={{ pageSize: 15, pageSizes: [15, 30, 60], showInfo: true }}
                  editing={{ mode: 'cell', allowUpdating: true }}
                  onRowUpdated={({ key, values }) => {
                    setItems((prev) =>
                      prev.map((item) => {
                        if (item.id !== key) return item;
                        const next = { ...item, ...values } as InventoryItem;
                        next.value = Math.round(next.onHand * next.unitCost);
                        next.status = next.status === 'Discontinued' ? 'Discontinued' : next.onHand === 0 ? 'Backorder' : next.onHand < next.reorderPoint ? 'Low' : 'In stock';
                        return next;
                      }),
                    );
                    toasts.success('Item updated.', { title: 'Saved' });
                  }}
                />
              </OgeCard>
            </>
          )}

          {/* ═══════════ Procurement ═══════════ */}
          {activeView === 'procurement' && (
            <>
              <section className="board-summary">
                <OgeCard size="sm">
                  <dl className="stat-list">
                    <div className="stat">
                      <dt>Open requisitions</dt>
                      <dd>{openPrCount}</dd>
                    </div>
                    <div className="stat">
                      <dt>Committed</dt>
                      <dd>{money(openPrAmount)}</dd>
                    </div>
                    <div className="stat">
                      <dt>Receiving</dt>
                      <dd>{prCountFor('receiving')}</dd>
                    </div>
                    <div className={overduePrCount > 0 ? 'stat is-danger' : 'stat'}>
                      <dt>Overdue</dt>
                      <dd>{overduePrCount}</dd>
                    </div>
                  </dl>
                </OgeCard>
                <OgeCard size="sm" header="By plant">
                  <ul className="project-list">
                    {plantProgress.map((p) => (
                      <li key={p.name} className="project-row">
                        <span className="project-name">{p.name}</span>
                        <span className="project-count">
                          {p.done}/{p.total} closed · {money(p.amount)} open
                        </span>
                        <OgeProgressBar value={p.done} max={p.total} severity={p.done === p.total ? 'success' : 'accent'} showLabel={false} ariaLabel={`${p.name} requisitions closed`} />
                      </li>
                    ))}
                  </ul>
                </OgeCard>
              </section>

              <OgeCard
                header="Requisition board"
                subheader="Drag requisitions between stages. Columns carry work-in-progress limits; lanes are plants."
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
                    dataSource={requisitions}
                    columns={BOARD_COLUMNS}
                    keyExpr="id"
                    columnExpr="status"
                    titleExpr="title"
                    descriptionExpr="summary"
                    swimlaneExpr="plant"
                    assigneeExpr="buyer"
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
                      setRequisitions((prev) => prev.map((r) => (r.id === e.card.id ? e.card : r)));
                      toasts.info(`${e.card.number} moved to ${stageLabel(e.card.status)}.`);
                    }}
                    onCardAdded={(e) => {
                      const card = e.card;
                      const created: Requisition = {
                        ...card,
                        id: card.id ?? Date.now(),
                        number: card.number ?? `PR-${1065 + requisitions.length}`,
                        status: (e.column as RequisitionStatus) ?? 'requested',
                        plant: (e.swimlane as Requisition['plant']) ?? card.plant ?? PLANTS[0],
                        summary: card.summary ?? '',
                        supplier: card.supplier ?? 'To be sourced',
                        buyer: card.buyer ?? BUYERS[0],
                        amount: card.amount ?? 0,
                        priority: card.priority ?? 'medium',
                        dueDate: card.dueDate instanceof Date ? card.dueDate : new Date(Date.now() + 14 * 86_400_000),
                        tags: card.tags ?? [],
                        checklist: card.checklist ?? [],
                      };
                      setRequisitions((prev) => [...prev, created]);
                    }}
                    onCardUpdated={(e) => setRequisitions((prev) => prev.map((r) => (r.id === e.oldData.id ? { ...r, ...e.newData } : r)))}
                    onCardDeleted={(e) => setRequisitions((prev) => prev.filter((r) => r.id !== e.card.id))}
                    style={{ height: 680 }}
                  />
                ) : (
                  <OgeGrid
                    ariaLabel="Requisitions"
                    data={requisitions}
                    keyField="id"
                    groupPanel
                    searchPanel
                    paging={{ pageSize: 12 }}
                    columns={[
                      { field: 'number', caption: 'PR', width: 95 },
                      { field: 'title', caption: 'Requisition', minWidth: 220 },
                      { field: 'plant', caption: 'Plant', width: 140 },
                      { field: 'supplier', caption: 'Supplier', minWidth: 170 },
                      {
                        field: 'status',
                        caption: 'Stage',
                        width: 120,
                        renderCell: ({ value }) => <OgeChip label={stageLabel(value as RequisitionStatus)} severity={stageSeverity(value as RequisitionStatus)} size="sm" />,
                      },
                      { field: 'buyer', caption: 'Buyer', width: 140 },
                      { field: 'amount', caption: 'Amount', dataType: 'number', alignment: 'end', width: 120, format: { type: 'currency', currency: 'USD', maximumFractionDigits: 0 }, totalSummary: 'sum' },
                      { field: 'dueDate', caption: 'Due', dataType: 'date', width: 110, format: { type: 'date', dateStyle: 'short' } },
                    ]}
                  />
                )}
              </OgeCard>
            </>
          )}

          {/* ═══════════ Production ═══════════ */}
          {activeView === 'production' && (
            <OgeCard
              header="Production plan"
              subheader="Three batches across the lines and the machining cell, with dependencies and workload"
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
                tasks={WORK_ORDERS}
                dependencies={WORK_ORDER_DEPS}
                resources={PRODUCTION_RESOURCES}
                scaleType={ganttScale}
                onScaleTypeChange={(s) => {
                  if (s === 'days' || s === 'weeks' || s === 'months') setGanttScale(s);
                }}
                showCriticalPath={showCriticalPath}
                showDependencies
                showRowLines
                showResourceWorkload
                taskListWidth={340}
                style={{ height: 560 }}
              />
            </OgeCard>
          )}

          {/* ═══════════ Shifts ═══════════ */}
          {activeView === 'shifts' && (
            <OgeCard header="Shifts and deliveries" subheader="Shifts, inbound and outbound slots and maintenance windows, grouped by line">
              <OgeScheduler
                dataSource={SHIFTS}
                resources={LINE_RESOURCES}
                groups={['lineId']}
                currentDate={schedulerDate}
                onCurrentDateChange={setSchedulerDate}
                currentView={schedulerView}
                onCurrentViewChange={setSchedulerView}
                views={['day', 'week', 'workWeek', 'timelineDay', 'timelineWeek', 'agenda']}
                dayStartHour={6}
                dayEndHour={22}
                workHours={{ start: 6, end: 22 }}
                showCurrentTimeIndicator
                style={{ height: 620 }}
              />
            </OgeCard>
          )}

          {/* ═══════════ Finance cube ═══════════ */}
          {activeView === 'finance' && (
            <OgeCard
              header="Actuals against budget"
              subheader="Drag Cost center, Plant or Month from the filter area onto columns to slice further. Variance is calculated on the fly."
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
                data={GL_ENTRIES}
                fields={PIVOT_FIELDS}
                calculatedFields={PIVOT_CALC_FIELDS}
                rowHeaderLayout={pivotLayout}
                fieldPanel
                showRowTotals
                showColumnTotals
                showRowGrandTotals
                showColumnGrandTotals
                style={{ maxHeight: 600 }}
              />
            </OgeCard>
          )}

          {/* ═══════════ Ledger ═══════════ */}
          {activeView === 'ledger' && (
            <OgeCard
              header="Costing workbook"
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
                  messages={{ buttons: { selectSingle: 'Open an .xlsx workbook' }, dropZone: { labelSingle: 'Drop an Excel workbook here or {browse}' } }}
                />
              </div>
              <OgeSpreadsheet source={uploadedSheets[0] ?? workbookUrl} showFormulaBar showSheetTabs showStatusBar style={{ height: 560 }} />
            </OgeCard>
          )}

          {/* ═══════════ Approvals ═══════════ */}
          {activeView === 'approvals' && (
            <OgeCard
              header="Purchase approval"
              subheader="Requisitions above 25k go to the CFO; everything else to the plant manager. Live validation on every edit."
              headerActions={<OgeButton text="Zoom to fit" stylingMode="text" size="sm" onClick={() => bpmnRef.current?.zoomToFit()} />}
            >
              <OgeBpmnEditor ref={bpmnRef} showHeader showPropertiesPanel showMinimap allowModeToggle lint gridVisible snapEnabled style={{ height: 580 }} />
            </OgeCard>
          )}

          {/* ═══════════ Copilot ═══════════ */}
          {activeView === 'copilot' && (
            <>
              <section className="grid-2">
                <OgeCard header="Ask the plant" subheader="Stock, delivery and margin questions answered from your data">
                  <OgeChat
                    transport={aiTransport}
                    conversation={chatHistory}
                    onConversationChange={setChatHistory}
                    suggestions={['Which items are at stock-out risk?', 'How is OTIF by plant?', 'What is the margin this month?']}
                    style={{ height: 440 }}
                  />
                </OgeCard>
                <OgeCard header="Supplier intake" subheader="Paste a supplier card or an email signature; the form fills itself.">
                  <div className="smart-paste-bar">
                    <OgeSmartPaste ref={smartPasteRef} target={supplierFormRef} transport={aiTransport} mode="apply" />
                    <OgeButton text="Try a sample supplier" size="sm" stylingMode="outlined" onClick={() => void smartPasteRef.current?.paste(SMART_PASTE_SAMPLE)} />
                  </div>
                  <OgeForm ref={supplierFormRef} formData={supplierDraft} onFormDataChange={setSupplierDraft} colCount={2} items={supplierFormItems} />
                </OgeCard>
              </section>
              <OgeCard header="Inventory, in plain language" subheader="Describe the view you want; the grid filters, sorts and groups itself.">
                <OgeGridAssistant target={aiGridRef} transport={aiTransport} mode="apply" suggestions={['Items below reorder point', 'Group by warehouse', 'Finished goods by value']} />
                <div className="assistant-grid">
                  <OgeGrid ref={aiGridRef} ariaLabel="AI assisted inventory" data={items} keyField="id" columns={columns} groupPanel paging={{ pageSize: 8 }} />
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
            <a className="about-link" href="https://github.com/oge-ui/oge-ui/tree/main/examples/erp-suite" target="_blank" rel="noopener">
              View source
            </a>
            <a className="about-link" href="https://stackblitz.com/github/oge-ui/oge-ui/tree/main/examples/erp-suite" target="_blank" rel="noopener">
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
            <h2 className="about-title">Vantage ERP</h2>
            <p className="about-tagline">Inventory, procurement, production and finance for a three-plant manufacturer.</p>
            <div className="about-chips">
              <OgeChip label="React 19" size="sm" />
              <OgeChip label="OGE UI 1.1.6" size="sm" severity="accent" />
              <OgeChip label="All 7 Pro families" size="sm" />
            </div>
          </div>
        </div>
        <p className="about-text">
          Vantage ERP is a sample product built entirely with OGE UI for React: one shell, nine pages, and every commercial family next to the
          MIT grid, forms and overlays. Edits, drag and drop and exports all work on local sample data — explore freely.
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
        opened={itemModalOpen}
        onOpenedChange={setItemModalOpen}
        title="New stock item"
        width={620}
        renderFooter={({ close }) => (
          <div className="modal-actions">
            <OgeButton text="Cancel" stylingMode="text" onClick={() => close()} />
            <OgeButton text="Create item" severity="accent" onClick={() => void itemFormRef.current?.submit()} />
          </div>
        )}
      >
        <OgeForm
          ref={itemFormRef}
          formData={itemDraft}
          onFormDataChange={setItemDraft}
          colCountByScreen={{ xs: 1, sm: 2 }}
          showValidationSummary
          items={itemFormItems}
          onSubmitted={handleItemSubmitted}
        />
      </OgeModal>
    </div>
  );
}

export default App;

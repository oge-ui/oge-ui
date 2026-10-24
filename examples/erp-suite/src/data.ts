import type { OgeAiRequest, OgeAiResponse, OgeAiTransport, OgeChatMessage, OgeTimelineItem } from '@oge-ui/react';

/* ───────────────────────────── Reference data ───────────────────────────── */

export const PLANTS = ['İzmir Plant', 'Rotterdam DC', 'Austin Plant'] as const;
export type Plant = (typeof PLANTS)[number];

export const CATEGORIES = ['Raw material', 'Components', 'Packaging', 'Finished goods', 'Spare parts'] as const;
export type Category = (typeof CATEGORIES)[number];

export const WAREHOUSES = ['IZM-01', 'IZM-02', 'RTM-01', 'AUS-01', 'AUS-02'] as const;

export const BUYERS = ['Deniz Aksoy', 'Marta Visser', 'Noah Brennan', 'Yuki Mori'] as const;

export const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));
export const WAREHOUSE_OPTIONS = WAREHOUSES.map((w) => ({ value: w, label: w }));
export const STATUS_OPTIONS = [
  { value: 'In stock', label: 'In stock' },
  { value: 'Low', label: 'Low' },
  { value: 'Backorder', label: 'Backorder' },
  { value: 'Discontinued', label: 'Discontinued' },
];

/* ───────────────────────────── Inventory ───────────────────────────── */

export type StockStatus = 'In stock' | 'Low' | 'Backorder' | 'Discontinued';

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: Category;
  warehouse: (typeof WAREHOUSES)[number];
  supplier: string;
  onHand: number;
  reorderPoint: number;
  unitCost: number;
  value: number;
  leadTimeDays: number;
  status: StockStatus;
  updatedAt: Date;
}

const SUPPLIERS = [
  'Anatolia Steelworks',
  'Delta Polymers BV',
  'Keystone Fasteners',
  'Nordic Electronics',
  'Pacific Packaging Co.',
  'Sierra Precision',
  'Vega Components',
  'Zenith Bearings',
];

const NAMES: Record<Category, string[]> = {
  'Raw material': ['Cold-rolled steel coil', 'Aluminium billet 6061', 'ABS resin pellets', 'Copper wire 2.5 mm', 'Stainless sheet 304', 'Polycarbonate sheet'],
  Components: ['Stepper motor NEMA 17', 'Control board v3', 'Linear bearing 12 mm', 'Hex bolt M8×40', 'Hall sensor', 'Power supply 24 V', 'Gear set 1:20', 'Cable harness'],
  Packaging: ['Corrugated box L', 'Stretch film 500 mm', 'Pallet EUR', 'Foam insert', 'Label roll 100×50', 'Strapping band'],
  'Finished goods': ['Conveyor module CM-200', 'Robotic gripper RG-4', 'Sorting unit SU-12', 'Vision station VS-1', 'Control cabinet CC-8'],
  'Spare parts': ['Drive belt 800', 'Filter cartridge', 'Seal kit', 'Limit switch', 'Fuse 10 A', 'Encoder disc'],
};

/** Deterministic PRNG so every load renders the same data. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateInventory(count = 2000): InventoryItem[] {
  const rand = rng(20261024);
  const items: InventoryItem[] = [];
  for (let i = 0; i < count; i++) {
    const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
    const names = NAMES[category];
    const base = names[Math.floor(rand() * names.length)];
    const warehouse = WAREHOUSES[Math.floor(rand() * WAREHOUSES.length)];
    const reorderPoint = 20 + Math.floor(rand() * 180);
    const onHand = Math.floor(rand() * reorderPoint * 3);
    const unitCost = Math.round((1.5 + rand() * rand() * 90) * 100) / 100;
    const discontinued = rand() < 0.03;
    const status: StockStatus = discontinued ? 'Discontinued' : onHand === 0 ? 'Backorder' : onHand < reorderPoint ? 'Low' : 'In stock';
    items.push({
      id: i + 1,
      sku: `${category.slice(0, 2).toUpperCase()}-${String(10000 + i).slice(1)}`,
      name: `${base} ${String.fromCharCode(65 + Math.floor(rand() * 6))}${1 + Math.floor(rand() * 9)}`,
      category,
      warehouse,
      supplier: SUPPLIERS[Math.floor(rand() * SUPPLIERS.length)],
      onHand,
      reorderPoint,
      unitCost,
      value: Math.round(onHand * unitCost),
      leadTimeDays: 3 + Math.floor(rand() * 40),
      status,
      updatedAt: new Date(2026, 9, 1 + Math.floor(rand() * 23)),
    });
  }
  return items;
}

/* ───────────────────────────── Dashboard series ───────────────────────────── */

export interface MonthlyOpsPoint {
  month: string;
  revenue: number;
  cost: number;
  margin: number;
}

export const MONTHLY_OPS: readonly MonthlyOpsPoint[] = [
  { month: 'Jan', revenue: 1840, cost: 1310, margin: 28.8 },
  { month: 'Feb', revenue: 1920, cost: 1355, margin: 29.4 },
  { month: 'Mar', revenue: 2110, cost: 1470, margin: 30.3 },
  { month: 'Apr', revenue: 2060, cost: 1452, margin: 29.5 },
  { month: 'May', revenue: 2240, cost: 1540, margin: 31.3 },
  { month: 'Jun', revenue: 2380, cost: 1610, margin: 32.4 },
  { month: 'Jul', revenue: 2290, cost: 1580, margin: 31.0 },
  { month: 'Aug', revenue: 2460, cost: 1655, margin: 32.7 },
  { month: 'Sep', revenue: 2610, cost: 1720, margin: 34.1 },
  { month: 'Oct', revenue: 2735, cost: 1780, margin: 34.9 },
];

export const INVENTORY_BY_CATEGORY = [
  { category: 'Raw material', value: 1420 },
  { category: 'Components', value: 2180 },
  { category: 'Packaging', value: 310 },
  { category: 'Finished goods', value: 2960 },
  { category: 'Spare parts', value: 540 },
];

export const ORDER_FUNNEL = [
  { stage: 'Quotes', count: 1240 },
  { stage: 'Confirmed orders', count: 865 },
  { stage: 'In production', count: 612 },
  { stage: 'Shipped', count: 548 },
  { stage: 'Invoiced', count: 521 },
];

export const PLANT_OTIF = [
  { plant: 'İzmir Plant', otif: 96.4, trend: [93, 94, 95, 94, 96, 96, 97, 96, 96, 96] },
  { plant: 'Rotterdam DC', otif: 98.1, trend: [96, 97, 97, 98, 98, 97, 98, 98, 99, 98] },
  { plant: 'Austin Plant', otif: 91.7, trend: [89, 90, 92, 91, 90, 92, 93, 91, 92, 92] },
];

export const ACTIVITY: readonly OgeTimelineItem[] = [
  { key: 1, title: 'PO-20461 received at RTM-01', description: '48 pallets of corrugated packaging booked in; three PRs closed.', time: new Date(2026, 9, 24, 9, 12), severity: 'success' },
  { key: 2, title: 'Line B changeover complete', description: 'Sorting unit SU-12 batch 2026-41 started 25 minutes early.', time: new Date(2026, 9, 24, 8, 40), severity: 'accent' },
  { key: 3, title: 'Stock-out risk: Hall sensor', description: '11 units on hand against a reorder point of 60; a requisition was raised automatically.', time: new Date(2026, 9, 23, 17, 5), severity: 'warning' },
  { key: 4, title: 'Month-end close: cost centers locked', description: 'September actuals posted; budget variance report is ready in the finance cube.', time: new Date(2026, 9, 23, 11, 30) },
];

/* ───────────────────────────── Procurement board ───────────────────────────── */

export type RequisitionStatus = 'requested' | 'approved' | 'ordered' | 'receiving' | 'closed';

export interface Requisition {
  id: number;
  number: string;
  status: RequisitionStatus;
  title: string;
  summary: string;
  plant: Plant;
  supplier: string;
  buyer: string;
  amount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate: Date;
  tags: string[];
  checklist: { text: string; done: boolean }[];
}

export interface RequisitionColumn {
  key: RequisitionStatus;
  title: string;
  wipLimit?: number;
}

export const REQUISITION_COLUMNS: readonly RequisitionColumn[] = [
  { key: 'requested', title: 'Requested' },
  { key: 'approved', title: 'Approved', wipLimit: 6 },
  { key: 'ordered', title: 'Ordered', wipLimit: 6 },
  { key: 'receiving', title: 'Receiving', wipLimit: 4 },
  { key: 'closed', title: 'Closed' },
];

export const REQUISITIONS: Requisition[] = [
  { id: 101, number: 'PR-1041', status: 'closed', title: 'Steel coil for Q4 conveyor run', summary: '12 t cold-rolled coil, 1.5 mm.', plant: 'İzmir Plant', supplier: 'Anatolia Steelworks', buyer: 'Deniz Aksoy', amount: 86400, priority: 'high', dueDate: new Date(2026, 9, 10), tags: ['Raw material'], checklist: [{ text: 'Three quotes compared', done: true }, { text: 'Goods receipt posted', done: true }] },
  { id: 102, number: 'PR-1048', status: 'receiving', title: 'NEMA 17 stepper motors', summary: '1,200 units for gripper RG-4 batch.', plant: 'İzmir Plant', supplier: 'Nordic Electronics', buyer: 'Yuki Mori', amount: 38400, priority: 'critical', dueDate: new Date(2026, 9, 26), tags: ['Components'], checklist: [{ text: 'ASN received', done: true }, { text: 'Incoming inspection', done: false }] },
  { id: 103, number: 'PR-1052', status: 'ordered', title: 'Control boards v3', summary: '600 boards, conformal coated.', plant: 'İzmir Plant', supplier: 'Vega Components', buyer: 'Yuki Mori', amount: 54000, priority: 'high', dueDate: new Date(2026, 10, 3), tags: ['Components', 'Electronics'], checklist: [{ text: 'PO confirmed', done: true }, { text: 'Firmware version agreed', done: false }] },
  { id: 104, number: 'PR-1057', status: 'approved', title: 'ABS resin pellets', summary: '8 t natural ABS for housings.', plant: 'İzmir Plant', supplier: 'Delta Polymers BV', buyer: 'Deniz Aksoy', amount: 21600, priority: 'medium', dueDate: new Date(2026, 10, 7), tags: ['Raw material'], checklist: [] },
  { id: 105, number: 'PR-1060', status: 'requested', title: 'Hall sensors — stock-out risk', summary: 'Auto-raised: 11 on hand vs reorder point 60.', plant: 'İzmir Plant', supplier: 'Nordic Electronics', buyer: 'Yuki Mori', amount: 4200, priority: 'critical', dueDate: new Date(2026, 9, 28), tags: ['Components', 'Auto'], checklist: [{ text: 'Buyer review', done: false }] },
  { id: 106, number: 'PR-1061', status: 'requested', title: 'Gear sets 1:20', summary: '300 sets for conveyor module.', plant: 'İzmir Plant', supplier: 'Sierra Precision', buyer: 'Deniz Aksoy', amount: 16500, priority: 'medium', dueDate: new Date(2026, 10, 12), tags: ['Components'], checklist: [] },

  { id: 201, number: 'PR-1043', status: 'closed', title: 'EUR pallets', summary: '800 pallets, heat treated.', plant: 'Rotterdam DC', supplier: 'Pacific Packaging Co.', buyer: 'Marta Visser', amount: 9600, priority: 'low', dueDate: new Date(2026, 9, 8), tags: ['Packaging'], checklist: [{ text: 'Goods receipt posted', done: true }] },
  { id: 202, number: 'PR-1049', status: 'receiving', title: 'Corrugated boxes L', summary: '48 pallets, printed.', plant: 'Rotterdam DC', supplier: 'Pacific Packaging Co.', buyer: 'Marta Visser', amount: 12800, priority: 'medium', dueDate: new Date(2026, 9, 24), tags: ['Packaging'], checklist: [{ text: 'Dock slot booked', done: true }, { text: 'Count verified', done: false }] },
  { id: 203, number: 'PR-1054', status: 'ordered', title: 'Stretch film 500 mm', summary: '2,400 rolls for the peak season.', plant: 'Rotterdam DC', supplier: 'Pacific Packaging Co.', buyer: 'Marta Visser', amount: 7900, priority: 'low', dueDate: new Date(2026, 10, 5), tags: ['Packaging'], checklist: [] },
  { id: 204, number: 'PR-1058', status: 'approved', title: 'Forklift spare kit', summary: 'Annual service kits for 6 trucks.', plant: 'Rotterdam DC', supplier: 'Zenith Bearings', buyer: 'Marta Visser', amount: 5400, priority: 'medium', dueDate: new Date(2026, 10, 14), tags: ['Spare parts'], checklist: [{ text: 'Service calendar aligned', done: true }] },
  { id: 205, number: 'PR-1062', status: 'requested', title: 'Label rolls 100×50', summary: 'Thermal labels for the new scanner line.', plant: 'Rotterdam DC', supplier: 'Pacific Packaging Co.', buyer: 'Marta Visser', amount: 2100, priority: 'low', dueDate: new Date(2026, 10, 18), tags: ['Packaging'], checklist: [] },

  { id: 301, number: 'PR-1045', status: 'closed', title: 'Aluminium billets', summary: '6 t 6061 for machining cell.', plant: 'Austin Plant', supplier: 'Anatolia Steelworks', buyer: 'Noah Brennan', amount: 31200, priority: 'high', dueDate: new Date(2026, 9, 12), tags: ['Raw material'], checklist: [{ text: 'Mill certificates filed', done: true }] },
  { id: 302, number: 'PR-1050', status: 'ordered', title: 'Linear bearings 12 mm', summary: '2,000 units, sealed.', plant: 'Austin Plant', supplier: 'Zenith Bearings', buyer: 'Noah Brennan', amount: 18000, priority: 'high', dueDate: new Date(2026, 9, 30), tags: ['Components'], checklist: [{ text: 'PO confirmed', done: true }] },
  { id: 303, number: 'PR-1055', status: 'approved', title: 'Power supplies 24 V', summary: '400 units for control cabinets.', plant: 'Austin Plant', supplier: 'Nordic Electronics', buyer: 'Noah Brennan', amount: 26000, priority: 'medium', dueDate: new Date(2026, 10, 9), tags: ['Components', 'Electronics'], checklist: [{ text: 'UL listing checked', done: false }] },
  { id: 304, number: 'PR-1059', status: 'approved', title: 'Hex bolts M8×40', summary: '50,000 pcs zinc plated.', plant: 'Austin Plant', supplier: 'Keystone Fasteners', buyer: 'Noah Brennan', amount: 6100, priority: 'low', dueDate: new Date(2026, 10, 11), tags: ['Components'], checklist: [] },
  { id: 305, number: 'PR-1063', status: 'requested', title: 'Vision station cameras', summary: '12 industrial cameras for VS-1.', plant: 'Austin Plant', supplier: 'Vega Components', buyer: 'Noah Brennan', amount: 43800, priority: 'high', dueDate: new Date(2026, 10, 20), tags: ['Components', 'Capex'], checklist: [{ text: 'Capex approval', done: false }, { text: 'Lens spec agreed', done: false }] },
  { id: 306, number: 'PR-1064', status: 'requested', title: 'Seal kits', summary: 'Preventive maintenance stock.', plant: 'Austin Plant', supplier: 'Sierra Precision', buyer: 'Noah Brennan', amount: 1900, priority: 'low', dueDate: new Date(2026, 11, 2), tags: ['Spare parts'], checklist: [] },
];

/* ───────────────────────────── Production plan (Gantt) ───────────────────────────── */

export interface WorkOrder {
  id: number;
  parentId: number | null;
  title: string;
  start: Date;
  end: Date;
  progress: number;
  resourceId?: number[];
  color?: string;
}

export const PRODUCTION_RESOURCES = [
  { id: 1, text: 'Line A · Conveyors', color: '#0f766e' },
  { id: 2, text: 'Line B · Grippers', color: '#2563eb' },
  { id: 3, text: 'Line C · Cabinets', color: '#d97706' },
  { id: 4, text: 'Machining cell', color: '#7c3aed' },
];

export const WORK_ORDERS: WorkOrder[] = [
  { id: 1, parentId: null, title: 'Conveyor module CM-200 · batch 2026-40', start: new Date(2026, 9, 5), end: new Date(2026, 9, 23), progress: 100 },
  { id: 2, parentId: 1, title: 'Frame welding', start: new Date(2026, 9, 5), end: new Date(2026, 9, 10), progress: 100, resourceId: [4] },
  { id: 3, parentId: 1, title: 'Drive assembly', start: new Date(2026, 9, 11), end: new Date(2026, 9, 17), progress: 100, resourceId: [1] },
  { id: 4, parentId: 1, title: 'Final test and packing', start: new Date(2026, 9, 18), end: new Date(2026, 9, 23), progress: 100, resourceId: [1] },

  { id: 5, parentId: null, title: 'Robotic gripper RG-4 · batch 2026-42', start: new Date(2026, 9, 19), end: new Date(2026, 10, 13), progress: 38 },
  { id: 6, parentId: 5, title: 'Finger machining', start: new Date(2026, 9, 19), end: new Date(2026, 9, 27), progress: 80, resourceId: [4] },
  { id: 7, parentId: 5, title: 'Motor and sensor fit', start: new Date(2026, 9, 28), end: new Date(2026, 10, 5), progress: 10, resourceId: [2] },
  { id: 8, parentId: 5, title: 'Calibration', start: new Date(2026, 10, 6), end: new Date(2026, 10, 10), progress: 0, resourceId: [2] },
  { id: 9, parentId: 5, title: 'Quality release', start: new Date(2026, 10, 11), end: new Date(2026, 10, 13), progress: 0, resourceId: [2] },

  { id: 10, parentId: null, title: 'Control cabinet CC-8 · batch 2026-43', start: new Date(2026, 9, 26), end: new Date(2026, 10, 20), progress: 5 },
  { id: 11, parentId: 10, title: 'Enclosure prep', start: new Date(2026, 9, 26), end: new Date(2026, 9, 30), progress: 30, resourceId: [3] },
  { id: 12, parentId: 10, title: 'Wiring', start: new Date(2026, 10, 2), end: new Date(2026, 10, 12), progress: 0, resourceId: [3] },
  { id: 13, parentId: 10, title: 'Power-on test', start: new Date(2026, 10, 13), end: new Date(2026, 10, 17), progress: 0, resourceId: [3] },
  { id: 14, parentId: 10, title: 'Ship to Rotterdam DC', start: new Date(2026, 10, 18), end: new Date(2026, 10, 20), progress: 0, resourceId: [3] },
];

export const WORK_ORDER_DEPS = [
  { id: 1, predecessorId: 2, successorId: 3, type: 'FS' as const },
  { id: 2, predecessorId: 3, successorId: 4, type: 'FS' as const },
  { id: 3, predecessorId: 6, successorId: 7, type: 'FS' as const },
  { id: 4, predecessorId: 7, successorId: 8, type: 'FS' as const },
  { id: 5, predecessorId: 8, successorId: 9, type: 'FS' as const },
  { id: 6, predecessorId: 11, successorId: 12, type: 'FS' as const },
  { id: 7, predecessorId: 12, successorId: 13, type: 'FS' as const },
  { id: 8, predecessorId: 13, successorId: 14, type: 'FS' as const },
];

/* ───────────────────────────── Shifts & deliveries (Scheduler) ───────────────────────────── */

export interface ShiftAppointment {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  lineId: number;
  description: string;
  location: string;
}

export const LINE_RESOURCES = [
  {
    fieldExpr: 'lineId',
    label: 'Line',
    useColorAsDefault: true,
    items: [
      { id: 1, text: 'Line A · Conveyors', color: '#0f766e' },
      { id: 2, text: 'Line B · Grippers', color: '#2563eb' },
      { id: 3, text: 'Line C · Cabinets', color: '#d97706' },
    ],
  },
];

export const SHIFTS: ShiftAppointment[] = [
  { id: 1, text: 'Early shift · CM-200 packing', startDate: new Date(2026, 9, 19, 6, 0), endDate: new Date(2026, 9, 19, 14, 0), lineId: 1, location: 'İzmir Plant', description: 'Crew of 6, final test and packing of batch 2026-40.' },
  { id: 2, text: 'Late shift · CM-200 packing', startDate: new Date(2026, 9, 19, 14, 0), endDate: new Date(2026, 9, 19, 22, 0), lineId: 1, location: 'İzmir Plant', description: 'Crew of 5.' },
  { id: 3, text: 'Early shift · RG-4 finger machining', startDate: new Date(2026, 9, 20, 6, 0), endDate: new Date(2026, 9, 20, 14, 0), lineId: 2, location: 'İzmir Plant', description: 'Machining cell feeding Line B.' },
  { id: 4, text: 'Inbound · Nordic Electronics motors', startDate: new Date(2026, 9, 21, 9, 0), endDate: new Date(2026, 9, 21, 10, 30), lineId: 2, location: 'Dock 3', description: 'ASN 1,200 units; incoming inspection on arrival.' },
  { id: 5, text: 'Maintenance window · Line C', startDate: new Date(2026, 9, 21, 13, 0), endDate: new Date(2026, 9, 21, 17, 0), lineId: 3, location: 'Austin Plant', description: 'Quarterly service, no production.' },
  { id: 6, text: 'Early shift · enclosure prep', startDate: new Date(2026, 9, 22, 6, 0), endDate: new Date(2026, 9, 22, 14, 0), lineId: 3, location: 'Austin Plant', description: 'Batch 2026-43 starts.' },
  { id: 7, text: 'Outbound · CM-200 to Rotterdam DC', startDate: new Date(2026, 9, 23, 8, 0), endDate: new Date(2026, 9, 23, 9, 30), lineId: 1, location: 'Dock 1', description: '2 trucks, 18 modules.' },
  { id: 8, text: 'Late shift · RG-4 motor fit', startDate: new Date(2026, 9, 23, 14, 0), endDate: new Date(2026, 9, 23, 22, 0), lineId: 2, location: 'İzmir Plant', description: 'Crew of 4.' },
  { id: 9, text: 'Inbound · corrugated boxes', startDate: new Date(2026, 9, 24, 7, 30), endDate: new Date(2026, 9, 24, 9, 0), lineId: 1, location: 'RTM-01 Dock 2', description: '48 pallets.' },
];

/* ───────────────────────────── Finance cube (Pivot) ───────────────────────────── */

export interface GlEntry {
  id: number;
  accountGroup: 'Revenue' | 'Cost of goods sold' | 'Operating expense' | 'Capital expenditure';
  account: string;
  costCenter: 'Production' | 'Logistics' | 'Sales' | 'R&D' | 'Administration';
  plant: Plant;
  date: string;
  actual: number;
  budget: number;
}

const GL_SEED: readonly [GlEntry['accountGroup'], string, GlEntry['costCenter'], number, number][] = [
  ['Revenue', 'Product sales', 'Sales', 2735000, 2600000],
  ['Revenue', 'Service contracts', 'Sales', 412000, 390000],
  ['Cost of goods sold', 'Materials', 'Production', 1120000, 1080000],
  ['Cost of goods sold', 'Direct labour', 'Production', 486000, 470000],
  ['Cost of goods sold', 'Freight', 'Logistics', 174000, 160000],
  ['Operating expense', 'Salaries', 'Administration', 298000, 300000],
  ['Operating expense', 'Engineering', 'R&D', 212000, 220000],
  ['Operating expense', 'Warehousing', 'Logistics', 96000, 90000],
  ['Operating expense', 'Marketing', 'Sales', 64000, 75000],
  ['Capital expenditure', 'Vision station cameras', 'R&D', 43800, 50000],
  ['Capital expenditure', 'Forklift fleet', 'Logistics', 28000, 30000],
];

export const GL_ENTRIES: readonly GlEntry[] = (() => {
  const rand = rng(77);
  const rows: GlEntry[] = [];
  let id = 1;
  const months = ['2026-07-31', '2026-08-31', '2026-09-30', '2026-10-31'];
  for (const plant of PLANTS) {
    const share = plant === 'İzmir Plant' ? 0.45 : plant === 'Rotterdam DC' ? 0.2 : 0.35;
    for (const date of months) {
      for (const [accountGroup, account, costCenter, actual, budget] of GL_SEED) {
        const wobble = 0.9 + rand() * 0.2;
        rows.push({
          id: id++,
          accountGroup,
          account,
          costCenter,
          plant,
          date,
          actual: Math.round((actual * share * wobble) / 4),
          budget: Math.round((budget * share) / 4),
        });
      }
    }
  }
  return rows;
})();

/* ───────────────────────────── Approval workflow (BPMN) ───────────────────────────── */

export const PURCHASE_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_VantagePurchase"
  targetNamespace="http://ogeui.com/schema/bpmn">
  <bpmn:process id="Process_PurchaseApproval" name="Purchase requisition approval" isExecutable="true">
    <bpmn:startEvent id="Start_PR" name="Requisition raised">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_Budget" name="Check budget and stock">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:exclusiveGateway id="Gw_Amount" name="Amount &gt; 25k?" default="Flow_Small">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_Small</bpmn:outgoing>
      <bpmn:outgoing>Flow_Large</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="Task_Manager" name="Plant manager approval">
      <bpmn:incoming>Flow_Small</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_CFO" name="CFO approval">
      <bpmn:incoming>Flow_Large</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="Task_PO" name="Create purchase order">
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:incoming>Flow_5</bpmn:incoming>
      <bpmn:outgoing>Flow_6</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="End_Ordered" name="Supplier notified">
      <bpmn:incoming>Flow_6</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_PR" targetRef="Task_Budget" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_Budget" targetRef="Gw_Amount" />
    <bpmn:sequenceFlow id="Flow_Small" name="No" sourceRef="Gw_Amount" targetRef="Task_Manager" />
    <bpmn:sequenceFlow id="Flow_Large" name="Yes" sourceRef="Gw_Amount" targetRef="Task_CFO">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">\${amount &gt; 25000}</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_Manager" targetRef="Task_PO" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_CFO" targetRef="Task_PO" />
    <bpmn:sequenceFlow id="Flow_6" sourceRef="Task_PO" targetRef="End_Ordered" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_PurchaseApproval">
      <bpmndi:BPMNShape id="Start_PR_di" bpmnElement="Start_PR">
        <dc:Bounds x="152" y="142" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Budget_di" bpmnElement="Task_Budget">
        <dc:Bounds x="240" y="120" width="120" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gw_Amount_di" bpmnElement="Gw_Amount" isMarkerVisible="true">
        <dc:Bounds x="415" y="135" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Manager_di" bpmnElement="Task_Manager">
        <dc:Bounds x="520" y="40" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_CFO_di" bpmnElement="Task_CFO">
        <dc:Bounds x="520" y="200" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_PO_di" bpmnElement="Task_PO">
        <dc:Bounds x="710" y="120" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Ordered_di" bpmnElement="End_Ordered">
        <dc:Bounds x="902" y="142" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="160" />
        <di:waypoint x="240" y="160" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="360" y="160" />
        <di:waypoint x="415" y="160" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Small_di" bpmnElement="Flow_Small">
        <di:waypoint x="440" y="135" />
        <di:waypoint x="440" y="80" />
        <di:waypoint x="520" y="80" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Large_di" bpmnElement="Flow_Large">
        <di:waypoint x="440" y="185" />
        <di:waypoint x="440" y="240" />
        <di:waypoint x="520" y="240" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="650" y="80" />
        <di:waypoint x="775" y="80" />
        <di:waypoint x="775" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="650" y="240" />
        <di:waypoint x="775" y="240" />
        <di:waypoint x="775" y="200" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6">
        <di:waypoint x="840" y="160" />
        <di:waypoint x="902" y="160" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

/* ───────────────────────────── Copilot ───────────────────────────── */

export const INITIAL_COPILOT_MESSAGES: readonly OgeChatMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    text: 'Welcome to the Vantage copilot. Ask about stock-out risks, open requisitions, on-time delivery by plant, or margin this month — or let the grid assistant shape the inventory list for you.',
  },
];

export const SMART_PASTE_SAMPLE = `Supplier: Helios Drives GmbH
Contact: Lena Bauer
Email: lena.bauer@helios-drives.example
Category: Components
Payment terms: Net 45
Lead time: 21 days
Plant: İzmir Plant`;

export function createVantageAiTransport(): OgeAiTransport {
  return {
    async complete(request: OgeAiRequest): Promise<OgeAiResponse> {
      await new Promise((resolve) => setTimeout(resolve, 240));
      const lastMsg = request.messages[request.messages.length - 1]?.content?.toLowerCase() ?? '';

      if (request.feature === 'grid-assistant') {
        if (lastMsg.includes('low') || lastMsg.includes('reorder') || lastMsg.includes('stock-out')) {
          return {
            text: JSON.stringify({
              action: 'apply',
              summary: 'Showing items below their reorder point, lowest stock first',
              filter: ['status', '=', 'Low'],
              sort: [{ field: 'onHand', direction: 'asc' }],
            }),
          };
        }
        if (lastMsg.includes('warehouse') || lastMsg.includes('group')) {
          return {
            text: JSON.stringify({
              action: 'apply',
              summary: 'Grouped the inventory by warehouse, highest value first',
              group: ['warehouse'],
              sort: [{ field: 'value', direction: 'desc' }],
            }),
          };
        }
        if (lastMsg.includes('finished')) {
          return {
            text: JSON.stringify({
              action: 'apply',
              summary: 'Filtered to finished goods sorted by stock value',
              filter: ['category', '=', 'Finished goods'],
              sort: [{ field: 'value', direction: 'desc' }],
            }),
          };
        }
        return {
          text: JSON.stringify({
            action: 'apply',
            summary: 'Sorted the inventory by stock value, highest first',
            sort: [{ field: 'value', direction: 'desc' }],
          }),
        };
      }

      if (request.feature === 'smart-paste') {
        return {
          text: JSON.stringify({
            action: 'fill',
            values: {
              name: 'Helios Drives GmbH',
              contact: 'Lena Bauer',
              email: 'lena.bauer@helios-drives.example',
              category: 'Components',
              paymentTerms: 'Net 45',
              leadTimeDays: 21,
              plant: 'İzmir Plant',
            },
          }),
        };
      }

      if (lastMsg.includes('stock') || lastMsg.includes('reorder')) {
        return {
          text: 'Three items are at stock-out risk this week: Hall sensors (11 on hand vs 60), Control board v3 (ordered, due Nov 3) and Linear bearing 12 mm (ordered, due Oct 30). PR-1060 was raised automatically for the sensors and is waiting for buyer review.',
        };
      }
      if (lastMsg.includes('otif') || lastMsg.includes('delivery') || lastMsg.includes('plant')) {
        return {
          text: 'On-time-in-full for October: Rotterdam DC 98.1%, İzmir Plant 96.4%, Austin Plant 91.7%. Austin is below the 95% target because of the Line C maintenance window; batch 2026-43 is scheduled to recover the slip by Nov 20.',
        };
      }
      if (lastMsg.includes('margin') || lastMsg.includes('revenue')) {
        return {
          text: 'October revenue is $2.735M against $1.78M cost of goods — a 34.9% gross margin, up 0.8 points on September. Materials are 3.7% over budget; freight is 8.8% over, driven by the peak-season packaging inbound.',
        };
      }
      return {
        text: 'Vantage snapshot: 865 confirmed orders, 612 in production, $7.4M inventory at cost across five warehouses, 18 open requisitions ($0.33M) and three production batches in flight.',
      };
    },
  };
}

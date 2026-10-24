import type { OgeTimelineItem } from 'oge-ui';
import type { OgeAiRequest, OgeAiResponse, OgeAiTransport, OgeChatMessage } from '@oge-ui/ai';
import type { OgeKanbanColumn } from '@oge-ui/kanban';
import type { OgeSchedulerResource } from '@oge-ui/scheduler';
import type { OgeGanttResource } from '@oge-ui/gantt';

export interface SalesOrder {
  id: number;
  orderNumber: string;
  orderDate: Date;
  customer: string;
  company: string;
  region: 'North America' | 'EMEA' | 'APAC' | 'LATAM';
  category:
    | 'Cloud Compute'
    | 'Vector Storage'
    | 'Edge Security'
    | 'Analytics Suite'
    | 'AI Inference';
  channel: 'Enterprise Direct' | 'Self-Serve' | 'Partner Marketplace';
  unitPrice: number;
  quantity: number;
  total: number;
  status: 'Fulfilled' | 'Processing' | 'Invoiced' | 'Refunded';
}

export interface CustomerSummary {
  id: string;
  customer: string;
  company: string;
  region: SalesOrder['region'];
  tier: 'Enterprise' | 'Scale' | 'Growth';
  healthScore: number;
  ordersCount: number;
  unitsPurchased: number;
  totalSpent: number;
  avgOrderValue: number;
  lastOrderDate: Date;
}

export type DealStage =
  | 'Discovery'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export interface CrmDeal {
  id: number;
  dealCode: string;
  title: string;
  company: string;
  contact: string;
  owner: string;
  region: SalesOrder['region'];
  stage: DealStage;
  probability: number;
  amount: number;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  closeDate: Date;
}

export interface CrmLead {
  id: number;
  name: string;
  company: string;
  email: string;
  source: 'Inbound Demo' | 'Partner Referral' | 'Cloud Summit' | 'Executive Webinar';
  region: SalesOrder['region'];
  score: number;
  status: 'New' | 'Qualified' | 'Contacted';
  estimatedValue: number;
}

export interface CrmTask {
  id: number;
  title: string;
  account: string;
  owner: string;
  dueDate: Date;
  priority: 'High' | 'Medium' | 'Low';
  type: 'Call' | 'Proposal' | 'Security Review' | 'QBR';
  completed: boolean;
}

export interface SalesRepQuota {
  id: string;
  name: string;
  role: string;
  region: SalesOrder['region'];
  quota: number;
  closedWon: number;
  pipeline: number;
  dealsWon: number;
  attainment: number;
  status: 'online' | 'away' | 'busy';
  trend: number[];
}

export interface MonthlyRevenuePoint {
  month: string;
  arr: number;
  expansion: number;
  target: number;
}

export interface RegionSharePoint {
  region: string;
  revenue: number;
}

export interface FunnelStagePoint {
  stage: string;
  value: number;
}

export interface CrmAppointment {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  ownerId: string;
  location: string;
  description: string;
  allDay?: boolean;
}

export interface CrmGanttTask {
  id: number;
  parentId?: number | null;
  title: string;
  start: Date;
  end: Date;
  progress: number;
  resourceId?: string;
}

export interface CrmGanttDependency {
  id: number;
  predecessorId: number;
  successorId: number;
  type: 'FS' | 'SS' | 'FF' | 'SF';
}

export const REGIONS: readonly SalesOrder['region'][] = [
  'North America',
  'EMEA',
  'APAC',
  'LATAM',
];

export const DEAL_STAGES: readonly DealStage[] = [
  'Discovery',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

export const KANBAN_COLUMNS: readonly OgeKanbanColumn[] = [
  { key: 'Discovery', title: 'Discovery', wipLimit: 5, color: '#6366f1' },
  { key: 'Proposal', title: 'Technical Proposal', wipLimit: 5, color: '#0ea5e9' },
  { key: 'Negotiation', title: 'Legal & Redlines', wipLimit: 4, color: '#f59e0b' },
  { key: 'Closed Won', title: 'Closed Won', wipLimit: 8, color: '#10b981' },
];

export const MONTHLY_REVENUE_SERIES: readonly MonthlyRevenuePoint[] = [
  { month: 'Jan', arr: 420, expansion: 85, target: 400 },
  { month: 'Feb', arr: 465, expansion: 94, target: 440 },
  { month: 'Mar', arr: 510, expansion: 112, target: 490 },
  { month: 'Apr', arr: 548, expansion: 120, target: 530 },
  { month: 'May', arr: 595, expansion: 138, target: 575 },
  { month: 'Jun', arr: 640, expansion: 152, target: 615 },
  { month: 'Jul', arr: 682, expansion: 165, target: 660 },
  { month: 'Aug', arr: 735, expansion: 184, target: 705 },
  { month: 'Sep', arr: 790, expansion: 205, target: 755 },
  { month: 'Oct', arr: 845, expansion: 228, target: 810 },
];

export const REGION_SHARE_DATA: readonly RegionSharePoint[] = [
  { region: 'North America', revenue: 3420 },
  { region: 'EMEA', revenue: 2890 },
  { region: 'APAC', revenue: 2150 },
  { region: 'LATAM', revenue: 980 },
];

export const PIPELINE_FUNNEL_DATA: readonly FunnelStagePoint[] = [
  { stage: 'Qualified Inbound', value: 4800 },
  { stage: 'Architecture PoC', value: 3450 },
  { stage: 'Commercial Proposal', value: 2390 },
  { stage: 'Security & Legal', value: 1620 },
  { stage: 'Closed Won ARR', value: 1180 },
];

const CUSTOMERS: readonly {
  customer: string;
  company: string;
  region: SalesOrder['region'];
  tier: CustomerSummary['tier'];
  healthScore: number;
}[] = [
  { customer: 'Elena Rostova', company: 'Vespera Orbital Lab', region: 'EMEA', tier: 'Enterprise', healthScore: 94 },
  { customer: 'Marcus Vance', company: 'Helios Gridworks', region: 'North America', tier: 'Enterprise', healthScore: 89 },
  { customer: 'Sora Takahashi', company: 'Kestrel Robotics', region: 'APAC', tier: 'Enterprise', healthScore: 96 },
  { customer: 'Camila Montoya', company: 'Solstice BioSystems', region: 'LATAM', tier: 'Scale', healthScore: 82 },
  { customer: 'Lukas Lindqvist', company: 'Nordic Fjord Energy', region: 'EMEA', tier: 'Enterprise', healthScore: 91 },
  { customer: 'Priya Nair', company: 'Meridian Telemetry', region: 'APAC', tier: 'Scale', healthScore: 87 },
  { customer: 'Devon Brooks', company: 'Cobalt Cloud Foundry', region: 'North America', tier: 'Enterprise', healthScore: 93 },
  { customer: 'Amina Al-Mansoor', company: 'Zephyr Logistics Co.', region: 'EMEA', tier: 'Scale', healthScore: 78 },
  { customer: 'Mateo Silva', company: 'Andes Photon Dynamics', region: 'LATAM', tier: 'Growth', healthScore: 74 },
  { customer: 'Hannah Sterling', company: 'Borealis Quantum Systems', region: 'North America', tier: 'Enterprise', healthScore: 95 },
  { customer: 'Kenji Watanabe', company: 'Aether Wave Media', region: 'APAC', tier: 'Scale', healthScore: 84 },
  { customer: 'Clara Moreau', company: 'Lumiere Synth Labs', region: 'EMEA', tier: 'Growth', healthScore: 79 },
  { customer: 'Gabriel Costa', company: 'Veridian AgriTech', region: 'LATAM', tier: 'Growth', healthScore: 71 },
  { customer: 'Noah Patel', company: 'Stratos Harbor Networks', region: 'North America', tier: 'Scale', healthScore: 88 },
  { customer: 'Mei-Ling Zhou', company: 'Cinder Peak Semiconductor', region: 'APAC', tier: 'Enterprise', healthScore: 92 },
  { customer: 'Freja Holm', company: 'Skagen Marine Autonomy', region: 'EMEA', tier: 'Scale', healthScore: 85 },
  { customer: 'Diego Herrera', company: 'Pampa Solar Analytics', region: 'LATAM', tier: 'Growth', healthScore: 76 },
  { customer: 'Tessa Callahan', company: 'Redwood Signal Corp', region: 'North America', tier: 'Scale', healthScore: 83 },
  { customer: 'Arjun Mehta', company: 'Vanguard FinOps Guild', region: 'APAC', tier: 'Enterprise', healthScore: 90 },
  { customer: 'Zoe Papadopoulos', company: 'Aegean Fleet Systems', region: 'EMEA', tier: 'Scale', healthScore: 86 },
];

const CATEGORIES: readonly { name: SalesOrder['category']; basePrice: number }[] = [
  { name: 'Cloud Compute', basePrice: 420 },
  { name: 'Vector Storage', basePrice: 280 },
  { name: 'Edge Security', basePrice: 540 },
  { name: 'Analytics Suite', basePrice: 690 },
  { name: 'AI Inference', basePrice: 890 },
];

const CHANNELS: readonly SalesOrder['channel'][] = [
  'Enterprise Direct',
  'Self-Serve',
  'Partner Marketplace',
];

const STATUSES: readonly SalesOrder['status'][] = [
  'Fulfilled',
  'Fulfilled',
  'Fulfilled',
  'Invoiced',
  'Processing',
  'Refunded',
];

export function generateOrders(count = 10_000): SalesOrder[] {
  const now = new Date();
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0).getTime();
  const dayMs = 86_400_000;
  const orders: SalesOrder[] = new Array(count);

  let seed = 73856093;
  const nextRand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const id = i + 1;
    const account = CUSTOMERS[Math.floor(nextRand() * CUSTOMERS.length)];
    const cat = CATEGORIES[Math.floor(nextRand() * CATEGORIES.length)];
    const channel = CHANNELS[Math.floor(nextRand() * CHANNELS.length)];
    const status = STATUSES[Math.floor(nextRand() * STATUSES.length)];

    const daysAgo = Math.floor(Math.pow(nextRand(), 1.35) * 180);
    const orderDate = new Date(todayNoon - daysAgo * dayMs);

    const quantity = 1 + Math.floor(nextRand() * 24);
    const tierVariance = 0.85 + Math.round(nextRand() * 35) / 100;
    const unitPrice = Math.round(cat.basePrice * tierVariance);
    const total = unitPrice * quantity;

    orders[i] = {
      id,
      orderNumber: `ORD-${String(100000 + id)}`,
      orderDate,
      customer: account.customer,
      company: account.company,
      region: account.region,
      category: cat.name,
      channel,
      unitPrice,
      quantity,
      total,
      status,
    };
  }

  return orders;
}

export function buildCustomerSummaries(orders: readonly SalesOrder[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();
  const metaMap = new Map(CUSTOMERS.map((c) => [c.company, c]));

  for (const order of orders) {
    const existing = map.get(order.company);
    const meta = metaMap.get(order.company);
    if (!existing) {
      map.set(order.company, {
        id: order.company,
        customer: order.customer,
        company: order.company,
        region: order.region,
        tier: meta?.tier ?? 'Scale',
        healthScore: meta?.healthScore ?? 85,
        ordersCount: 1,
        unitsPurchased: order.quantity,
        totalSpent: order.total,
        avgOrderValue: order.total,
        lastOrderDate: order.orderDate,
      });
    } else {
      existing.ordersCount += 1;
      existing.unitsPurchased += order.quantity;
      existing.totalSpent += order.total;
      existing.avgOrderValue = Math.round(existing.totalSpent / existing.ordersCount);
      if (order.orderDate > existing.lastOrderDate) {
        existing.lastOrderDate = order.orderDate;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}

export const INITIAL_DEALS: CrmDeal[] = [
  {
    id: 1,
    dealCode: 'DL-401',
    title: 'Multi-Region AI Inference Cluster',
    company: 'Vespera Orbital Lab',
    contact: 'Elena Rostova',
    owner: 'Aylin Kaya',
    region: 'EMEA',
    stage: 'Negotiation',
    probability: 80,
    amount: 185000,
    priority: 'high',
    tags: ['AI Cluster', 'EMEA'],
    closeDate: new Date(2026, 10, 12),
  },
  {
    id: 2,
    dealCode: 'DL-402',
    title: 'Global Edge Security Mesh Rollout',
    company: 'Helios Gridworks',
    contact: 'Marcus Vance',
    owner: 'Kerem Yılmaz',
    region: 'North America',
    stage: 'Proposal',
    probability: 65,
    amount: 142000,
    priority: 'high',
    tags: ['Zero-Trust', 'Enterprise'],
    closeDate: new Date(2026, 10, 18),
  },
  {
    id: 3,
    dealCode: 'DL-403',
    title: 'Autonomous Telemetry Vector Store',
    company: 'Kestrel Robotics',
    contact: 'Sora Takahashi',
    owner: 'Selin Demir',
    region: 'APAC',
    stage: 'Closed Won',
    probability: 100,
    amount: 210000,
    priority: 'high',
    tags: ['Vector DB', 'APAC'],
    closeDate: new Date(2026, 9, 20),
  },
  {
    id: 4,
    dealCode: 'DL-404',
    title: 'Genomic Pipeline Analytics Suite',
    company: 'Solstice BioSystems',
    contact: 'Camila Montoya',
    owner: 'Emre Karaca',
    region: 'LATAM',
    stage: 'Discovery',
    probability: 35,
    amount: 68000,
    priority: 'medium',
    tags: ['Analytics', 'BioTech'],
    closeDate: new Date(2026, 11, 5),
  },
  {
    id: 5,
    dealCode: 'DL-405',
    title: 'Zero-Trust Substation Gateway',
    company: 'Nordic Fjord Energy',
    contact: 'Lukas Lindqvist',
    owner: 'Aylin Kaya',
    region: 'EMEA',
    stage: 'Closed Won',
    probability: 100,
    amount: 164000,
    priority: 'medium',
    tags: ['Energy', 'Security'],
    closeDate: new Date(2026, 9, 15),
  },
  {
    id: 6,
    dealCode: 'DL-406',
    title: 'APAC Real-Time Observability Tier',
    company: 'Meridian Telemetry',
    contact: 'Priya Nair',
    owner: 'Selin Demir',
    region: 'APAC',
    stage: 'Negotiation',
    probability: 85,
    amount: 128000,
    priority: 'high',
    tags: ['Telemetry', 'SLA'],
    closeDate: new Date(2026, 10, 8),
  },
  {
    id: 7,
    dealCode: 'DL-407',
    title: 'Dedicated GPU Compute Reservation',
    company: 'Cobalt Cloud Foundry',
    contact: 'Devon Brooks',
    owner: 'Kerem Yılmaz',
    region: 'North America',
    stage: 'Closed Won',
    probability: 100,
    amount: 295000,
    priority: 'high',
    tags: ['GPU', 'Multi-Year'],
    closeDate: new Date(2026, 9, 22),
  },
  {
    id: 8,
    dealCode: 'DL-408',
    title: 'Fleet Corridor Routing Engine',
    company: 'Zephyr Logistics Co.',
    contact: 'Amina Al-Mansoor',
    owner: 'Aylin Kaya',
    region: 'EMEA',
    stage: 'Proposal',
    probability: 55,
    amount: 94000,
    priority: 'medium',
    tags: ['Logistics', 'Edge'],
    closeDate: new Date(2026, 10, 25),
  },
  {
    id: 9,
    dealCode: 'DL-409',
    title: 'Quantum Simulation Storage Fabric',
    company: 'Borealis Quantum Systems',
    contact: 'Hannah Sterling',
    owner: 'Kerem Yılmaz',
    region: 'North America',
    stage: 'Negotiation',
    probability: 75,
    amount: 230000,
    priority: 'high',
    tags: ['Storage', 'Quantum'],
    closeDate: new Date(2026, 10, 14),
  },
  {
    id: 10,
    dealCode: 'DL-410',
    title: 'Wafer Inspection AI Inference Nodes',
    company: 'Cinder Peak Semiconductor',
    contact: 'Mei-Ling Zhou',
    owner: 'Selin Demir',
    region: 'APAC',
    stage: 'Proposal',
    probability: 60,
    amount: 175000,
    priority: 'medium',
    tags: ['Semiconductor', 'AI'],
    closeDate: new Date(2026, 10, 29),
  },
  {
    id: 11,
    dealCode: 'DL-411',
    title: 'Maritime Autonomy Edge Security',
    company: 'Skagen Marine Autonomy',
    contact: 'Freja Holm',
    owner: 'Aylin Kaya',
    region: 'EMEA',
    stage: 'Discovery',
    probability: 40,
    amount: 88000,
    priority: 'low',
    tags: ['Maritime', 'Security'],
    closeDate: new Date(2026, 11, 10),
  },
  {
    id: 12,
    dealCode: 'DL-412',
    title: 'FinOps Multi-Cloud Cost Analytics',
    company: 'Vanguard FinOps Guild',
    contact: 'Arjun Mehta',
    owner: 'Selin Demir',
    region: 'APAC',
    stage: 'Closed Won',
    probability: 100,
    amount: 152000,
    priority: 'medium',
    tags: ['FinOps', 'Analytics'],
    closeDate: new Date(2026, 9, 19),
  },
];

export const INITIAL_LEADS: CrmLead[] = [
  {
    id: 501,
    name: 'Dr. Henrik Lind',
    company: 'Polaris CryoTech',
    email: 'h.lind@polaris-example.test',
    source: 'Inbound Demo',
    region: 'EMEA',
    score: 92,
    status: 'Qualified',
    estimatedValue: 115000,
  },
  {
    id: 502,
    name: 'Maya Lin',
    company: 'Hyperion Battery Labs',
    email: 'maya.lin@hyperion-example.test',
    source: 'Cloud Summit',
    region: 'North America',
    score: 88,
    status: 'Qualified',
    estimatedValue: 140000,
  },
  {
    id: 503,
    name: 'Tariq Al-Rashid',
    company: 'Crescent Smart Ports',
    email: 'tariq@crescent-example.test',
    source: 'Partner Referral',
    region: 'EMEA',
    score: 84,
    status: 'Contacted',
    estimatedValue: 95000,
  },
  {
    id: 504,
    name: 'Yuki Sato',
    company: 'Shinkansen Signal AI',
    email: 'y.sato@shinkansen-example.test',
    source: 'Executive Webinar',
    region: 'APAC',
    score: 95,
    status: 'Qualified',
    estimatedValue: 180000,
  },
  {
    id: 505,
    name: 'Valeria Rojas',
    company: 'Cordillera Lithium Cloud',
    email: 'vrojas@cordillera-example.test',
    source: 'Inbound Demo',
    region: 'LATAM',
    score: 76,
    status: 'New',
    estimatedValue: 64000,
  },
  {
    id: 506,
    name: 'Liam O’Connor',
    company: 'Celtic Wind Grid',
    email: 'liam@celticwind-example.test',
    source: 'Partner Referral',
    region: 'EMEA',
    score: 81,
    status: 'Contacted',
    estimatedValue: 78000,
  },
];

export const INITIAL_TASKS: CrmTask[] = [
  {
    id: 701,
    title: 'Finalize MSA redlines with Vespera legal counsel',
    account: 'Vespera Orbital Lab',
    owner: 'Aylin Kaya',
    dueDate: new Date(2026, 9, 25),
    priority: 'High',
    type: 'Proposal',
    completed: false,
  },
  {
    id: 702,
    title: 'SOC2 Type II & ISO-27001 architecture walkthrough',
    account: 'Helios Gridworks',
    owner: 'Kerem Yılmaz',
    dueDate: new Date(2026, 9, 26),
    priority: 'High',
    type: 'Security Review',
    completed: false,
  },
  {
    id: 703,
    title: 'Q4 Executive Business Review (QBR) deck sign-off',
    account: 'Cobalt Cloud Foundry',
    owner: 'Kerem Yılmaz',
    dueDate: new Date(2026, 9, 27),
    priority: 'Medium',
    type: 'QBR',
    completed: false,
  },
  {
    id: 704,
    title: 'Share APAC latency benchmark report with Priya Nair',
    account: 'Meridian Telemetry',
    owner: 'Selin Demir',
    dueDate: new Date(2026, 9, 28),
    priority: 'High',
    type: 'Call',
    completed: false,
  },
];

export const SALES_TEAM_QUOTAS: SalesRepQuota[] = [
  {
    id: 'rep-1',
    name: 'Aylin Kaya',
    role: 'VP Enterprise Sales · EMEA',
    region: 'EMEA',
    quota: 650000,
    closedWon: 548000,
    pipeline: 367000,
    dealsWon: 9,
    attainment: 84,
    status: 'online',
    trend: [62, 68, 71, 75, 79, 84],
  },
  {
    id: 'rep-2',
    name: 'Kerem Yılmaz',
    role: 'Principal AE · North America',
    region: 'North America',
    quota: 750000,
    closedWon: 685000,
    pipeline: 372000,
    dealsWon: 11,
    attainment: 91,
    status: 'online',
    trend: [70, 74, 79, 83, 88, 91],
  },
  {
    id: 'rep-3',
    name: 'Selin Demir',
    role: 'Regional Director · APAC',
    region: 'APAC',
    quota: 550000,
    closedWon: 482000,
    pipeline: 303000,
    dealsWon: 8,
    attainment: 88,
    status: 'busy',
    trend: [64, 69, 73, 80, 84, 88],
  },
  {
    id: 'rep-4',
    name: 'Emre Karaca',
    role: 'Senior AE · LATAM',
    region: 'LATAM',
    quota: 380000,
    closedWon: 274000,
    pipeline: 195000,
    dealsWon: 6,
    attainment: 72,
    status: 'away',
    trend: [50, 55, 59, 63, 68, 72],
  },
];

export const CRM_ACTIVITY_TIMELINE: OgeTimelineItem[] = [
  {
    key: 'act-1',
    title: 'Cobalt Cloud Foundry — $295,000 Enterprise Deal Won',
    description: 'Annual GPU compute reservation countersigned by Devon Brooks.',
    time: '14 mins ago',
    severity: 'success',
    variant: 'filled',
  },
  {
    key: 'act-2',
    title: 'Vespera Orbital Lab — Contract Redlines Uploaded',
    description: 'Elena Rostova approved the EMEA data residency addendum.',
    time: '1 hour ago',
    severity: 'accent',
    variant: 'filled',
  },
  {
    key: 'act-3',
    title: 'Yuki Sato (Shinkansen Signal AI) — Lead Score Reached 95',
    description: 'Attended Executive Webinar and requested a 64-node PoC cluster.',
    time: '3 hours ago',
    severity: 'warning',
    variant: 'filled',
  },
  {
    key: 'act-4',
    title: 'Kestrel Robotics — $210,000 Expansion Provisioned',
    description: 'Vector Storage cluster deployed in ap-northeast-1 with zero downtime.',
    time: 'Yesterday · 16:40',
    severity: 'success',
    variant: 'outlined',
  },
];

export const SCHEDULER_RESOURCES: readonly OgeSchedulerResource[] = [
  {
    fieldExpr: 'ownerId',
    label: 'Account Executive',
    useColorAsDefault: true,
    items: [
      { id: 'aylin', text: 'Aylin Kaya (EMEA)', color: '#4f46e5' },
      { id: 'kerem', text: 'Kerem Yılmaz (NA)', color: '#0ea5e9' },
      { id: 'selin', text: 'Selin Demir (APAC)', color: '#10b981' },
      { id: 'emre', text: 'Emre Karaca (LATAM)', color: '#f59e0b' },
    ],
  },
];

export const SCHEDULER_APPOINTMENTS: CrmAppointment[] = [
  {
    id: 1,
    text: 'Vespera Orbital — Final MSA Redline Review',
    startDate: new Date(2026, 9, 19, 9, 30),
    endDate: new Date(2026, 9, 19, 11, 0),
    ownerId: 'aylin',
    location: 'Zoom Executive Bridge',
    description: 'Review GDPR & EMEA data residency clauses with Elena Rostova.',
  },
  {
    id: 2,
    text: 'Helios Gridworks — Zero-Trust Architecture Deep Dive',
    startDate: new Date(2026, 9, 20, 11, 0),
    endDate: new Date(2026, 9, 20, 12, 30),
    ownerId: 'kerem',
    location: 'Austin HQ / Hybrid',
    description: 'Walk through multi-region failover and SOC2 Type II controls.',
  },
  {
    id: 3,
    text: 'Kestrel Robotics — Q4 Executive Business Review',
    startDate: new Date(2026, 9, 21, 10, 0),
    endDate: new Date(2026, 9, 21, 11, 30),
    ownerId: 'selin',
    location: 'Tokyo Suite B',
    description: 'Present Q3 telemetry throughput metrics and 2027 seat expansion.',
  },
  {
    id: 4,
    text: 'Borealis Quantum — Executive Pricing Committee',
    startDate: new Date(2026, 9, 22, 14, 0),
    endDate: new Date(2026, 9, 22, 15, 30),
    ownerId: 'kerem',
    location: 'Boardroom 4A',
    description: 'Sign off on 3-year committed storage fabric discount schedule.',
  },
  {
    id: 5,
    text: 'Meridian Telemetry — PoC Benchmark Readout',
    startDate: new Date(2026, 9, 23, 9, 0),
    endDate: new Date(2026, 9, 23, 10, 30),
    ownerId: 'selin',
    location: 'Singapore Cloud Lab',
    description: 'Sub-millisecond ingest latency verification with Priya Nair.',
  },
  {
    id: 6,
    text: 'Solstice BioSystems — Discovery & Security Scoping',
    startDate: new Date(2026, 9, 23, 13, 30),
    endDate: new Date(2026, 9, 23, 15, 0),
    ownerId: 'emre',
    location: 'Google Meet',
    description: 'Genomic pipeline HIPAA compliance and storage tiering workshop.',
  },
];

export const GANTT_RESOURCES: readonly OgeGanttResource[] = [
  { id: 'sol-arch', text: 'Solutions Architecture', color: '#4f46e5' },
  { id: 'sec-ops', text: 'Security & Compliance', color: '#0ea5e9' },
  { id: 'cloud-eng', text: 'Cloud Provisioning', color: '#10b981' },
  { id: 'cs-lead', text: 'Customer Success', color: '#f59e0b' },
];

export const GANTT_TASKS: CrmGanttTask[] = [
  {
    id: 1,
    parentId: null,
    title: 'Phase 1: Enterprise Discovery & Security Sign-Off',
    start: new Date(2026, 9, 1),
    end: new Date(2026, 9, 14),
    progress: 100,
  },
  {
    id: 2,
    parentId: 1,
    title: 'Architecture Sizing & Multi-Region Topology',
    start: new Date(2026, 9, 1),
    end: new Date(2026, 9, 7),
    progress: 100,
    resourceId: 'sol-arch',
  },
  {
    id: 3,
    parentId: 1,
    title: 'SOC2 Type II & GDPR Data Processing Addendum',
    start: new Date(2026, 9, 8),
    end: new Date(2026, 9, 14),
    progress: 100,
    resourceId: 'sec-ops',
  },
  {
    id: 4,
    parentId: null,
    title: 'Phase 2: Dedicated Cluster Provisioning & PoC',
    start: new Date(2026, 9, 15),
    end: new Date(2026, 10, 4),
    progress: 68,
  },
  {
    id: 5,
    parentId: 4,
    title: 'Provision GPU Inference & Vector Storage Nodes',
    start: new Date(2026, 9, 15),
    end: new Date(2026, 9, 24),
    progress: 90,
    resourceId: 'cloud-eng',
  },
  {
    id: 6,
    parentId: 4,
    title: 'SSO / SAML 2.0 & RBAC Policy Integration',
    start: new Date(2026, 9, 25),
    end: new Date(2026, 10, 4),
    progress: 45,
    resourceId: 'sec-ops',
  },
  {
    id: 7,
    parentId: null,
    title: 'Phase 3: Production Cutover & Executive Go-Live',
    start: new Date(2026, 10, 5),
    end: new Date(2026, 10, 18),
    progress: 20,
  },
  {
    id: 8,
    parentId: 7,
    title: 'Zero-Downtime Telemetry Migration & Load Test',
    start: new Date(2026, 10, 5),
    end: new Date(2026, 10, 12),
    progress: 35,
    resourceId: 'cloud-eng',
  },
  {
    id: 9,
    parentId: 7,
    title: 'Executive QBR & Admin Enablement Workshop',
    start: new Date(2026, 10, 13),
    end: new Date(2026, 10, 18),
    progress: 0,
    resourceId: 'cs-lead',
  },
];

export const GANTT_DEPENDENCIES: CrmGanttDependency[] = [
  { id: 1, predecessorId: 2, successorId: 3, type: 'FS' },
  { id: 2, predecessorId: 3, successorId: 5, type: 'FS' },
  { id: 3, predecessorId: 5, successorId: 6, type: 'FS' },
  { id: 4, predecessorId: 6, successorId: 8, type: 'FS' },
  { id: 5, predecessorId: 8, successorId: 9, type: 'FS' },
];

export const SAMPLE_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_AstraCRM"
  targetNamespace="http://ogeui.com/bpmn">
  <bpmn:process id="Process_EnterpriseDeal" name="AstraCRM Enterprise Deal Approval" isExecutable="true">
    <bpmn:startEvent id="StartEvent_Quote" name="Quote Submitted">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_DealDesk" name="Deal Desk Margin Check">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:exclusiveGateway id="Gateway_Discount" name="Discount > 20%?">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_VP</bpmn:outgoing>
      <bpmn:outgoing>Flow_Auto</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:userTask id="Task_VPApproval" name="VP Sales &amp; Legal Sign-Off">
      <bpmn:incoming>Flow_VP</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="Task_Provision" name="Provision Cloud Tenant">
      <bpmn:incoming>Flow_Auto</bpmn:incoming>
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_Live" name="Customer Live">
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_Quote" targetRef="Task_DealDesk" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_DealDesk" targetRef="Gateway_Discount" />
    <bpmn:sequenceFlow id="Flow_VP" name="Yes" sourceRef="Gateway_Discount" targetRef="Task_VPApproval" />
    <bpmn:sequenceFlow id="Flow_Auto" name="No" sourceRef="Gateway_Discount" targetRef="Task_Provision" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_VPApproval" targetRef="Task_Provision" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_Provision" targetRef="EndEvent_Live" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_EnterpriseDeal">
      <bpmndi:BPMNShape id="StartEvent_Quote_di" bpmnElement="StartEvent_Quote">
        <dc:Bounds x="80" y="162" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_DealDesk_di" bpmnElement="Task_DealDesk">
        <dc:Bounds x="176" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Discount_di" bpmnElement="Gateway_Discount" isMarkerVisible="true">
        <dc:Bounds x="365" y="155" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_VPApproval_di" bpmnElement="Task_VPApproval">
        <dc:Bounds x="470" y="60" width="140" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Provision_di" bpmnElement="Task_Provision">
        <dc:Bounds x="670" y="140" width="140" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Live_di" bpmnElement="EndEvent_Live">
        <dc:Bounds x="872" y="162" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="116" y="180" />
        <di:waypoint x="176" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="306" y="180" />
        <di:waypoint x="365" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_VP_di" bpmnElement="Flow_VP">
        <di:waypoint x="390" y="155" />
        <di:waypoint x="390" y="100" />
        <di:waypoint x="470" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Auto_di" bpmnElement="Flow_Auto">
        <di:waypoint x="415" y="180" />
        <di:waypoint x="670" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="610" y="100" />
        <di:waypoint x="740" y="100" />
        <di:waypoint x="740" y="140" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="810" y="180" />
        <di:waypoint x="872" y="180" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export const INITIAL_CHAT_MESSAGES: readonly OgeChatMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    text: 'Welcome to AstraCRM Revenue Copilot! Ask me about Q4 pipeline velocity, EMEA enterprise deals, top quota attainment, or use the Grid Assistant to sort and filter 10,000+ orders.',
  },
];

export function createAstraAiTransport(): OgeAiTransport {
  return {
    async complete(request: OgeAiRequest): Promise<OgeAiResponse> {
      await new Promise((r) => setTimeout(r, 240));
      const lastMsg = request.messages[request.messages.length - 1]?.content ?? '';
      const lower = lastMsg.toLowerCase();

      if (request.feature === 'grid-assistant') {
        if (lower.includes('reset') || lower.includes('clear')) {
          return {
            text: JSON.stringify({
              status: 'apply',
              summary: 'Cleared all active filters, grouping, and sorting.',
              sort: [],
              group: [],
              filter: null,
              search: '',
              hiddenColumns: [],
            }),
          };
        }
        if (lower.includes('group') && lower.includes('region')) {
          return {
            text: JSON.stringify({
              status: 'apply',
              summary: 'Grouped orders by Region and sorted by Total descending.',
              group: [{ field: 'region' }],
              sort: [{ field: 'total', dir: 'desc' }],
            }),
          };
        }
        if (lower.includes('group') && lower.includes('category')) {
          return {
            text: JSON.stringify({
              status: 'apply',
              summary: 'Grouped orders by Product Category.',
              group: [{ field: 'category' }],
            }),
          };
        }
        if (lower.includes('highest') || lower.includes('largest') || lower.includes('top')) {
          return {
            text: JSON.stringify({
              status: 'apply',
              summary: 'Sorted orders by Total revenue (highest first).',
              sort: [{ field: 'total', dir: 'desc' }],
            }),
          };
        }
        return {
          text: JSON.stringify({
            status: 'apply',
            summary: 'Sorted by newest Order Date and filtered for high-value Enterprise orders.',
            sort: [{ field: 'orderDate', dir: 'desc' }],
          }),
        };
      }

      if (lower.includes('pipeline') || lower.includes('forecast')) {
        return {
          text: 'Active Q4 weighted pipeline stands at $1.10M across 8 open opportunities, with $821K already Closed Won. Borealis Quantum ($230K) and Vespera Orbital ($185K) are in final legal review.',
        };
      }
      if (lower.includes('quota') || lower.includes('rep') || lower.includes('team')) {
        return {
          text: 'Kerem Yılmaz leads North America at 91% quota attainment ($685K closed), followed by Selin Demir in APAC at 88% ($482K) and Aylin Kaya in EMEA at 84% ($548K).',
        };
      }
      if (lower.includes('emea')) {
        return {
          text: 'EMEA accounts contribute $2.89M ARR (94% health score at Vespera Orbital Lab and 91% at Nordic Fjord Energy). Two expansion deals totaling $279K are slated to close this month.',
        };
      }
      return {
        text: `AstraCRM Analysis for "${lastMsg}": Net revenue retention is tracking at 118.4% with 99.98% SLA uptime across all 20 enterprise accounts. Would you like me to filter the Revenue Grid or open the BPMN approval workflow?`,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Project delivery board (Kanban) — implementation projects run by the team
// ---------------------------------------------------------------------------

export type ProjectTaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export interface ProjectTask {
  id: number;
  status: ProjectTaskStatus;
  title: string;
  summary: string;
  project: string;
  assignee: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate: Date;
  estimateHours: number;
  tags: string[];
  checklist: { text: string; done: boolean }[];
}

export interface ProjectBoardColumn {
  key: ProjectTaskStatus;
  title: string;
  wipLimit?: number;
}

export const PROJECT_COLUMNS: readonly ProjectBoardColumn[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'todo', title: 'To do', wipLimit: 6 },
  { key: 'in-progress', title: 'In progress', wipLimit: 5 },
  { key: 'review', title: 'In review', wipLimit: 3 },
  { key: 'done', title: 'Done' },
];

export const PROJECT_NAMES = ['Helios Gridworks · Edge rollout', 'Vespera Orbital · AI cluster', 'Northwind Relay · DR add-on'] as const;

const P1 = PROJECT_NAMES[0];
const P2 = PROJECT_NAMES[1];
const P3 = PROJECT_NAMES[2];

const A1 = 'Aylin Kaya';
const A2 = 'Kerem Yılmaz';
const A3 = 'Selin Demir';
const A4 = 'Emre Karaca';

export const PROJECT_TASKS: ProjectTask[] = [
  // --- P1 ---------------------------------------------------------------
  {
    id: 1001, status: 'done', project: P1, assignee: A1, priority: 'high',
    title: 'Kick-off and success criteria',
    summary: 'Agree rollout scope, regions and the go-live acceptance checklist.',
    dueDate: new Date(2026, 9, 2), estimateHours: 6, tags: ['Discovery'],
    checklist: [
      { text: 'Stakeholder map', done: true },
      { text: 'Acceptance criteria signed', done: true },
    ],
  },
  {
    id: 1002, status: 'done', project: P1, assignee: A2, priority: 'medium',
    title: 'Network baseline per site',
    summary: 'Latency and throughput baseline for the 14 edge locations.',
    dueDate: new Date(2026, 9, 9), estimateHours: 12, tags: ['Infra'],
    checklist: [
      { text: 'Collect site inventory', done: true },
      { text: 'Run baseline probes', done: true },
      { text: 'Publish report', done: true },
    ],
  },
  {
    id: 1003, status: 'review', project: P1, assignee: A2, priority: 'high',
    title: 'Edge gateway image v2.4',
    summary: 'Hardened image with the customer CA bundle and offline update path.',
    dueDate: new Date(2026, 9, 27), estimateHours: 16, tags: ['Infra', 'Security'],
    checklist: [
      { text: 'CIS benchmark pass', done: true },
      { text: 'Offline update rehearsal', done: true },
      { text: 'Security sign-off', done: false },
    ],
  },
  {
    id: 1004, status: 'in-progress', project: P1, assignee: A3, priority: 'critical',
    title: 'Pilot site cut-over (Rotterdam)',
    summary: 'First production site moves to the new mesh during the Friday window.',
    dueDate: new Date(2026, 9, 30), estimateHours: 20, tags: ['Go-live'],
    checklist: [
      { text: 'Change ticket approved', done: true },
      { text: 'Rollback plan rehearsed', done: true },
      { text: 'On-call roster confirmed', done: false },
      { text: 'Customer comms sent', done: false },
    ],
  },
  {
    id: 1005, status: 'in-progress', project: P1, assignee: A1, priority: 'medium',
    title: 'Operations runbook',
    summary: 'Day-2 procedures: certificate rotation, node replacement, escalation paths.',
    dueDate: new Date(2026, 10, 4), estimateHours: 10, tags: ['Docs'],
    checklist: [
      { text: 'Certificate rotation', done: true },
      { text: 'Node replacement', done: false },
      { text: 'Escalation matrix', done: false },
    ],
  },
  {
    id: 1006, status: 'todo', project: P1, assignee: A4, priority: 'high',
    title: 'Wave 2 site scheduling',
    summary: 'Book maintenance windows for the remaining 13 sites with local IT.',
    dueDate: new Date(2026, 10, 7), estimateHours: 8, tags: ['Planning'],
    checklist: [],
  },
  {
    id: 1007, status: 'todo', project: P1, assignee: A3, priority: 'medium',
    title: 'Monitoring dashboards',
    summary: 'Per-site health, tunnel status and update compliance views.',
    dueDate: new Date(2026, 10, 11), estimateHours: 12, tags: ['Observability'],
    checklist: [{ text: 'Alert thresholds agreed', done: false }],
  },
  {
    id: 1008, status: 'backlog', project: P1, assignee: A2, priority: 'low',
    title: 'Decommission legacy VPN concentrators',
    summary: 'After wave 2 completes, retire the three legacy appliances.',
    dueDate: new Date(2026, 11, 4), estimateHours: 6, tags: ['Infra'],
    checklist: [],
  },

  // --- P2 ---------------------------------------------------------------
  {
    id: 2001, status: 'done', project: P2, assignee: A4, priority: 'high',
    title: 'Capacity model and node sizing',
    summary: 'GPU node count and storage tiering for the first two regions.',
    dueDate: new Date(2026, 9, 6), estimateHours: 14, tags: ['Architecture'],
    checklist: [
      { text: 'Workload profile', done: true },
      { text: 'Sizing sheet reviewed', done: true },
    ],
  },
  {
    id: 2002, status: 'review', project: P2, assignee: A4, priority: 'critical',
    title: 'Cross-region replication design',
    summary: 'Active-active model serving with a 15 ms replication budget.',
    dueDate: new Date(2026, 9, 24), estimateHours: 18, tags: ['Architecture', 'Security'],
    checklist: [
      { text: 'Failure modes documented', done: true },
      { text: 'Architecture review board', done: false },
    ],
  },
  {
    id: 2003, status: 'in-progress', project: P2, assignee: A1, priority: 'high',
    title: 'Identity federation (SAML + SCIM)',
    summary: 'Connect the customer IdP, map groups to cluster roles.',
    dueDate: new Date(2026, 10, 2), estimateHours: 12, tags: ['Security'],
    checklist: [
      { text: 'Metadata exchanged', done: true },
      { text: 'Group mapping', done: true },
      { text: 'Break-glass account', done: false },
    ],
  },
  {
    id: 2004, status: 'in-progress', project: P2, assignee: A2, priority: 'medium',
    title: 'Inference benchmark suite',
    summary: 'Reproducible latency and throughput runs the customer can re-execute.',
    dueDate: new Date(2026, 10, 6), estimateHours: 16, tags: ['Performance'],
    checklist: [
      { text: 'Dataset frozen', done: true },
      { text: 'Harness scripted', done: false },
      { text: 'Baseline numbers', done: false },
    ],
  },
  {
    id: 2005, status: 'todo', project: P2, assignee: A3, priority: 'high',
    title: 'Cost allocation tags',
    summary: 'Per-team chargeback labels on every node pool and bucket.',
    dueDate: new Date(2026, 10, 9), estimateHours: 6, tags: ['FinOps'],
    checklist: [],
  },
  {
    id: 2006, status: 'todo', project: P2, assignee: A4, priority: 'medium',
    title: 'Model registry integration',
    summary: 'Promote models from staging to production through the registry.',
    dueDate: new Date(2026, 10, 13), estimateHours: 14, tags: ['Platform'],
    checklist: [
      { text: 'Registry endpoints', done: false },
      { text: 'Promotion policy', done: false },
    ],
  },
  {
    id: 2007, status: 'backlog', project: P2, assignee: A1, priority: 'low',
    title: 'Third region (AP-Northeast)',
    summary: 'Scoped for Q1 once the first two regions are stable.',
    dueDate: new Date(2027, 0, 29), estimateHours: 40, tags: ['Architecture'],
    checklist: [],
  },
  {
    id: 2008, status: 'backlog', project: P2, assignee: A2, priority: 'medium',
    title: 'Chaos drill: regional failover',
    summary: 'Pull a region during business hours and measure recovery.',
    dueDate: new Date(2026, 11, 11), estimateHours: 8, tags: ['Resilience'],
    checklist: [],
  },

  // --- P3 ---------------------------------------------------------------
  {
    id: 3001, status: 'done', project: P3, assignee: A3, priority: 'medium',
    title: 'Recovery objectives workshop',
    summary: 'RPO/RTO per workload class agreed with the customer.',
    dueDate: new Date(2026, 9, 14), estimateHours: 4, tags: ['Discovery'],
    checklist: [
      { text: 'Workload inventory', done: true },
      { text: 'Objectives signed', done: true },
    ],
  },
  {
    id: 3002, status: 'in-progress', project: P3, assignee: A3, priority: 'high',
    title: 'Warm standby in EU-Central',
    summary: 'Replicated database and object storage with hourly verification.',
    dueDate: new Date(2026, 9, 21), estimateHours: 20, tags: ['Infra', 'Resilience'],
    checklist: [
      { text: 'Replication running', done: true },
      { text: 'Integrity checks', done: true },
      { text: 'Restore rehearsal', done: false },
    ],
  },
  {
    id: 3003, status: 'review', project: P3, assignee: A1, priority: 'medium',
    title: 'Failover runbook',
    summary: 'Step-by-step failover and failback with owners and timings.',
    dueDate: new Date(2026, 9, 28), estimateHours: 8, tags: ['Docs'],
    checklist: [
      { text: 'Draft complete', done: true },
      { text: 'Tabletop exercise', done: false },
    ],
  },
  {
    id: 3004, status: 'todo', project: P3, assignee: A4, priority: 'critical',
    title: 'Full failover test',
    summary: 'Customer-witnessed failover with a signed test record.',
    dueDate: new Date(2026, 10, 14), estimateHours: 12, tags: ['Go-live'],
    checklist: [
      { text: 'Test window agreed', done: false },
      { text: 'Observers invited', done: false },
    ],
  },
  {
    id: 3005, status: 'todo', project: P3, assignee: A2, priority: 'low',
    title: 'Backup retention policy',
    summary: 'Tier the retention schedule and the legal-hold exceptions.',
    dueDate: new Date(2026, 10, 18), estimateHours: 4, tags: ['Compliance'],
    checklist: [],
  },
  {
    id: 3006, status: 'backlog', project: P3, assignee: A3, priority: 'medium',
    title: 'Quarterly DR drill cadence',
    summary: 'Automate the drill schedule and the evidence collection.',
    dueDate: new Date(2026, 11, 18), estimateHours: 6, tags: ['Resilience'],
    checklist: [],
  },
];

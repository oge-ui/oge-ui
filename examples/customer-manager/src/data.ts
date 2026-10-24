import type { OgeAiRequest, OgeAiResponse, OgeAiTransport, OgeChatMessage } from '@oge-ui/react';

export type CustomerTier = 'Starter' | 'Growth' | 'Scale' | 'Enterprise';
export type CustomerStatus = 'Active' | 'Trial' | 'Onboarding' | 'At Risk';

export interface CustomerRecord {
  id: number;
  name: string;
  company: string;
  email: string;
  tier: CustomerTier;
  mrr: number;
  seats: number;
  status: CustomerStatus;
  region: string;
  healthScore: number;
  renewalQuarter: string;
  csmOwner: string;
  avatarUrl?: string;
}

export interface CohortMetricPoint {
  month: string;
  arr: number;
  expansionArr: number;
  churnArr: number;
  nrr: number;
}

export interface TierShareSlice {
  tier: string;
  arr: number;
}

export interface FunnelStageItem {
  stage: string;
  accounts: number;
}

export interface RenewalKanbanCard {
  id: number;
  stage: 'discovery' | 'qbr' | 'proposal' | 'expansion' | 'renewed';
  title: string;
  account: string;
  csm: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  region: string;
  due: Date;
  tags: string[];
  checklist: { text: string; done: boolean }[];
}

export interface CustomerPivotRow {
  id: number;
  region: string;
  country: string;
  tier: CustomerTier;
  status: CustomerStatus;
  date: string;
  arr: number;
  seats: number;
  expansion: number;
}

export interface QbrAppointment {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  csmId: number;
  description: string;
  location: string;
  allDay?: boolean;
}

export interface OnboardingGanttTask {
  id: number;
  parentId: number | null;
  title: string;
  start: Date;
  end: Date;
  progress: number;
  resourceId?: number[];
  color?: string;
}

export interface OnboardingGanttDep {
  id: number;
  predecessorId: number;
  successorId: number;
  type: 'FS' | 'SS' | 'FF' | 'SF';
}

export const TIER_OPTIONS = [
  { value: 'Starter', label: 'Starter' },
  { value: 'Growth', label: 'Growth' },
  { value: 'Scale', label: 'Scale' },
  { value: 'Enterprise', label: 'Enterprise' },
];

export const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Trial', label: 'Trial' },
  { value: 'Onboarding', label: 'Onboarding' },
  { value: 'At Risk', label: 'At Risk' },
];

export const REGION_OPTIONS = [
  { value: 'North America', label: 'North America' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia-Pacific', label: 'Asia-Pacific' },
  { value: 'Latin America', label: 'Latin America' },
];

function svgAvatar(initials: string, bg: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(40, 40, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 28px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 40, 42);
  return canvas.toDataURL('image/png');
}

export const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    id: 101,
    name: 'Clara Vance',
    company: 'Northwind Relay Labs',
    email: 'clara.vance@northwind-example.test',
    tier: 'Enterprise',
    mrr: 14800,
    seats: 164,
    status: 'Active',
    region: 'North America',
    healthScore: 96,
    renewalQuarter: 'Q1 2027',
    csmOwner: 'Elena Rostova',
    avatarUrl: svgAvatar('CV', '#4f46e5'),
  },
  {
    id: 102,
    name: 'Emre Karaca',
    company: 'Bosphorus Cloud Works',
    email: 'emre.karaca@bosphorus-example.test',
    tier: 'Scale',
    mrr: 6150,
    seats: 78,
    status: 'Active',
    region: 'Europe',
    healthScore: 91,
    renewalQuarter: 'Q4 2026',
    csmOwner: 'Defne Arslan',
    avatarUrl: svgAvatar('EK', '#0891b2'),
  },
  {
    id: 103,
    name: 'Mina Takahashi',
    company: 'Kibo Robotics Studio',
    email: 'mina.takahashi@kibo-example.test',
    tier: 'Enterprise',
    mrr: 19200,
    seats: 240,
    status: 'Active',
    region: 'Asia-Pacific',
    healthScore: 98,
    renewalQuarter: 'Q2 2027',
    csmOwner: 'Kenji Watanabe',
    avatarUrl: svgAvatar('MT', '#059669'),
  },
  {
    id: 104,
    name: 'Lucas Herrera',
    company: 'Andes Logistics Mesh',
    email: 'lucas.herrera@andes-example.test',
    tier: 'Growth',
    mrr: 2890,
    seats: 34,
    status: 'Onboarding',
    region: 'Latin America',
    healthScore: 84,
    renewalQuarter: 'Q1 2027',
    csmOwner: 'Elena Rostova',
  },
  {
    id: 105,
    name: 'Astrid Lindqvist',
    company: 'Fjord Telemetry Co.',
    email: 'astrid.lindqvist@fjord-example.test',
    tier: 'Scale',
    mrr: 7400,
    seats: 92,
    status: 'Active',
    region: 'Europe',
    healthScore: 93,
    renewalQuarter: 'Q4 2026',
    csmOwner: 'Defne Arslan',
    avatarUrl: svgAvatar('AL', '#7c3aed'),
  },
  {
    id: 106,
    name: 'Devon Brooks',
    company: 'Redwood Signal Systems',
    email: 'devon.brooks@redwood-example.test',
    tier: 'Growth',
    mrr: 3450,
    seats: 42,
    status: 'At Risk',
    region: 'North America',
    healthScore: 54,
    renewalQuarter: 'Q4 2026',
    csmOwner: 'Elena Rostova',
  },
  {
    id: 107,
    name: 'Selin Demir',
    company: 'Anatolia Data Foundry',
    email: 'selin.demir@anatolia-example.test',
    tier: 'Starter',
    mrr: 920,
    seats: 12,
    status: 'Trial',
    region: 'Europe',
    healthScore: 79,
    renewalQuarter: 'Q4 2026',
    csmOwner: 'Defne Arslan',
  },
  {
    id: 108,
    name: 'Rafael Costa',
    company: 'Verde Harbor Freight',
    email: 'rafael.costa@verde-example.test',
    tier: 'Scale',
    mrr: 5950,
    seats: 68,
    status: 'Active',
    region: 'Latin America',
    healthScore: 89,
    renewalQuarter: 'Q1 2027',
    csmOwner: 'Elena Rostova',
    avatarUrl: svgAvatar('RC', '#d97706'),
  },
  {
    id: 109,
    name: 'Hanna Novak',
    company: 'Danube FinTech Grid',
    email: 'hanna.novak@danube-example.test',
    tier: 'Enterprise',
    mrr: 16400,
    seats: 195,
    status: 'Active',
    region: 'Europe',
    healthScore: 95,
    renewalQuarter: 'Q2 2027',
    csmOwner: 'Defne Arslan',
  },
  {
    id: 110,
    name: 'Kenji Sato',
    company: 'Sakura Synthesis Corp',
    email: 'kenji.sato@sakura-example.test',
    tier: 'Growth',
    mrr: 3100,
    seats: 38,
    status: 'Onboarding',
    region: 'Asia-Pacific',
    healthScore: 86,
    renewalQuarter: 'Q1 2027',
    csmOwner: 'Kenji Watanabe',
  },
  {
    id: 111,
    name: 'Nora Al-Mansoor',
    company: 'Oasis Orbital Analytics',
    email: 'nora.almansoor@oasis-example.test',
    tier: 'Scale',
    mrr: 8750,
    seats: 106,
    status: 'Active',
    region: 'Europe',
    healthScore: 94,
    renewalQuarter: 'Q1 2027',
    csmOwner: 'Defne Arslan',
    avatarUrl: svgAvatar('NA', '#db2777'),
  },
  {
    id: 112,
    name: 'Marcus Sterling',
    company: 'Cascadia Quantum Tools',
    email: 'marcus.sterling@cascadia-example.test',
    tier: 'Starter',
    mrr: 890,
    seats: 10,
    status: 'Trial',
    region: 'North America',
    healthScore: 76,
    renewalQuarter: 'Q4 2026',
    csmOwner: 'Elena Rostova',
  },
];

export const COHORT_METRICS: readonly CohortMetricPoint[] = [
  { month: 'Jan', arr: 780, expansionArr: 95, churnArr: 18, nrr: 114 },
  { month: 'Feb', arr: 835, expansionArr: 112, churnArr: 15, nrr: 116 },
  { month: 'Mar', arr: 910, expansionArr: 138, churnArr: 21, nrr: 118 },
  { month: 'Apr', arr: 965, expansionArr: 124, churnArr: 14, nrr: 117 },
  { month: 'May', arr: 1040, expansionArr: 156, churnArr: 19, nrr: 121 },
  { month: 'Jun', arr: 1125, expansionArr: 178, churnArr: 16, nrr: 123 },
  { month: 'Jul', arr: 1190, expansionArr: 164, churnArr: 22, nrr: 120 },
  { month: 'Aug', arr: 1275, expansionArr: 192, churnArr: 14, nrr: 124 },
  { month: 'Sep', arr: 1360, expansionArr: 215, churnArr: 17, nrr: 126 },
  { month: 'Oct', arr: 1450, expansionArr: 238, churnArr: 12, nrr: 128 },
];

export const TIER_SHARE_DATA: readonly TierShareSlice[] = [
  { tier: 'Enterprise', arr: 604800 },
  { tier: 'Scale', arr: 339000 },
  { tier: 'Growth', arr: 113280 },
  { tier: 'Starter', arr: 21720 },
];

export const CUSTOMER_JOURNEY_FUNNEL: readonly FunnelStageItem[] = [
  { stage: '1. Product-Qualified Trial', accounts: 420 },
  { stage: '2. Technical Onboarding', accounts: 310 },
  { stage: '3. Production Deployment', accounts: 245 },
  { stage: '4. Multi-Team Expansion', accounts: 168 },
  { stage: '5. Enterprise ELA Renewal', accounts: 112 },
];

export const MRR_SPARKLINE = [780, 835, 910, 965, 1040, 1125, 1190, 1275, 1360, 1450];
export const NRR_SPARKLINE = [114, 116, 118, 117, 121, 123, 120, 124, 126, 128];

export const INITIAL_RENEWAL_KANBAN: RenewalKanbanCard[] = [
  {
    id: 301,
    stage: 'discovery',
    title: 'Northwind Multi-Region Disaster Recovery Add-On',
    account: 'Northwind Relay Labs · $177.6K ARR',
    csm: 'Elena Rostova',
    priority: 'critical',
    region: 'North America',
    due: new Date(2026, 10, 12),
    tags: ['Enterprise', 'Expansion'],
    checklist: [
      { text: 'Review telemetry utilization report', done: true },
      { text: 'Scope EU-Central failover cluster', done: true },
      { text: 'Deliver executive ROI deck', done: false },
    ],
  },
  {
    id: 302,
    stage: 'qbr',
    title: 'Bosphorus Cloud Q4 Executive Business Review',
    account: 'Bosphorus Cloud Works · $73.8K ARR',
    csm: 'Defne Arslan',
    priority: 'high',
    region: 'Europe',
    due: new Date(2026, 10, 18),
    tags: ['Scale', 'QBR'],
    checklist: [
      { text: 'Compile SLA uptime metrics (99.99%)', done: true },
      { text: 'Present AI Copilot adoption benchmarks', done: false },
    ],
  },
  {
    id: 303,
    stage: 'proposal',
    title: 'Kibo Robotics +120 Seat & GPU Cluster Upgrade',
    account: 'Kibo Robotics Studio · $230.4K ARR',
    csm: 'Kenji Watanabe',
    priority: 'critical',
    region: 'Asia-Pacific',
    due: new Date(2026, 10, 8),
    tags: ['Enterprise', 'Upsell'],
    checklist: [
      { text: 'Finalize custom volume pricing tier', done: true },
      { text: 'Procurement security sign-off', done: true },
      { text: 'Countersign 36-month master order form', done: false },
    ],
  },
  {
    id: 304,
    stage: 'qbr',
    title: 'Redwood Signal Executive Retention Playbook',
    account: 'Redwood Signal Systems · $41.4K ARR',
    csm: 'Elena Rostova',
    priority: 'critical',
    region: 'North America',
    due: new Date(2026, 10, 4),
    tags: ['At Risk', 'Retention'],
    checklist: [
      { text: 'Audit SSO latency ticket with engineering', done: true },
      { text: 'Deploy dedicated Solutions Architect', done: false },
    ],
  },
  {
    id: 305,
    stage: 'expansion',
    title: 'Danube FinTech PCI-DSS Vault Module',
    account: 'Danube FinTech Grid · $196.8K ARR',
    csm: 'Defne Arslan',
    priority: 'high',
    region: 'Europe',
    due: new Date(2026, 10, 22),
    tags: ['Enterprise', 'Compliance'],
    checklist: [
      { text: 'Complete penetration test attestation', done: true },
      { text: 'Activate production KMS keys', done: true },
    ],
  },
  {
    id: 306,
    stage: 'renewed',
    title: 'Fjord Telemetry 2-Year Scale Renewal (+35% NRR)',
    account: 'Fjord Telemetry Co. · $88.8K ARR',
    csm: 'Defne Arslan',
    priority: 'medium',
    region: 'Europe',
    due: new Date(2026, 9, 29),
    tags: ['Scale', 'Renewed'],
    checklist: [
      { text: 'Order form signed in DocuSign', done: true },
      { text: 'Provision additional 32 seats', done: true },
    ],
  },
];

export const PIVOT_CUSTOMER_ROWS: readonly CustomerPivotRow[] = [
  { id: 1, region: 'North America', country: 'United States', tier: 'Enterprise', status: 'Active', date: '2025-03-14', arr: 165000, seats: 150, expansion: 32000 },
  { id: 2, region: 'North America', country: 'Canada', tier: 'Scale', status: 'Active', date: '2025-07-22', arr: 84000, seats: 85, expansion: 14500 },
  { id: 3, region: 'Europe', country: 'Germany', tier: 'Enterprise', status: 'Active', date: '2025-05-11', arr: 198000, seats: 190, expansion: 41000 },
  { id: 4, region: 'Europe', country: 'Türkiye', tier: 'Scale', status: 'Active', date: '2025-09-19', arr: 74000, seats: 78, expansion: 16200 },
  { id: 5, region: 'Asia-Pacific', country: 'Japan', tier: 'Enterprise', status: 'Active', date: '2025-11-04', arr: 230000, seats: 240, expansion: 54000 },
  { id: 6, region: 'North America', country: 'United States', tier: 'Enterprise', status: 'Active', date: '2026-02-10', arr: 215000, seats: 210, expansion: 48000 },
  { id: 7, region: 'North America', country: 'United States', tier: 'Growth', status: 'At Risk', date: '2026-04-18', arr: 41400, seats: 42, expansion: 0 },
  { id: 8, region: 'Europe', country: 'Sweden', tier: 'Scale', status: 'Active', date: '2026-03-25', arr: 88800, seats: 92, expansion: 21000 },
  { id: 9, region: 'Europe', country: 'Türkiye', tier: 'Enterprise', status: 'Active', date: '2026-06-12', arr: 156000, seats: 148, expansion: 36500 },
  { id: 10, region: 'Europe', country: 'Germany', tier: 'Enterprise', status: 'Active', date: '2026-08-05', arr: 242000, seats: 230, expansion: 58000 },
  { id: 11, region: 'Asia-Pacific', country: 'Japan', tier: 'Enterprise', status: 'Active', date: '2026-05-20', arr: 268000, seats: 275, expansion: 64000 },
  { id: 12, region: 'Asia-Pacific', country: 'Singapore', tier: 'Growth', status: 'Onboarding', date: '2026-07-14', arr: 52000, seats: 54, expansion: 9500 },
  { id: 13, region: 'Latin America', country: 'Brazil', tier: 'Scale', status: 'Active', date: '2026-04-03', arr: 71400, seats: 68, expansion: 14800 },
  { id: 14, region: 'Latin America', country: 'Chile', tier: 'Growth', status: 'Onboarding', date: '2026-09-09', arr: 34680, seats: 34, expansion: 6200 },
];

export const QBR_RESOURCES = [
  {
    fieldExpr: 'csmId',
    label: 'Customer Success Manager',
    useColorAsDefault: true,
    items: [
      { id: 1, text: 'Elena Rostova (Americas)', color: '#4f46e5' },
      { id: 2, text: 'Defne Arslan (EMEA)', color: '#0891b2' },
      { id: 3, text: 'Kenji Watanabe (APAC)', color: '#059669' },
    ],
  },
];

export const INITIAL_QBR_APPOINTMENTS: QbrAppointment[] = [
  {
    id: 1,
    text: 'Northwind Relay — Executive QBR & DR Expansion',
    startDate: new Date(2026, 9, 19, 9, 30),
    endDate: new Date(2026, 9, 19, 11, 0),
    csmId: 1,
    location: 'Zoom Executive Room A',
    description: 'Review 99.995% SLA performance and finalize multi-region DR expansion.',
  },
  {
    id: 2,
    text: 'Bosphorus Cloud — Architecture Health Check',
    startDate: new Date(2026, 9, 20, 10, 0),
    endDate: new Date(2026, 9, 20, 11, 30),
    csmId: 2,
    location: 'Istanbul Hybrid Studio',
    description: 'Inspect SSO SCIM provisioning and OGE Grid telemetry.',
  },
  {
    id: 3,
    text: 'Kibo Robotics — 240-Seat ELA Renewal Sign-Off',
    startDate: new Date(2026, 9, 21, 13, 0),
    endDate: new Date(2026, 9, 21, 14, 30),
    csmId: 3,
    location: 'Tokyo Executive Briefing Center',
    description: 'Final legal & procurement review for 3-year Enterprise License Agreement.',
  },
  {
    id: 4,
    text: 'Redwood Signal — Retention Escalation War Room',
    startDate: new Date(2026, 9, 22, 11, 0),
    endDate: new Date(2026, 9, 22, 12, 30),
    csmId: 1,
    location: 'Slack Huddle / Meet',
    description: 'Mitigate webhook latency and deliver 90-day customer success plan.',
  },
  {
    id: 5,
    text: 'Danube FinTech — SOC2 & DORA Compliance Audit',
    startDate: new Date(2026, 9, 23, 14, 0),
    endDate: new Date(2026, 9, 23, 15, 30),
    csmId: 2,
    location: 'Vienna Security Portal',
    description: 'Walk through customer-managed encryption keys (CMEK) and audit logs.',
  },
];

export const ONBOARDING_GANTT_TASKS: OnboardingGanttTask[] = [
  {
    id: 1,
    parentId: null,
    title: 'Phase 1: Enterprise Tenant & Identity Provisioning',
    start: new Date(2026, 9, 1),
    end: new Date(2026, 9, 14),
    progress: 100,
    color: '#4f46e5',
  },
  {
    id: 2,
    parentId: 1,
    title: 'Provision dedicated EU/US multi-region cluster',
    start: new Date(2026, 9, 1),
    end: new Date(2026, 9, 6),
    progress: 100,
    resourceId: [1],
  },
  {
    id: 3,
    parentId: 1,
    title: 'Configure Okta SAML 2.0 & SCIM directory sync',
    start: new Date(2026, 9, 6),
    end: new Date(2026, 9, 14),
    progress: 100,
    resourceId: [2],
  },
  {
    id: 4,
    parentId: null,
    title: 'Phase 2: Historical CRM Migration & Webhook Mesh',
    start: new Date(2026, 9, 14),
    end: new Date(2026, 9, 29),
    progress: 72,
    color: '#0891b2',
  },
  {
    id: 5,
    parentId: 4,
    title: 'Ingest 2.4M historical billing & subscription events',
    start: new Date(2026, 9, 14),
    end: new Date(2026, 9, 22),
    progress: 90,
    resourceId: [2, 3],
  },
  {
    id: 6,
    parentId: 4,
    title: 'Validate real-time Stripe & ERP webhook pipelines',
    start: new Date(2026, 9, 22),
    end: new Date(2026, 9, 29),
    progress: 55,
    resourceId: [3],
  },
  {
    id: 7,
    parentId: null,
    title: 'Phase 3: CSM Playbook Training & Production Go-Live',
    start: new Date(2026, 9, 29),
    end: new Date(2026, 10, 12),
    progress: 25,
    color: '#059669',
  },
  {
    id: 8,
    parentId: 7,
    title: 'Conduct executive admin & AI Copilot workshop',
    start: new Date(2026, 9, 29),
    end: new Date(2026, 10, 6),
    progress: 40,
    resourceId: [1],
  },
  {
    id: 9,
    parentId: 7,
    title: 'Production cutover & 30-day hypercare sign-off',
    start: new Date(2026, 10, 6),
    end: new Date(2026, 10, 12),
    progress: 0,
    resourceId: [1, 2],
  },
];

export const ONBOARDING_GANTT_DEPS: OnboardingGanttDep[] = [
  { id: 1, predecessorId: 2, successorId: 3, type: 'FS' },
  { id: 2, predecessorId: 3, successorId: 5, type: 'FS' },
  { id: 3, predecessorId: 5, successorId: 6, type: 'FS' },
  { id: 4, predecessorId: 6, successorId: 8, type: 'FS' },
  { id: 5, predecessorId: 8, successorId: 9, type: 'FS' },
];

export const ONBOARDING_GANTT_RESOURCES = [
  { id: 1, text: 'Elena Rostova (Lead CSM)', color: '#4f46e5' },
  { id: 2, text: 'Defne Arslan (Solutions Architect)', color: '#0891b2' },
  { id: 3, text: 'Kenji Watanabe (Data Engineer)', color: '#059669' },
];

export const RENEWAL_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_PulseRenewal"
  targetNamespace="http://ogeui.com/schema/bpmn">
  <bpmn:process id="Process_CustomerRenewal" name="Automated Customer Health &amp; Renewal Playbook" isExecutable="true">
    <bpmn:startEvent id="Start_90Days" name="90 Days to Renewal">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_HealthScore" name="Compute Telemetry Health Score">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:exclusiveGateway id="Gw_Health" name="Health &gt;= 80?" default="Flow_Healthy">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_Healthy</bpmn:outgoing>
      <bpmn:outgoing>Flow_AtRisk</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:serviceTask id="Task_AutoQuote" name="Generate Multi-Year Expansion Quote">
      <bpmn:incoming>Flow_Healthy</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_ExecEscalation" name="CSM &amp; VP Success Save Playbook">
      <bpmn:incoming>Flow_AtRisk</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_Renewed" name="Subscription Renewed">
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:incoming>Flow_5</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_90Days" targetRef="Task_HealthScore" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_HealthScore" targetRef="Gw_Health" />
    <bpmn:sequenceFlow id="Flow_Healthy" name="Healthy (&gt;=80)" sourceRef="Gw_Health" targetRef="Task_AutoQuote" />
    <bpmn:sequenceFlow id="Flow_AtRisk" name="At Risk (&lt;80)" sourceRef="Gw_Health" targetRef="Task_ExecEscalation">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">healthScore &lt; 80</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_AutoQuote" targetRef="End_Renewed" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_ExecEscalation" targetRef="End_Renewed" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Pulse">
    <bpmndi:BPMNPlane id="BPMNPlane_Pulse" bpmnElement="Process_CustomerRenewal">
      <bpmndi:BPMNShape id="Start_90Days_di" bpmnElement="Start_90Days">
        <dc:Bounds x="70" y="142" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_HealthScore_di" bpmnElement="Task_HealthScore">
        <dc:Bounds x="165" y="120" width="140" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gw_Health_di" bpmnElement="Gw_Health" isMarkerVisible="true">
        <dc:Bounds x="365" y="135" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_AutoQuote_di" bpmnElement="Task_AutoQuote">
        <dc:Bounds x="480" y="55" width="150" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ExecEscalation_di" bpmnElement="Task_ExecEscalation">
        <dc:Bounds x="480" y="195" width="150" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Renewed_di" bpmnElement="End_Renewed">
        <dc:Bounds x="705" y="142" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="106" y="160" />
        <di:waypoint x="165" y="160" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="305" y="160" />
        <di:waypoint x="365" y="160" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Healthy_di" bpmnElement="Flow_Healthy">
        <di:waypoint x="390" y="135" />
        <di:waypoint x="390" y="95" />
        <di:waypoint x="480" y="95" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_AtRisk_di" bpmnElement="Flow_AtRisk">
        <di:waypoint x="390" y="185" />
        <di:waypoint x="390" y="235" />
        <di:waypoint x="480" y="235" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="630" y="95" />
        <di:waypoint x="723" y="95" />
        <di:waypoint x="723" y="142" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="630" y="235" />
        <di:waypoint x="723" y="235" />
        <di:waypoint x="723" y="178" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export const INITIAL_COPILOT_MESSAGES: readonly OgeChatMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    text: 'Welcome to PulseCRM AI Copilot! Ask me about Net Revenue Retention (128% NRR), at-risk accounts, Enterprise expansion opportunities, or use the AI Grid Assistant & Smart Paste tools alongside this chat.',
  },
];

export const SMART_PASTE_SAMPLE = `Name: Dr. Sofia Lindholm
Company: Nordisk BioCompute AB
Work Email: sofia.lindholm@nordisk-biocompute.example
Region: Europe
Tier: Enterprise
Status: Active
MRR: 18500
Seats: 210`;

export function createPulseAiTransport(): OgeAiTransport {
  return {
    async complete(request: OgeAiRequest): Promise<OgeAiResponse> {
      await new Promise((resolve) => setTimeout(resolve, 260));
      const lastMsg =
        request.messages[request.messages.length - 1]?.content?.toLowerCase() ?? '';

      if (request.feature === 'grid-assistant') {
        if (lastMsg.includes('enterprise')) {
          return {
            text: JSON.stringify({
              action: 'apply',
              summary: 'Filtered to Enterprise accounts sorted by MRR descending',
              filter: ['tier', '=', 'Enterprise'],
              sort: [{ field: 'mrr', direction: 'desc' }],
            }),
          };
        }
        if (lastMsg.includes('risk')) {
          return {
            text: JSON.stringify({
              action: 'apply',
              summary: 'Filtered to At Risk accounts requiring CSM escalation',
              filter: ['status', '=', 'At Risk'],
              sort: [{ field: 'healthScore', direction: 'asc' }],
            }),
          };
        }
        if (lastMsg.includes('region') || lastMsg.includes('group')) {
          return {
            text: JSON.stringify({
              action: 'apply',
              summary: 'Grouped customer accounts by Region and sorted by MRR',
              group: ['region'],
              sort: [{ field: 'mrr', direction: 'desc' }],
            }),
          };
        }
        return {
          text: JSON.stringify({
            action: 'apply',
            summary: 'Sorted customer accounts by MRR descending',
            sort: [{ field: 'mrr', direction: 'desc' }],
          }),
        };
      }

      if (request.feature === 'smart-paste') {
        return {
          text: JSON.stringify({
            action: 'fill',
            values: {
              name: 'Dr. Sofia Lindholm',
              company: 'Nordisk BioCompute AB',
              email: 'sofia.lindholm@nordisk-biocompute.example',
              region: 'Europe',
              tier: 'Enterprise',
              status: 'Active',
              mrr: 18500,
              seats: 210,
            },
          }),
        };
      }

      if (lastMsg.includes('risk') || lastMsg.includes('churn')) {
        return {
          text: 'Currently 1 account is flagged At Risk: Redwood Signal Systems ($3,450 MRR, Health Score 54/100). An escalation war-room is scheduled with Elena Rostova on Thursday at 11:00 AM, and the BPMN Save Playbook has been triggered.',
        };
      }
      if (lastMsg.includes('nrr') || lastMsg.includes('expansion')) {
        return {
          text: 'Portfolio Net Revenue Retention stands at 128% in October ($1.45M ARR). Top expansion opportunities in progress: Kibo Robotics Studio (+120 seats, $230.4K ARR) and Northwind Relay Labs (Multi-Region DR add-on, $177.6K ARR).',
        };
      }
      return {
        text: 'PulseCRM Portfolio Snapshot: 12 active accounts generating $89,850 MRR ($1.078M ARR) across 1,079 licensed seats with 91.2% average telemetry health score.',
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

export const PROJECT_NAMES = ['Northwind Relay · Multi-region DR', 'Kibo Robotics · Platform migration', 'Fjord Telemetry · SSO rollout'] as const;

const P1 = PROJECT_NAMES[0];
const P2 = PROJECT_NAMES[1];
const P3 = PROJECT_NAMES[2];

const A1 = 'Elena Rostova';
const A2 = 'Defne Arslan';
const A3 = 'Kenji Watanabe';
const A4 = 'Clara Vance';

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

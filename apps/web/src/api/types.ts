// Tipos espejo de las respuestas de la API (apps/api)

export type Segment = 'al_dia' | 'mora_administrativa' | 'en_riesgo' | 'critico';
export type SuggestedAction = 'none' | 'soft_reminder' | 'call' | 'escalate';
export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';
export type InvoiceStatus = 'open' | 'partially_paid' | 'paid' | 'void';
export type ActionType = 'call' | 'email' | 'note' | 'payment_promise';
export type PromiseStatus = 'pending' | 'kept' | 'broken';
export type CustomerSize = 'small' | 'mid' | 'enterprise';

export interface PortfolioKpis {
  totalReceivable: number;
  totalOverdue: number;
  overduePercentage: number;
  dso: number;
  customersInArrears: number;
  activePromises: { count: number; amount: number };
}

export interface AgingBucketSummary {
  amount: number;
  invoiceCount: number;
  customerCount: number;
}

export interface AgingReport {
  buckets: Record<AgingBucket, AgingBucketSummary>;
  totalOverdue: number;
}

export interface SegmentSummary {
  segment: Segment;
  customerCount: number;
  overdueAmount: number;
}

export interface ScoreBreakdownItem {
  factor: string;
  points: number;
  maxPoints: number;
  reason: string;
}

export interface WorkQueueItem {
  customerId: string;
  name: string;
  size: CustomerSize;
  segment: Segment;
  score: number;
  breakdown: ScoreBreakdownItem[];
  overdueAmount: number;
  maxDaysOverdue: number;
  bucket: AgingBucket | null;
  brokenPromises: number;
  hasActivePromise: boolean;
  lastAction: { type: ActionType; createdAt: string } | null;
  suggestedAction: SuggestedAction;
  priority: number;
}

export interface CustomerEvaluation {
  segment: Segment;
  score: number;
  breakdown: ScoreBreakdownItem[];
  suggestedAction: SuggestedAction;
  priority: number;
  overdueAmount: number;
  maxDaysOverdue: number;
  bucket: AgingBucket | null;
  trend: 'improving' | 'stable' | 'worsening' | 'unknown';
  brokenPromises: number;
  hasActivePromise: boolean;
}

export interface InvoiceDetail {
  id: string;
  customerId: string;
  amount: number;
  issuedDate: string;
  dueDate: string;
  status: InvoiceStatus;
  daysOverdue: number;
  outstanding: number;
}

export interface CollectionAction {
  id: string;
  customerId: string;
  invoiceId?: string;
  type: ActionType;
  notes?: string;
  promisedDate?: string;
  promiseStatus?: PromiseStatus;
  createdAt: string;
}

export interface CustomerDetail {
  customer: { id: string; name: string; size: CustomerSize; mrr: number };
  evaluation: CustomerEvaluation;
  invoices: InvoiceDetail[];
  actions: CollectionAction[];
}

export interface CreateActionBody {
  type: ActionType;
  invoiceId?: string;
  notes?: string;
  promisedDate?: string;
}

export interface CreatePaymentBody {
  amount: number;
  paidAt?: string;
}

export interface RegisterPaymentResult {
  payment: { id: string; invoiceId: string; amount: number; paidAt: string };
  invoiceStatus: InvoiceStatus;
  outstandingAfter: number;
  keptPromiseIds: string[];
}

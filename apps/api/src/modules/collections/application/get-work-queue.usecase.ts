import type { AgingBucket } from '../domain/aging';
import { evaluateCustomer } from '../domain/customer-status';
import type { ScoreBreakdownItem } from '../domain/risk-scoring';
import type {
  ActionType,
  CustomerSize,
  Segment,
  SuggestedAction,
} from '../domain/types';
import type { CollectionsRepository } from './ports/collections-repository.port';

export interface WorkQueueFilters {
  segment?: Segment;
  bucket?: AgingBucket;
  search?: string;
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
  lastAction: { type: ActionType; createdAt: Date } | null;
  suggestedAction: SuggestedAction;
  priority: number;
}

export class GetWorkQueueUseCase {
  constructor(private readonly repository: CollectionsRepository) {}

  async execute(filters: WorkQueueFilters = {}, today: Date = new Date()): Promise<WorkQueueItem[]> {
    const snapshots = await this.repository.loadAllSnapshots();

    const items = snapshots
      .map((snapshot): WorkQueueItem => {
        const evaluation = evaluateCustomer(snapshot, today);
        const lastAction = snapshot.actions.reduce<WorkQueueItem['lastAction']>(
          (latest, action) =>
            !latest || action.createdAt > latest.createdAt
              ? { type: action.type, createdAt: action.createdAt }
              : latest,
          null,
        );
        return {
          customerId: snapshot.customer.id,
          name: snapshot.customer.name,
          size: snapshot.customer.size,
          segment: evaluation.segment,
          score: evaluation.score,
          breakdown: evaluation.breakdown,
          overdueAmount: evaluation.overdueAmount,
          maxDaysOverdue: evaluation.maxDaysOverdue,
          bucket: evaluation.bucket,
          brokenPromises: evaluation.brokenPromises,
          hasActivePromise: evaluation.hasActivePromise,
          lastAction,
          suggestedAction: evaluation.suggestedAction,
          priority: evaluation.priority,
        };
      })
      .filter((item) => item.overdueAmount > 0)
      .filter((item) => !filters.segment || item.segment === filters.segment)
      .filter((item) => !filters.bucket || item.bucket === filters.bucket)
      .filter(
        (item) =>
          !filters.search || item.name.toLowerCase().includes(filters.search.toLowerCase()),
      );

    return items.sort((a, b) => b.priority - a.priority);
  }
}

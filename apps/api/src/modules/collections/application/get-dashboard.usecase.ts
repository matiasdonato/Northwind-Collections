import type { AgingReport } from '../domain/aging';
import { buildAgingReport } from '../domain/aging';
import { evaluateCustomer } from '../domain/customer-status';
import type { PortfolioKpis } from '../domain/kpis';
import { computeKpis } from '../domain/kpis';
import type { Segment } from '../domain/types';
import { round2 } from '../domain/types';
import type { CollectionsRepository } from './ports/collections-repository.port';

export interface SegmentSummary {
  segment: Segment;
  customerCount: number;
  overdueAmount: number;
}

export interface DashboardView {
  kpis: PortfolioKpis;
  aging: AgingReport;
  segments: SegmentSummary[];
}

const SEGMENT_ORDER: Segment[] = ['al_dia', 'mora_administrativa', 'en_riesgo', 'critico'];

export class GetDashboardUseCase {
  constructor(private readonly repository: CollectionsRepository) {}

  async execute(today: Date = new Date()): Promise<DashboardView> {
    const snapshots = await this.repository.loadAllSnapshots();

    const allInvoices = snapshots.flatMap((s) => s.invoices);
    const allPayments = snapshots.flatMap((s) => s.payments);

    const segmentMap = new Map<Segment, SegmentSummary>(
      SEGMENT_ORDER.map((segment) => [segment, { segment, customerCount: 0, overdueAmount: 0 }]),
    );
    for (const snapshot of snapshots) {
      const evaluation = evaluateCustomer(snapshot, today);
      const summary = segmentMap.get(evaluation.segment)!;
      summary.customerCount += 1;
      summary.overdueAmount = round2(summary.overdueAmount + evaluation.overdueAmount);
    }

    return {
      kpis: computeKpis(snapshots, today),
      aging: buildAgingReport(allInvoices, allPayments, today),
      segments: SEGMENT_ORDER.map((segment) => segmentMap.get(segment)!),
    };
  }
}

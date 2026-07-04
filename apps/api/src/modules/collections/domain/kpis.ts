import { daysBetween, daysOverdue, outstandingAmount } from './aging';
import { hasActivePromise } from './promises';
import type { CustomerSnapshot } from './types';
import { round2 } from './types';

/**
 * KPIs de salud de cartera para el dashboard.
 * La mora se mide POR MONTO (monto vencido / monto por cobrar): es lo que
 * le duele a la caja (supuesto documentado en DECISIONS.md).
 */

export interface PortfolioKpis {
  /** Total facturado pendiente de cobro (vencido o no) */
  totalReceivable: number;
  /** Total vencido e impago */
  totalOverdue: number;
  /** Mora por monto: vencido / por cobrar, en % */
  overduePercentage: number;
  /** Days Sales Outstanding: por cobrar / venta diaria promedio (últimos 90 días) */
  dso: number;
  customersInArrears: number;
  activePromises: { count: number; amount: number };
}

const DSO_WINDOW_DAYS = 90;

export function computeKpis(snapshots: CustomerSnapshot[], today: Date): PortfolioKpis {
  let totalReceivable = 0;
  let totalOverdue = 0;
  let salesInWindow = 0;
  let customersInArrears = 0;
  let promisesCount = 0;
  let promisesAmount = 0;

  for (const { invoices, payments, actions } of snapshots) {
    let customerOverdue = 0;

    for (const invoice of invoices) {
      if (invoice.status === 'void') continue;

      const windowAge = daysBetween(invoice.issuedDate, today);
      if (windowAge >= 0 && windowAge <= DSO_WINDOW_DAYS) {
        salesInWindow += invoice.amount;
      }

      const outstanding = outstandingAmount(invoice, payments);
      if (outstanding <= 0) continue;

      totalReceivable += outstanding;
      if (daysOverdue(invoice, today) > 0) {
        customerOverdue += outstanding;
      }
    }

    if (customerOverdue > 0) {
      customersInArrears += 1;
      totalOverdue += customerOverdue;

      if (hasActivePromise(actions, payments, today)) {
        promisesCount += 1;
        promisesAmount += customerOverdue;
      }
    }
  }

  const overduePercentage =
    totalReceivable > 0 ? round2((totalOverdue / totalReceivable) * 100) : 0;
  const dailySales = salesInWindow / DSO_WINDOW_DAYS;
  const dso = dailySales > 0 ? Math.round(totalReceivable / dailySales) : 0;

  return {
    totalReceivable: round2(totalReceivable),
    totalOverdue: round2(totalOverdue),
    overduePercentage,
    dso,
    customersInArrears,
    activePromises: { count: promisesCount, amount: round2(promisesAmount) },
  };
}

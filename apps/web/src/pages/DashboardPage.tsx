import { Link } from 'react-router-dom';
import { useAging, useKpis, useSegments } from '../api/hooks';
import type { AgingBucket } from '../api/types';
import { fmtMoney } from '../lib/format';
import { Card, EmptyState, ErrorState, Loading, SegmentBadge } from '../components/ui';

const BUCKETS: AgingBucket[] = ['0-30', '31-60', '61-90', '90+'];

function KpiCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </Card>
  );
}

export function DashboardPage() {
  const kpis = useKpis();
  const aging = useAging();
  const segments = useSegments();

  if (kpis.isLoading || aging.isLoading || segments.isLoading) {
    return <Loading label="Cargando la salud de la cartera…" />;
  }
  if (kpis.isError || !kpis.data) {
    return <ErrorState message={kpis.error?.message ?? 'No se pudo cargar'} onRetry={() => void kpis.refetch()} />;
  }
  if (aging.isError || !aging.data) {
    return <ErrorState message={aging.error?.message ?? 'No se pudo cargar'} onRetry={() => void aging.refetch()} />;
  }
  if (segments.isError || !segments.data) {
    return (
      <ErrorState message={segments.error?.message ?? 'No se pudo cargar'} onRetry={() => void segments.refetch()} />
    );
  }

  const maxBucketAmount = Math.max(...BUCKETS.map((b) => aging.data.buckets[b].amount), 1);
  const overdueSegments = segments.data.filter((s) => s.segment !== 'al_dia');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Salud de la cartera</h1>
        <p className="text-sm text-slate-500">
          Diagnóstico general: dónde está la mora y cómo está compuesta.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Mora (por monto)"
          value={`${kpis.data.overduePercentage}%`}
          detail={`${fmtMoney(kpis.data.totalOverdue)} de ${fmtMoney(kpis.data.totalReceivable)} por cobrar`}
        />
        <KpiCard
          label="Monto vencido"
          value={fmtMoney(kpis.data.totalOverdue)}
          detail={`${kpis.data.customersInArrears} clientes en mora`}
        />
        <KpiCard label="DSO" value={`${kpis.data.dso} días`} detail="Días promedio de cobro" />
        <KpiCard
          label="Promesas activas"
          value={String(kpis.data.activePromises.count)}
          detail={`${fmtMoney(kpis.data.activePromises.amount)} comprometidos`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium">Antigüedad de la deuda vencida</h2>
          <p className="mb-4 text-xs text-slate-500">Click en un tramo para ver esos clientes en la cola</p>
          {aging.data.totalOverdue === 0 ? (
            <EmptyState title="🎉 No hay deuda vencida" />
          ) : (
            <div className="space-y-3">
              {BUCKETS.map((bucket) => {
                const summary = aging.data.buckets[bucket];
                return (
                  <Link
                    key={bucket}
                    to={`/cola?bucket=${encodeURIComponent(bucket)}`}
                    className="block rounded-md p-1 hover:bg-slate-50"
                  >
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{bucket} días</span>
                      <span className="text-slate-600">
                        {fmtMoney(summary.amount)} · {summary.customerCount} cliente(s)
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full bg-slate-100">
                      <div
                        className={`h-2.5 rounded-full ${bucket === '90+' ? 'bg-red-500' : bucket === '61-90' ? 'bg-amber-500' : 'bg-sky-500'}`}
                        style={{ width: `${(summary.amount / maxBucketAmount) * 100}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-medium">Composición por segmento</h2>
          <p className="mb-4 text-xs text-slate-500">
            No toda la mora es igual de grave: click en un segmento para gestionarlo
          </p>
          <div className="space-y-2">
            {segments.data.map((summary) => (
              <Link
                key={summary.segment}
                to={summary.segment === 'al_dia' ? '#' : `/cola?segment=${summary.segment}`}
                className={`flex items-center justify-between rounded-md border border-slate-100 p-3 ${
                  summary.segment === 'al_dia' ? 'cursor-default' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <SegmentBadge segment={summary.segment} />
                  <span className="text-sm text-slate-600">{summary.customerCount} cliente(s)</span>
                </div>
                <span className="text-sm font-medium">
                  {summary.segment === 'al_dia' ? '—' : fmtMoney(summary.overdueAmount)}
                </span>
              </Link>
            ))}
          </div>
          {overdueSegments.every((s) => s.customerCount === 0) && (
            <p className="mt-3 text-sm text-slate-500">Toda la cartera está al día.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

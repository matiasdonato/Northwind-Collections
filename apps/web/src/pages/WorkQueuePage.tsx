import { Link, useSearchParams } from 'react-router-dom';
import { useWorkQueue } from '../api/hooks';
import type { AgingBucket, Segment } from '../api/types';
import {
  ACTION_TYPE_LABEL,
  fmtDate,
  fmtMoney,
  SEGMENT_LABEL,
  SUGGESTED_ACTION_LABEL,
} from '../lib/format';
import { Card, EmptyState, ErrorState, Loading, SegmentBadge } from '../components/ui';

const SEGMENTS: Segment[] = ['mora_administrativa', 'en_riesgo', 'critico'];
const BUCKETS: AgingBucket[] = ['0-30', '31-60', '61-90', '90+'];

export function WorkQueuePage() {
  const [params, setParams] = useSearchParams();
  const filters = {
    segment: (params.get('segment') as Segment) ?? undefined,
    bucket: (params.get('bucket') as AgingBucket) ?? undefined,
    search: params.get('search') ?? undefined,
  };
  const queue = useWorkQueue(filters);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Cola de trabajo</h1>
        <p className="text-sm text-slate-500">
          Clientes en mora ordenados por prioridad (riesgo × monto). Empezá por el primero.
        </p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-slate-500">Segmento</span>
          <select
            value={filters.segment ?? ''}
            onChange={(e) => setFilter('segment', e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5"
          >
            <option value="">Todos</option>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {SEGMENT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-slate-500">Antigüedad</span>
          <select
            value={filters.bucket ?? ''}
            onChange={(e) => setFilter('bucket', e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5"
          >
            <option value="">Todas</option>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b} días
              </option>
            ))}
          </select>
        </label>
        <label className="grow text-sm">
          <span className="mb-1 block text-xs text-slate-500">Cliente</span>
          <input
            type="search"
            placeholder="Buscar por nombre…"
            defaultValue={filters.search ?? ''}
            onChange={(e) => setFilter('search', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5"
          />
        </label>
      </Card>

      {queue.isLoading && <Loading label="Priorizando la cartera…" />}
      {queue.isError && (
        <ErrorState message={queue.error.message} onRetry={() => void queue.refetch()} />
      )}
      {queue.data && queue.data.length === 0 && (
        <EmptyState
          title="🎉 Nada para gestionar con estos filtros"
          detail="No hay clientes en mora que coincidan. Probá quitando filtros."
        />
      )}

      {queue.data && queue.data.length > 0 && (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Segmento</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Vencido</th>
                <th className="px-4 py-3 text-right">Días</th>
                <th className="px-4 py-3">Última gestión</th>
                <th className="px-4 py-3">Acción sugerida</th>
              </tr>
            </thead>
            <tbody>
              {queue.data.map((item, index) => (
                <tr key={item.customerId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <Link to={`/clientes/${item.customerId}`} className="font-medium text-slate-900 hover:underline">
                      {item.name}
                    </Link>
                    {item.hasActivePromise && (
                      <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">
                        promesa vigente
                      </span>
                    )}
                    {item.brokenPromises > 0 && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                        {item.brokenPromises} promesa(s) rota(s)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SegmentBadge segment={item.segment} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{item.score}</td>
                  <td className="px-4 py-3 text-right">{fmtMoney(item.overdueAmount)}</td>
                  <td className="px-4 py-3 text-right">{item.maxDaysOverdue}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.lastAction
                      ? `${ACTION_TYPE_LABEL[item.lastAction.type]} · ${fmtDate(item.lastAction.createdAt)}`
                      : 'Sin gestiones'}
                  </td>
                  <td className="px-4 py-3">{SUGGESTED_ACTION_LABEL[item.suggestedAction]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

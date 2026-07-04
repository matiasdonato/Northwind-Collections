import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCustomer, useRegisterAction, useRegisterPayment } from '../api/hooks';
import type { ActionType, CustomerDetail } from '../api/types';
import {
  ACTION_TYPE_LABEL,
  FACTOR_LABEL,
  fmtDate,
  fmtMoney,
  fmtMoneyExact,
  fmtDateTime,
  INVOICE_STATUS_LABEL,
  SUGGESTED_ACTION_LABEL,
  TREND_LABEL,
} from '../lib/format';
import { Card, EmptyState, ErrorState, Loading, SegmentBadge } from '../components/ui';

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const customer = useCustomer(id);

  if (customer.isLoading) return <Loading label="Cargando el cliente…" />;
  if (customer.isError || !customer.data) {
    return (
      <ErrorState
        message={customer.error?.message ?? 'No se pudo cargar'}
        onRetry={() => void customer.refetch()}
      />
    );
  }

  const detail = customer.data;
  const { evaluation } = detail;

  return (
    <div className="space-y-4">
      <Link to="/cola" className="text-sm text-slate-500 hover:underline">
        ← Volver a la cola
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{detail.customer.name}</h1>
              <SegmentBadge segment={evaluation.segment} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              MRR {fmtMoney(detail.customer.mrr)} · Tendencia de pago: {TREND_LABEL[evaluation.trend]}
              {evaluation.suggestedAction !== 'none' && (
                <> · Acción sugerida: <span className="font-medium text-slate-700">{SUGGESTED_ACTION_LABEL[evaluation.suggestedAction]}</span></>
              )}
            </p>
          </div>
          <ScorePanel detail={detail} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <InvoicesCard detail={detail} />
        <div className="space-y-4">
          <RegisterActionCard customerId={detail.customer.id} />
          <HistoryCard detail={detail} />
        </div>
      </div>
    </div>
  );
}

function ScorePanel({ detail }: { detail: CustomerDetail }) {
  const [open, setOpen] = useState(false);
  const { evaluation } = detail;
  return (
    <div className="text-right">
      <p className="text-sm text-slate-500">Score de riesgo</p>
      <p className="text-3xl font-semibold">{evaluation.score}<span className="text-base text-slate-400">/100</span></p>
      <button onClick={() => setOpen(!open)} className="mt-1 text-xs text-sky-700 hover:underline">
        {open ? 'Ocultar por qué' : '¿Por qué este score?'}
      </button>
      {open && (
        <ul className="mt-2 w-72 space-y-1 rounded-md bg-slate-50 p-3 text-left text-xs">
          {evaluation.breakdown.map((item) => (
            <li key={item.factor} className="flex justify-between gap-2">
              <span className="text-slate-600" title={item.reason}>
                {FACTOR_LABEL[item.factor] ?? item.factor}
              </span>
              <span className="font-medium">
                {item.points}/{item.maxPoints}
              </span>
            </li>
          ))}
          <li className="border-t border-slate-200 pt-1 text-slate-500">
            Vencido: {fmtMoney(evaluation.overdueAmount)} · Mora máx.: {evaluation.maxDaysOverdue} días
          </li>
        </ul>
      )}
    </div>
  );
}

function InvoicesCard({ detail }: { detail: CustomerDetail }) {
  const payment = useRegisterPayment();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  const submit = (invoiceId: string) => {
    payment.mutate(
      { invoiceId, amount: Number(amount) },
      {
        onSuccess: () => {
          setPayingId(null);
          setAmount('');
        },
      },
    );
  };

  return (
    <Card>
      <h2 className="mb-3 font-medium">Facturas</h2>
      {detail.invoices.length === 0 && <EmptyState title="Sin facturas" />}
      <ul className="space-y-2">
        {detail.invoices.map((invoice) => (
          <li key={invoice.id} className="rounded-md border border-slate-100 p-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{fmtMoneyExact(invoice.amount)}</span>
                <span
                  className={`ml-2 rounded px-1.5 py-0.5 text-xs ${
                    invoice.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : invoice.daysOverdue > 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {INVOICE_STATUS_LABEL[invoice.status]}
                </span>
              </div>
              <span className="text-slate-500">
                Vence {fmtDate(invoice.dueDate)}
                {invoice.daysOverdue > 0 && ` · ${invoice.daysOverdue} días de mora`}
              </span>
            </div>
            {invoice.outstanding > 0 && invoice.status !== 'void' && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Saldo: {fmtMoneyExact(invoice.outstanding)}</span>
                {payingId === invoice.id ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submit(invoice.id);
                    }}
                  >
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={invoice.outstanding}
                      required
                      autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Monto USD"
                      className="w-28 rounded-md border border-slate-300 px-2 py-1"
                    />
                    <button
                      type="submit"
                      disabled={payment.isPending}
                      className="rounded-md bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {payment.isPending ? 'Registrando…' : 'Confirmar'}
                    </button>
                    <button type="button" onClick={() => setPayingId(null)} className="text-slate-500 hover:underline">
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setPayingId(invoice.id);
                      setAmount(String(invoice.outstanding));
                      payment.reset();
                    }}
                    className="rounded-md border border-emerald-600 px-3 py-1 text-emerald-700 hover:bg-emerald-50"
                  >
                    Registrar pago
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {payment.isError && <p className="mt-2 text-sm text-red-700">{payment.error.message}</p>}
      {payment.isSuccess && (
        <p className="mt-2 text-sm text-emerald-700">
          Pago registrado{payment.data.keptPromiseIds.length > 0 && ' — promesa de pago cumplida ✓'}
        </p>
      )}
    </Card>
  );
}

function RegisterActionCard({ customerId }: { customerId: string }) {
  const action = useRegisterAction(customerId);
  const [type, setType] = useState<ActionType>('call');
  const [notes, setNotes] = useState('');
  const [promisedDate, setPromisedDate] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    action.mutate(
      {
        type,
        notes: notes || undefined,
        promisedDate: type === 'payment_promise' ? promisedDate : undefined,
      },
      {
        onSuccess: () => {
          setNotes('');
          setPromisedDate('');
        },
      },
    );
  };

  return (
    <Card>
      <h2 className="mb-3 font-medium">Registrar gestión</h2>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <div className="flex gap-3">
          <label className="grow">
            <span className="mb-1 block text-xs text-slate-500">Tipo</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ActionType)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5"
            >
              {(Object.keys(ACTION_TYPE_LABEL) as ActionType[]).map((t) => (
                <option key={t} value={t}>
                  {ACTION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          {type === 'payment_promise' && (
            <label>
              <span className="mb-1 block text-xs text-slate-500">Fecha comprometida</span>
              <input
                type="date"
                required
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5"
              />
            </label>
          )}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Qué pasó en el contacto…"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={action.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {action.isPending ? 'Guardando…' : 'Guardar gestión'}
        </button>
        {action.isError && <p className="text-red-700">{action.error.message}</p>}
        {action.isSuccess && <p className="text-emerald-700">Gestión registrada ✓</p>}
      </form>
    </Card>
  );
}

function HistoryCard({ detail }: { detail: CustomerDetail }) {
  return (
    <Card>
      <h2 className="mb-3 font-medium">Historial de gestiones</h2>
      {detail.actions.length === 0 ? (
        <EmptyState title="Sin gestiones registradas" detail="Las gestiones que registres van a aparecer acá." />
      ) : (
        <ul className="space-y-3">
          {detail.actions.map((item) => (
            <li key={item.id} className="border-l-2 border-slate-200 pl-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{ACTION_TYPE_LABEL[item.type]}</span>
                {item.type === 'payment_promise' && item.promiseStatus && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      item.promiseStatus === 'kept'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.promiseStatus === 'broken'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-violet-100 text-violet-700'
                    }`}
                  >
                    {item.promiseStatus === 'kept' ? 'Cumplida' : item.promiseStatus === 'broken' ? 'Incumplida' : 'Vigente'}
                    {item.promisedDate && ` · ${fmtDate(item.promisedDate)}`}
                  </span>
                )}
                <span className="text-xs text-slate-400">{fmtDateTime(item.createdAt)}</span>
              </div>
              {item.notes && <p className="mt-0.5 text-slate-600">{item.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

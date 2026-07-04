import type { ActionType, InvoiceStatus, Segment, SuggestedAction } from '../api/types';

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const moneyExact = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export const fmtMoney = (value: number) => money.format(value);
export const fmtMoneyExact = (value: number) => moneyExact.format(value);

/** Las fechas de negocio son date-only: se formatean en UTC para evitar corrimientos */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const SEGMENT_LABEL: Record<Segment, string> = {
  al_dia: 'Al día',
  mora_administrativa: 'Mora administrativa',
  en_riesgo: 'En riesgo',
  critico: 'Crítico / zombi',
};

export const SEGMENT_STYLE: Record<Segment, string> = {
  al_dia: 'bg-emerald-100 text-emerald-800',
  mora_administrativa: 'bg-sky-100 text-sky-800',
  en_riesgo: 'bg-amber-100 text-amber-800',
  critico: 'bg-red-100 text-red-800',
};

export const SUGGESTED_ACTION_LABEL: Record<SuggestedAction, string> = {
  none: '—',
  soft_reminder: 'Recordatorio suave',
  call: 'Llamar',
  escalate: 'Escalar',
};

export const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  call: 'Llamada',
  email: 'Email',
  note: 'Nota',
  payment_promise: 'Promesa de pago',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  open: 'Abierta',
  partially_paid: 'Pago parcial',
  paid: 'Pagada',
  void: 'Anulada',
};

export const FACTOR_LABEL: Record<string, string> = {
  days_overdue: 'Antigüedad de la mora',
  exposure: 'Exposición (deuda vs. MRR)',
  broken_promises: 'Promesas incumplidas',
  trend: 'Tendencia de pago',
};

export const TREND_LABEL: Record<string, string> = {
  improving: 'Mejorando',
  stable: 'Estable',
  worsening: 'Empeorando',
  unknown: 'Sin historial',
};

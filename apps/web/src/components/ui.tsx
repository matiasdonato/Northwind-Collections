import type { ReactNode } from 'react';
import type { Segment } from '../api/types';
import { SEGMENT_LABEL, SEGMENT_STYLE } from '../lib/format';

/** Estados transversales: nunca una pantalla en blanco (FUNCTIONAL.md §7) */

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="font-medium text-red-800">Algo salió mal</p>
      <p className="text-sm text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
      >
        Reintentar
      </button>
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SegmentBadge({ segment }: { segment: Segment }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${SEGMENT_STYLE[segment]}`}
    >
      {SEGMENT_LABEL[segment]}
    </span>
  );
}

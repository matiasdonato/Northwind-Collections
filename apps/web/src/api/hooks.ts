import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  AgingBucket,
  AgingReport,
  CollectionAction,
  CreateActionBody,
  CreatePaymentBody,
  CustomerDetail,
  PortfolioKpis,
  RegisterPaymentResult,
  Segment,
  SegmentSummary,
  WorkQueueItem,
} from './types';

export interface WorkQueueFilters {
  segment?: Segment;
  bucket?: AgingBucket;
  search?: string;
}

export const useKpis = () =>
  useQuery({ queryKey: ['kpis'], queryFn: () => api<PortfolioKpis>('/dashboard/kpis') });

export const useAging = () =>
  useQuery({ queryKey: ['aging'], queryFn: () => api<AgingReport>('/dashboard/aging') });

export const useSegments = () =>
  useQuery({ queryKey: ['segments'], queryFn: () => api<SegmentSummary[]>('/dashboard/segments') });

export const useWorkQueue = (filters: WorkQueueFilters) =>
  useQuery({
    queryKey: ['work-queue', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.segment) params.set('segment', filters.segment);
      if (filters.bucket) params.set('bucket', filters.bucket);
      if (filters.search) params.set('search', filters.search);
      const qs = params.toString();
      return api<WorkQueueItem[]>(`/work-queue${qs ? `?${qs}` : ''}`);
    },
  });

export const useCustomer = (customerId: string) =>
  useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api<CustomerDetail>(`/customers/${customerId}`),
  });

/** Toda escritura invalida todo: las tres vistas derivan de los mismos datos */
const useInvalidateAll = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
};

export const useRegisterAction = (customerId: string) => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: (body: CreateActionBody) =>
      api<CollectionAction>(`/customers/${customerId}/actions`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateAll,
  });
};

export const useRegisterPayment = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: ({ invoiceId, ...body }: CreatePaymentBody & { invoiceId: string }) =>
      api<RegisterPaymentResult>(`/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidateAll,
  });
};

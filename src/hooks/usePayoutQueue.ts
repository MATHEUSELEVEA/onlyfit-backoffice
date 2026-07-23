import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approvePayout,
  createPayoutBatch,
  failManualPayout,
  finalizeManualPayout,
  listPayoutQueueDay,
  listPayoutQueueDays,
  recordManualPayout,
  rejectPayout,
  reversePaidPayout,
} from '../lib/payouts';

export function usePayoutQueueDays(enabled: boolean) {
  return useQuery({
    queryKey: ['payout-queue-days'],
    queryFn: listPayoutQueueDays,
    enabled,
    staleTime: 30 * 1000,
  });
}

export function usePayoutQueueDay(settlementDate: string | null) {
  return useQuery({
    queryKey: ['payout-queue-day', settlementDate],
    queryFn: () => listPayoutQueueDay(settlementDate as string),
    enabled: Boolean(settlementDate),
    staleTime: 15 * 1000,
  });
}

function invalidatePayoutQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['payout-queue-days'] });
  void queryClient.invalidateQueries({ queryKey: ['payout-queue-day'] });
}

export function useApprovePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approvePayout,
    onSuccess: () => invalidatePayoutQueries(queryClient),
  });
}

export function useRecordManualPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordManualPayout,
    onSuccess: () => invalidatePayoutQueries(queryClient),
  });
}

export function useFinalizeManualPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: finalizeManualPayout,
    onSuccess: () => invalidatePayoutQueries(queryClient),
  });
}

export function useCreatePayoutBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayoutBatch,
    onSuccess: () => invalidatePayoutQueries(queryClient),
  });
}

export function useRejectPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { payoutId: string; reason: string }) => rejectPayout(input.payoutId, input.reason),
    onSuccess: () => invalidatePayoutQueries(queryClient),
  });
}

export function useFailManualPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { payoutId: string; reason: string }) => failManualPayout(input.payoutId, input.reason),
    onSuccess: () => invalidatePayoutQueries(queryClient),
  });
}

export function useReversePaidPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { payoutId: string; reason: string }) => reversePaidPayout(input.payoutId, input.reason),
    onSuccess: () => invalidatePayoutQueries(queryClient),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  executePayouts,
  listPayoutQueueDay,
  listPayoutQueueDays,
  rejectPayout,
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

export function useExecutePayouts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payoutIds: string[]) => executePayouts(payoutIds),
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

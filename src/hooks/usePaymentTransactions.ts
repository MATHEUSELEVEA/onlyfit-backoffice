import { useQuery } from '@tanstack/react-query';
import { listPaymentTransactions, type TransactionFilters } from '../lib/paymentTransactions';

export function usePaymentTransactions(filters: TransactionFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['payment-transactions', filters],
    queryFn: () => listPaymentTransactions(filters),
    enabled,
    staleTime: 30 * 1000,
  });
}

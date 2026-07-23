import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listFinancialReconciliationRuns, recordTreasuryMovement, runFinancialReconciliation } from '../lib/financialReconciliation';

const key = ['financial-reconciliation-runs'];

export function useFinancialReconciliationRuns() {
  return useQuery({ queryKey: key, queryFn: listFinancialReconciliationRuns, staleTime: 30_000 });
}

export function useRunFinancialReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runFinancialReconciliation,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: key }); },
  });
}

export function useRecordTreasuryMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordTreasuryMovement,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: key }); },
  });
}

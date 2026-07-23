import { useQuery } from '@tanstack/react-query';
import { fetchFinancialReportsSnapshot } from '../lib/financialReports';

export function useFinancialReports(filters: { from?: string | null; to?: string | null }, enabled: boolean) {
  return useQuery({
    queryKey: ['financial-reports', filters],
    queryFn: () => fetchFinancialReportsSnapshot(filters),
    enabled,
    staleTime: 30 * 1000,
  });
}

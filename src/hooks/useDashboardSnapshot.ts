import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSnapshot } from '../lib/dashboard';

export function useDashboardSnapshot(enabled: boolean) {
  return useQuery({
    queryKey: ['backoffice-dashboard-snapshot'],
    queryFn: fetchDashboardSnapshot,
    enabled,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

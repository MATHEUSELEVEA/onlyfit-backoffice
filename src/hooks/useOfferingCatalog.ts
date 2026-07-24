import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listOfferingCatalog,
  syncProductOffering,
  type OfferingCatalogFilters,
} from '../lib/offeringCatalog';

export function useOfferingCatalog(filters: OfferingCatalogFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['offering-catalog', filters],
    queryFn: () => listOfferingCatalog(filters),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useSyncProductOffering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncProductOffering,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['offering-catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['offering-type-billing'] });
      void queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    },
  });
}

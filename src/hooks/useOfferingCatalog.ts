import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listOfferingCatalog,
  upsertAppStoreProduct,
  type AppStoreProductInput,
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

export function useUpsertAppStoreProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AppStoreProductInput) => upsertAppStoreProduct(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['offering-catalog'] });
    },
  });
}

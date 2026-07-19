import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listOfferingTypeBilling,
  updateOfferingTypeBilling,
  type BillingInterval,
  type BillingType,
} from '../lib/offeringTypes';

export function useOfferingTypeBilling(enabled: boolean) {
  return useQuery({
    queryKey: ['offering-type-billing'],
    queryFn: listOfferingTypeBilling,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useUpdateOfferingTypeBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      slug: string;
      billingType: BillingType;
      billingInterval: BillingInterval | null;
      minimumPrice: number;
      platformFeePercent: number;
      platformFeeFixed: number;
    }) =>
      updateOfferingTypeBilling(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['offering-type-billing'] });
    },
  });
}

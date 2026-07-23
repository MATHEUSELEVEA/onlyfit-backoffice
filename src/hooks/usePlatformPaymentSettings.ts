import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlatformPaymentSettings, updatePlatformPaymentSettings } from '../lib/paymentSettings';

export function usePlatformPaymentSettings(enabled: boolean) {
  return useQuery({
    queryKey: ['platform-payment-settings'],
    queryFn: getPlatformPaymentSettings,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useUpdatePlatformPaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      payoutProcessingHours: number;
      payoutMinimumAmount: number;
      cardSettlementDays: number;
      settlementWeekdays: number[];
    }) => updatePlatformPaymentSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-payment-settings'] });
    },
  });
}

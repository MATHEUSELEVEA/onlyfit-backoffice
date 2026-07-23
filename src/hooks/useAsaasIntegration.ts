import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAsaasIntegrationStatus,
  setAsaasCredentials,
  type AsaasEnvironment,
} from '../lib/asaasIntegration';

export function useAsaasIntegrationStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['asaas-integration-status'],
    queryFn: getAsaasIntegrationStatus,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useSetAsaasCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { environment: AsaasEnvironment; apiKey?: string | null; webhookToken?: string | null }) =>
      setAsaasCredentials(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asaas-integration-status'] });
    },
  });
}

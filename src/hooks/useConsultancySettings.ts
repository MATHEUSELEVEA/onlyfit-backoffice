import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConsultancyCourtesySettings,
  setConsultancyCourtesySettings,
  type ConsultancyCourtesySettingsInput,
} from '../lib/consultancySettings';

const queryKey = ['consultancy-courtesy-settings'];

export function useConsultancyCourtesySettings() {
  return useQuery({
    queryKey,
    queryFn: getConsultancyCourtesySettings,
    staleTime: 30 * 1000,
  });
}

export function useSetConsultancyCourtesySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsultancyCourtesySettingsInput) =>
      setConsultancyCourtesySettings(input),
    onSuccess: (settings) => queryClient.setQueryData(queryKey, settings),
  });
}

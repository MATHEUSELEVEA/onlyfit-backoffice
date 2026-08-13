import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFirstContactSettings,
  listContractsWithoutFirstContact,
  setFirstContactDeadlines,
} from '../lib/firstContact';

const settingsKey = ['first-contact-settings'];

export function useFirstContactSettings(enabled: boolean) {
  return useQuery({
    queryKey: settingsKey,
    queryFn: getFirstContactSettings,
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useSetFirstContactDeadlines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reminderHours, alertHours }: { reminderHours: number; alertHours: number }) =>
      setFirstContactDeadlines(reminderHours, alertHours),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKey, settings);
      // O prazo muda quem está na fila: a lista precisa ser relida.
      void queryClient.invalidateQueries({ queryKey: ['contracts-without-first-contact'] });
    },
  });
}

export function useContractsWithoutFirstContact(limit: number, offset: number, enabled: boolean) {
  return useQuery({
    queryKey: ['contracts-without-first-contact', limit, offset],
    queryFn: () => listContractsWithoutFirstContact(limit, offset),
    enabled,
    staleTime: 30 * 1000,
  });
}

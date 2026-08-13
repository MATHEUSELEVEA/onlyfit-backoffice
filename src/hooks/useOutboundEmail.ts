import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listSentEmails, sendOutboundEmail } from '../lib/outboundEmail';

export function useSentEmails(limit: number, offset: number, enabled: boolean) {
  return useQuery({
    queryKey: ['sent-emails', limit, offset],
    queryFn: () => listSentEmails(limit, offset),
    enabled,
    staleTime: 15_000,
  });
}

export function useSendOutboundEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendOutboundEmail,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sent-emails'] }),
  });
}

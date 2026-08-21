import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addInvitedEmails,
  getInviteSettings,
  listInvitedEmails,
  listWaitlist,
  releaseWaitlistAccess,
  removeInvitedEmail,
  sendInviteEmails,
  setInviteOnlyEnabled,
  type WaitlistStatus,
} from '../lib/inviteOnly';

const settingsKey = ['invite-settings'];

export function useInviteSettings(enabled: boolean) {
  return useQuery({
    queryKey: settingsKey,
    queryFn: getInviteSettings,
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useSetInviteOnlyEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: boolean) => setInviteOnlyEnabled(value),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKey, settings);
    },
  });
}

export function useInvitedEmails(search: string, limit: number, offset: number, enabled: boolean) {
  return useQuery({
    queryKey: ['invited-emails', search, limit, offset],
    queryFn: () => listInvitedEmails(search, limit, offset),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useAddInvitedEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ emails, note }: { emails: string[]; note: string }) => addInvitedEmails(emails, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invited-emails'] });
      void queryClient.invalidateQueries({ queryKey: ['access-waitlist'] });
      void queryClient.invalidateQueries({ queryKey: settingsKey });
    },
  });
}

export function useSendInviteEmails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emails: string[]) => sendInviteEmails(emails),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invited-emails'] });
    },
  });
}

export function useRemoveInvitedEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => removeInvitedEmail(email),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invited-emails'] });
      void queryClient.invalidateQueries({ queryKey: settingsKey });
    },
  });
}

export function useWaitlist(
  status: WaitlistStatus,
  search: string,
  limit: number,
  offset: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['access-waitlist', status, search, limit, offset],
    queryFn: () => listWaitlist(status, search, limit, offset),
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useReleaseWaitlistAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => releaseWaitlistAccess(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['access-waitlist'] });
      void queryClient.invalidateQueries({ queryKey: ['invited-emails'] });
      void queryClient.invalidateQueries({ queryKey: settingsKey });
    },
  });
}

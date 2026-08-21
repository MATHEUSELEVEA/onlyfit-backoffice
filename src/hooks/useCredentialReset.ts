import { useMutation } from '@tanstack/react-query';
import { resetUserCredentials, type CredentialResetAction } from '../lib/credentialReset';

export function useResetUserCredentials() {
  return useMutation({
    mutationFn: ({ userId, action, reason }: { userId: string; action: CredentialResetAction; reason?: string }) =>
      resetUserCredentials(userId, action, reason),
  });
}

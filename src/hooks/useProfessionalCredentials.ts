import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProfessionalCredentialReviews, reviewProfessionalCredential, type CredentialStatus } from '../lib/professionalCredentials';

export function useProfessionalCredentialReviews(status: CredentialStatus) {
  return useQuery({
    queryKey: ['professional-credential-reviews', status],
    queryFn: () => listProfessionalCredentialReviews(status),
    staleTime: 15_000,
  });
}

export function useReviewProfessionalCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reviewProfessionalCredential,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professional-credential-reviews'] }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFeedbackScreenshotUrl,
  listBetaFeedback,
  type BetaFeedbackStatus,
  updateBetaFeedback,
} from '../lib/betaFeedback';

export function useBetaFeedback(status: BetaFeedbackStatus | null, limit: number, offset: number) {
  return useQuery({
    queryKey: ['beta-feedback', status, limit, offset],
    queryFn: () => listBetaFeedback(status, limit, offset),
    staleTime: 20_000,
  });
}

export function useFeedbackScreenshot(path: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['beta-feedback-screenshot', path],
    queryFn: () => createFeedbackScreenshotUrl(path!),
    enabled: enabled && Boolean(path),
    staleTime: 240_000,
  });
}

export function useUpdateBetaFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBetaFeedback,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['beta-feedback'] }),
  });
}

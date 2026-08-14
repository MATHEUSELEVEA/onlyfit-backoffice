import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listReviewReports,
  resolveReviewReport,
  type ReviewReportStatus,
} from '../lib/reviewModeration';

export function useReviewReports(status: ReviewReportStatus, limit: number, offset: number) {
  return useQuery({
    queryKey: ['review-reports', status, limit, offset],
    queryFn: () => listReviewReports(status, limit, offset),
    staleTime: 20_000,
  });
}

export function useResolveReviewReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveReviewReport,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['review-reports'] }),
  });
}

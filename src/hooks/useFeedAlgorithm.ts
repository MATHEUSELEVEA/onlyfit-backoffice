import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFeedAlgorithmSettings,
  updateFeedAlgorithmSettings,
  type FeedAlgorithmInput,
} from '../lib/feedSettings';

export function useFeedAlgorithmSettings(enabled: boolean) {
  return useQuery({
    queryKey: ['feed-algorithm-settings'],
    queryFn: getFeedAlgorithmSettings,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useUpdateFeedAlgorithmSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FeedAlgorithmInput) => updateFeedAlgorithmSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed-algorithm-settings'] });
    },
  });
}

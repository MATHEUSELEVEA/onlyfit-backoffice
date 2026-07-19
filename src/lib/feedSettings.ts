import { supabase } from './supabase';

export type FeedMode = 'algorithm' | 'random';

export type FeedAlgorithmSettings = {
  mode: FeedMode;
  weight_affinity: number;
  weight_retention: number;
  weight_engagement: number;
  weight_novelty: number;
  weight_exploration: number;
  penalty_quickly_skipped: number;
  penalty_already_watched: number;
  diversity_creator_penalty: number;
  diversity_topic_penalty: number;
  novelty_half_life_hours: number;
  updated_at: string | null;
};

export type FeedAlgorithmInput = {
  mode: FeedMode;
  weightAffinity: number;
  weightRetention: number;
  weightEngagement: number;
  weightNovelty: number;
  weightExploration: number;
  penaltyQuicklySkipped: number;
  penaltyAlreadyWatched: number;
  diversityCreatorPenalty: number;
  diversityTopicPenalty: number;
  noveltyHalfLifeHours: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function parseSettings(value: unknown): FeedAlgorithmSettings {
  const row = asRecord(value);
  return {
    mode: row.mode === 'random' ? 'random' : 'algorithm',
    weight_affinity: numberFrom(row.weight_affinity),
    weight_retention: numberFrom(row.weight_retention),
    weight_engagement: numberFrom(row.weight_engagement),
    weight_novelty: numberFrom(row.weight_novelty),
    weight_exploration: numberFrom(row.weight_exploration),
    penalty_quickly_skipped: numberFrom(row.penalty_quickly_skipped),
    penalty_already_watched: numberFrom(row.penalty_already_watched),
    diversity_creator_penalty: numberFrom(row.diversity_creator_penalty),
    diversity_topic_penalty: numberFrom(row.diversity_topic_penalty),
    novelty_half_life_hours: numberFrom(row.novelty_half_life_hours),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function getFeedAlgorithmSettings(): Promise<FeedAlgorithmSettings> {
  const { data, error } = await supabase.rpc('control_get_feed_algorithm_settings');
  if (error) throw error;
  return parseSettings(data);
}

export async function updateFeedAlgorithmSettings(input: FeedAlgorithmInput): Promise<FeedAlgorithmSettings> {
  const { data, error } = await supabase.rpc('control_update_feed_algorithm_settings', {
    p_mode: input.mode,
    p_weight_affinity: input.weightAffinity,
    p_weight_retention: input.weightRetention,
    p_weight_engagement: input.weightEngagement,
    p_weight_novelty: input.weightNovelty,
    p_weight_exploration: input.weightExploration,
    p_penalty_quickly_skipped: input.penaltyQuicklySkipped,
    p_penalty_already_watched: input.penaltyAlreadyWatched,
    p_diversity_creator_penalty: input.diversityCreatorPenalty,
    p_diversity_topic_penalty: input.diversityTopicPenalty,
    p_novelty_half_life_hours: input.noveltyHalfLifeHours,
  });
  if (error) throw error;
  return parseSettings(data);
}

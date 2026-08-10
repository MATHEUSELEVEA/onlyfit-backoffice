import { supabase } from './supabase';

export type BetaFeedbackStatus = 'new' | 'in_review' | 'resolved' | 'discarded';

export type BetaFeedbackItem = {
  id: string;
  reporter_user_id: string;
  description: string;
  screenshot_path: string | null;
  route: string | null;
  app_version: string | null;
  build_number: string | null;
  platform: 'ios' | 'android';
  os_version: string | null;
  locale: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  status: BetaFeedbackStatus;
  internal_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type BetaFeedbackCounts = Record<BetaFeedbackStatus, number>;

export type BetaFeedbackPage = {
  items: BetaFeedbackItem[];
  total: number;
  counts: BetaFeedbackCounts;
};

export async function listBetaFeedback(status: BetaFeedbackStatus | null, limit: number, offset: number) {
  const { data, error } = await supabase.rpc('control_list_beta_feedback', {
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data as BetaFeedbackPage;
}

export async function updateBetaFeedback(input: {
  id: string;
  status: BetaFeedbackStatus;
  internalNotes: string;
}) {
  const { data, error } = await supabase.rpc('control_update_beta_feedback', {
    p_id: input.id,
    p_status: input.status,
    p_internal_notes: input.internalNotes,
  });
  if (error) throw error;
  return data as BetaFeedbackItem;
}

export async function createFeedbackScreenshotUrl(path: string) {
  const { data, error } = await supabase.storage
    .from('beta-feedback-screenshots')
    .createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

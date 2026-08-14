import { supabase } from './supabase';

export type ReviewReportStatus = 'pending' | 'kept' | 'hidden';
export type ReviewModerationAction = 'keep' | 'hide';

export type ReviewReport = {
  id: string;
  reason: 'spam' | 'abuse' | 'fraud' | 'privacy' | 'other';
  details: string | null;
  status: ReviewReportStatus;
  created_at: string;
  offering_name: string;
  reporter: { id: string; name: string | null };
  review: {
    id: string;
    rating: number;
    comment: string | null;
    status: 'published' | 'hidden';
    offering_id: string;
    author_id: string;
    seller_reply: string | null;
  };
};

export type ReviewReportPage = { items: ReviewReport[]; total: number };

export async function listReviewReports(status: ReviewReportStatus, limit: number, offset: number) {
  const { data, error } = await supabase.rpc('control_list_review_reports', {
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data as ReviewReportPage;
}

export async function resolveReviewReport(input: { reportId: string; action: ReviewModerationAction }) {
  const { data, error } = await supabase.rpc('control_resolve_review_report', {
    p_report_id: input.reportId,
    p_action: input.action,
  });
  if (error) throw error;
  return data;
}

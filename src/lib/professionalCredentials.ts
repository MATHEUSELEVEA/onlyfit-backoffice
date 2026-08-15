import { supabase } from './supabase';

export type CredentialStatus = 'pending' | 'approved' | 'rejected';

export type ProfessionalCredentialReview = {
  id: string;
  profileId: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  specialty: string;
  council: string;
  jurisdiction: string;
  registration: string;
  status: CredentialStatus;
  rejectionReason: string | null;
  createdAt: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function nullable(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export async function listProfessionalCredentialReviews(status: CredentialStatus): Promise<{ total: number; items: ProfessionalCredentialReview[] }> {
  const { data, error } = await supabase.rpc('control_list_professional_credential_reviews', {
    p_status: status,
    p_limit: 100,
    p_offset: 0,
  });
  if (error) throw error;
  const payload = record(data);
  const rows = Array.isArray(payload.items) ? payload.items : [];
  return {
    total: Number(payload.total) || 0,
    items: rows.map((value) => {
      const row = record(value);
      return {
        id: String(row.id ?? ''),
        profileId: String(row.profile_id ?? ''),
        fullName: String(row.full_name ?? row.username ?? 'Profissional'),
        username: nullable(row.username),
        avatarUrl: nullable(row.avatar_url),
        specialty: String(row.specialty ?? ''),
        council: String(row.council ?? ''),
        jurisdiction: String(row.jurisdiction ?? ''),
        registration: String(row.registration ?? ''),
        status: String(row.status ?? 'pending') as CredentialStatus,
        rejectionReason: nullable(row.rejection_reason),
        createdAt: String(row.created_at ?? ''),
      };
    }),
  };
}

export async function reviewProfessionalCredential(input: { id: string; action: 'approve' | 'reject'; reason?: string }): Promise<void> {
  const { error } = await supabase.rpc('control_review_professional_credential', {
    p_review_id: input.id,
    p_action: input.action,
    p_rejection_reason: input.reason ?? null,
  });
  if (error) throw error;
}

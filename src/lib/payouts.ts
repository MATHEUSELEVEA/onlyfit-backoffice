import { supabase } from './supabase';

export type PayoutStatus =
  | 'pending_approval'
  | 'approved'
  | 'payment_recorded'
  | 'paid'
  | 'rejected'
  | 'failed'
  | 'reversed';

export type PayoutQueueDay = {
  settlement_date: string;
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  payment_recorded_count: number;
  payment_recorded_amount: number;
  actionable_count: number;
  actionable_amount: number;
};

export type PayoutRequest = {
  id: string;
  professional_profile_id: string;
  professional_name: string;
  professional_username: string | null;
  amount: number;
  status: PayoutStatus;
  pix_key_type: string;
  pix_key_last4: string;
  available_balance_snapshot: number;
  settlement_date: string;
  requested_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_recorded_at: string | null;
  manual_payment_reference: string | null;
  payment_proof_path: string | null;
  batch_id: string | null;
  rejection_reason: string | null;
  failure_reason: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseDay(value: unknown): PayoutQueueDay {
  const row = asRecord(value);
  return {
    settlement_date: String(row.settlement_date ?? ''),
    pending_count: numberFrom(row.pending_count),
    pending_amount: numberFrom(row.pending_amount),
    approved_count: numberFrom(row.approved_count),
    approved_amount: numberFrom(row.approved_amount),
    payment_recorded_count: numberFrom(row.payment_recorded_count),
    payment_recorded_amount: numberFrom(row.payment_recorded_amount),
    actionable_count: numberFrom(row.actionable_count),
    actionable_amount: numberFrom(row.actionable_amount),
  };
}

const PAYOUT_STATUSES: PayoutStatus[] = [
  'pending_approval', 'approved', 'payment_recorded', 'paid', 'rejected', 'failed', 'reversed',
];

function parseRequest(value: unknown): PayoutRequest {
  const row = asRecord(value);
  const status = PAYOUT_STATUSES.includes(row.status as PayoutStatus)
    ? (row.status as PayoutStatus)
    : 'pending_approval';
  return {
    id: String(row.id ?? ''),
    professional_profile_id: String(row.professional_profile_id ?? ''),
    professional_name: String(row.professional_name ?? 'Profissional'),
    professional_username: stringOrNull(row.professional_username),
    amount: numberFrom(row.amount),
    status,
    pix_key_type: String(row.pix_key_type ?? 'CPF'),
    pix_key_last4: String(row.pix_key_last4 ?? ''),
    available_balance_snapshot: numberFrom(row.available_balance_snapshot),
    settlement_date: String(row.settlement_date ?? ''),
    requested_at: stringOrNull(row.requested_at),
    approved_at: stringOrNull(row.approved_at),
    paid_at: stringOrNull(row.paid_at),
    payment_recorded_at: stringOrNull(row.payment_recorded_at),
    manual_payment_reference: stringOrNull(row.manual_payment_reference),
    payment_proof_path: stringOrNull(row.payment_proof_path),
    batch_id: stringOrNull(row.batch_id),
    rejection_reason: stringOrNull(row.rejection_reason),
    failure_reason: stringOrNull(row.failure_reason),
  };
}

export async function listPayoutQueueDays(): Promise<PayoutQueueDay[]> {
  const { data, error } = await supabase.rpc('control_list_payout_queue', { p_settlement_date: null });
  if (error) throw error;
  const days = asRecord(data).days;
  return Array.isArray(days) ? days.map(parseDay) : [];
}

export async function listPayoutQueueDay(settlementDate: string): Promise<PayoutRequest[]> {
  const { data, error } = await supabase.rpc('control_list_payout_queue', { p_settlement_date: settlementDate });
  if (error) throw error;
  const requests = asRecord(data).requests;
  return Array.isArray(requests) ? requests.map(parseRequest) : [];
}

export async function approvePayout(payoutId: string): Promise<void> {
  const { error } = await supabase.rpc('control_approve_payout', { p_payout_id: payoutId });
  if (error) throw error;
}

export async function recordManualPayout(input: {
  payoutId: string;
  paymentReference: string;
  paymentProofPath: string;
}): Promise<void> {
  const { error } = await supabase.rpc('control_record_manual_payout', {
    p_payout_id: input.payoutId,
    p_payment_reference: input.paymentReference,
    p_payment_proof_path: input.paymentProofPath,
  });
  if (error) throw error;
}

export async function finalizeManualPayout(payoutId: string): Promise<void> {
  const { error } = await supabase.rpc('control_finalize_manual_payout', { p_payout_id: payoutId });
  if (error) throw error;
}

export async function createPayoutBatch(payoutIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('control_create_payout_batch', { p_payout_ids: payoutIds, p_notes: null });
  if (error) throw error;
}

export async function rejectPayout(payoutId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('control_reject_payout', {
    p_payout_id: payoutId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function failManualPayout(payoutId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('control_fail_manual_payout', {
    p_payout_id: payoutId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function reversePaidPayout(payoutId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('control_reverse_paid_payout', {
    p_payout_id: payoutId,
    p_reason: reason,
  });
  if (error) throw error;
}

export function payoutStatusLabel(status: PayoutStatus): string {
  switch (status) {
    case 'pending_approval': return 'Aguardando';
    case 'approved': return 'Aprovado';
    case 'payment_recorded': return 'Pagamento registrado';
    case 'paid': return 'Pago';
    case 'rejected': return 'Rejeitado';
    case 'failed': return 'Falhou';
    case 'reversed': return 'Revertido';
    default: return status;
  }
}

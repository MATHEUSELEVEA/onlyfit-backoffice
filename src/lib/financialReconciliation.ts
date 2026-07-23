import { supabase } from './supabase';

export type ReconciliationRun = {
  id: string;
  provider: string;
  period_start: string;
  period_end: string;
  status: 'open' | 'completed' | 'failed';
  exception_count: number;
  created_at: string;
  completed_at: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberFrom(value: unknown): number {
  return typeof value === 'number' ? value : Number(value) || 0;
}

export async function listFinancialReconciliationRuns(): Promise<ReconciliationRun[]> {
  const { data, error } = await supabase.rpc('control_list_financial_reconciliation', { p_run_id: null });
  if (error) throw error;
  const runs = asRecord(data).runs;
  if (!Array.isArray(runs)) return [];
  return runs.map((value) => {
    const row = asRecord(value);
    return {
      id: String(row.id ?? ''),
      provider: String(row.provider ?? 'asaas'),
      period_start: String(row.period_start ?? ''),
      period_end: String(row.period_end ?? ''),
      status: row.status === 'completed' || row.status === 'failed' ? row.status : 'open',
      exception_count: numberFrom(row.exception_count),
      created_at: String(row.created_at ?? ''),
      completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
    };
  });
}

export async function runFinancialReconciliation(input: { from: string; to: string }) {
  const { data, error } = await supabase.functions.invoke('financial-reconcile', { body: input });
  if (error) throw error;
  return asRecord(data);
}

export async function recordTreasuryMovement(input: {
  direction: 'invest' | 'redeem';
  amount: number;
  reference: string;
}) {
  const { error } = await supabase.rpc('control_record_treasury_movement', {
    p_direction: input.direction,
    p_amount: input.amount,
    p_reference: input.reference,
    p_note: null,
  });
  if (error) throw error;
}

import { supabase } from './supabase';

export type ConsultancyCourtesySettings = {
  initialQuota: number;
  paidThreshold: number;
  rewardQuota: number;
  updatedAt: string | null;
};

export type ConsultancyCourtesySettingsInput = Omit<ConsultancyCourtesySettings, 'updatedAt'>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function integer(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function parseSettings(value: unknown): ConsultancyCourtesySettings {
  const row = asRecord(value);
  return {
    initialQuota: integer(row.courtesy_contract_initial_quota),
    paidThreshold: integer(row.courtesy_contract_paid_threshold),
    rewardQuota: integer(row.courtesy_contract_reward_quota),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function getConsultancyCourtesySettings(): Promise<ConsultancyCourtesySettings> {
  const { data, error } = await supabase.rpc('control_get_service_settings');
  if (error) throw error;
  return parseSettings(data);
}

export async function setConsultancyCourtesySettings(
  input: ConsultancyCourtesySettingsInput,
): Promise<ConsultancyCourtesySettings> {
  const { data, error } = await supabase.rpc('control_set_courtesy_contract_rules', {
    p_initial_quota: input.initialQuota,
    p_paid_threshold: input.paidThreshold,
    p_reward_quota: input.rewardQuota,
  });
  if (error) throw error;
  return parseSettings(data);
}

export function consultancySettingsErrorMessage(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '');

  if (code.includes('forbidden')) return 'Seu papel interno não permite alterar esta regra.';
  if (code.includes('courtesy_contract_rules_out_of_range')) {
    return 'Use zero ou mais para as cotas e pelo menos um contrato pago por faixa.';
  }
  if (code.includes('invalid_courtesy_contract_rules')) return 'Preencha os três parâmetros.';
  return 'Não foi possível salvar a franquia de contratos gratuitos.';
}

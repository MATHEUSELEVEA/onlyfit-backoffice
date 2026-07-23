import { supabase } from './supabase';

export type PlatformPaymentSettings = {
  payout_processing_hours: number;
  payout_minimum_amount: number;
  card_settlement_days: number;
  settlement_weekdays: number[];
  updated_at: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function parseSettings(value: unknown): PlatformPaymentSettings {
  const row = asRecord(value);
  return {
    payout_processing_hours: numberFrom(row.payout_processing_hours),
    payout_minimum_amount: numberFrom(row.payout_minimum_amount),
    card_settlement_days: numberFrom(row.card_settlement_days),
    settlement_weekdays: Array.isArray(row.settlement_weekdays)
      ? row.settlement_weekdays.map(numberFrom).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
      : [1, 2, 3, 4, 5],
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function getPlatformPaymentSettings(): Promise<PlatformPaymentSettings> {
  const { data, error } = await supabase.rpc('control_get_platform_payment_settings');
  if (error) throw error;
  return parseSettings(data);
}

export async function updatePlatformPaymentSettings(input: {
  payoutProcessingHours: number;
  payoutMinimumAmount: number;
  cardSettlementDays: number;
  settlementWeekdays: number[];
}): Promise<PlatformPaymentSettings> {
  const { data, error } = await supabase.rpc('control_update_platform_payment_settings', {
    p_payout_processing_hours: input.payoutProcessingHours,
    p_payout_minimum_amount: input.payoutMinimumAmount,
    p_card_settlement_days: input.cardSettlementDays,
    p_settlement_weekdays: input.settlementWeekdays,
  });
  if (error) throw error;
  return parseSettings(data);
}

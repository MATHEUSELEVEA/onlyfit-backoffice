import { supabase } from './supabase';

export type TransactionStatus =
  | 'created' | 'pending' | 'confirmed' | 'settled' | 'failed' | 'refunded' | 'chargeback';
export type SettlementStatus =
  | 'pending' | 'confirmed' | 'settled' | 'refunded' | 'chargeback';

export type PaymentTransaction = {
  id: string;
  asaas_payment_id: string;
  offering_id: string;
  offering_name: string;
  billing_type: 'one_time' | 'recurring';
  buyer_profile_id: string;
  buyer_name: string;
  professional_profile_id: string;
  professional_name: string;
  gross_value: number;
  net_value: number | null;
  asaas_fee: number | null;
  platform_commission: number | null;
  professional_net: number | null;
  status: TransactionStatus;
  settlement_status: SettlementStatus;
  card_brand: string | null;
  card_last4: string | null;
  estimated_credit_date: string | null;
  credit_date: string | null;
  created_at: string;
};

export type TransactionsPage = {
  total: number;
  limit: number;
  offset: number;
  items: PaymentTransaction[];
};

export type TransactionFilters = {
  from?: string | null;
  to?: string | null;
  status?: TransactionStatus | null;
  settlementStatus?: SettlementStatus | null;
  limit?: number;
  offset?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return numberFrom(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

const TX_STATUSES: TransactionStatus[] = ['created', 'pending', 'confirmed', 'settled', 'failed', 'refunded', 'chargeback'];
const SETTLE_STATUSES: SettlementStatus[] = ['pending', 'confirmed', 'settled', 'refunded', 'chargeback'];

function parseTransaction(value: unknown): PaymentTransaction {
  const row = asRecord(value);
  return {
    id: String(row.id ?? ''),
    asaas_payment_id: String(row.asaas_payment_id ?? ''),
    offering_id: String(row.offering_id ?? ''),
    offering_name: String(row.offering_name ?? '—'),
    billing_type: row.billing_type === 'recurring' ? 'recurring' : 'one_time',
    buyer_profile_id: String(row.buyer_profile_id ?? ''),
    buyer_name: String(row.buyer_name ?? 'Comprador'),
    professional_profile_id: String(row.professional_profile_id ?? ''),
    professional_name: String(row.professional_name ?? 'Profissional'),
    gross_value: numberFrom(row.gross_value),
    net_value: numberOrNull(row.net_value),
    asaas_fee: numberOrNull(row.asaas_fee),
    platform_commission: numberOrNull(row.platform_commission),
    professional_net: numberOrNull(row.professional_net),
    status: TX_STATUSES.includes(row.status as TransactionStatus) ? (row.status as TransactionStatus) : 'created',
    settlement_status: SETTLE_STATUSES.includes(row.settlement_status as SettlementStatus)
      ? (row.settlement_status as SettlementStatus)
      : 'pending',
    card_brand: stringOrNull(row.card_brand),
    card_last4: stringOrNull(row.card_last4),
    estimated_credit_date: stringOrNull(row.estimated_credit_date),
    credit_date: stringOrNull(row.credit_date),
    created_at: String(row.created_at ?? ''),
  };
}

export async function listPaymentTransactions(filters: TransactionFilters): Promise<TransactionsPage> {
  const { data, error } = await supabase.rpc('control_list_payment_transactions', {
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_status: filters.status ?? null,
    p_settlement_status: filters.settlementStatus ?? null,
    p_limit: filters.limit ?? 100,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;
  const row = asRecord(data);
  return {
    total: numberFrom(row.total),
    limit: numberFrom(row.limit),
    offset: numberFrom(row.offset),
    items: Array.isArray(row.items) ? row.items.map(parseTransaction) : [],
  };
}

export function transactionStatusLabel(status: TransactionStatus): string {
  switch (status) {
    case 'created': return 'Criada';
    case 'pending': return 'Pendente';
    case 'confirmed': return 'Autorizada';
    case 'settled': return 'Liquidada';
    case 'failed': return 'Falhou';
    case 'refunded': return 'Estornada';
    case 'chargeback': return 'Chargeback';
    default: return status;
  }
}

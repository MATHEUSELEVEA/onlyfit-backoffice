import { supabase } from './supabase';

export type FinancialReportSummary = {
  transactions_total: number;
  successful_transactions: number;
  failed_transactions: number;
  reversal_transactions: number;
  gross_revenue: number;
  net_revenue: number;
  asaas_fees: number;
  platform_commission: number;
  professional_net: number;
  average_ticket: number;
  take_rate_net_percent: number;
  take_rate_gross_percent: number;
  asaas_fee_rate_percent: number;
  professional_share_net_percent: number;
  pending_settlement_value: number;
  settled_professional_value: number;
  wallet_available: number;
  wallet_pending: number;
  wallet_reserved: number;
  active_subscriptions: number;
  active_subscription_mrr: number;
  synthetic_transactions: number;
  open_payout_amount: number;
  open_payout_count: number;
  paid_payout_amount: number;
  paid_payout_count: number;
};

export type FinancialReportRow = Record<string, string | number | null>;

export type FinancialReportsSnapshot = {
  generatedAt: string;
  summary: FinancialReportSummary;
  settlementByStatus: FinancialReportRow[];
  salesByOfferingType: FinancialReportRow[];
  salesByProfessional: FinancialReportRow[];
  subscriptionStatuses: FinancialReportRow[];
  payoutStatuses: FinancialReportRow[];
  auditEvents: FinancialReportRow[];
  providerEvents: FinancialReportRow[];
  journalAccounts: FinancialReportRow[];
  reconciliation: Record<string, string | number | null>;
  controlFlags: Record<string, number>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseRows(value: unknown): FinancialReportRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = asRecord(item);
    return Object.fromEntries(
      Object.entries(row).map(([key, raw]) => [
        key,
        typeof raw === 'number' || typeof raw === 'string' || raw === null ? raw : String(raw ?? ''),
      ]),
    );
  });
}

function parseNumberRecord(value: unknown): Record<string, number> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, raw]) => [key, numberFrom(raw)]),
  );
}

function parseSummary(value: unknown): FinancialReportSummary {
  const row = asRecord(value);
  return {
    transactions_total: numberFrom(row.transactions_total),
    successful_transactions: numberFrom(row.successful_transactions),
    failed_transactions: numberFrom(row.failed_transactions),
    reversal_transactions: numberFrom(row.reversal_transactions),
    gross_revenue: numberFrom(row.gross_revenue),
    net_revenue: numberFrom(row.net_revenue),
    asaas_fees: numberFrom(row.asaas_fees),
    platform_commission: numberFrom(row.platform_commission),
    professional_net: numberFrom(row.professional_net),
    average_ticket: numberFrom(row.average_ticket),
    take_rate_net_percent: numberFrom(row.take_rate_net_percent),
    take_rate_gross_percent: numberFrom(row.take_rate_gross_percent),
    asaas_fee_rate_percent: numberFrom(row.asaas_fee_rate_percent),
    professional_share_net_percent: numberFrom(row.professional_share_net_percent),
    pending_settlement_value: numberFrom(row.pending_settlement_value),
    settled_professional_value: numberFrom(row.settled_professional_value),
    wallet_available: numberFrom(row.wallet_available),
    wallet_pending: numberFrom(row.wallet_pending),
    wallet_reserved: numberFrom(row.wallet_reserved),
    active_subscriptions: numberFrom(row.active_subscriptions),
    active_subscription_mrr: numberFrom(row.active_subscription_mrr),
    synthetic_transactions: numberFrom(row.synthetic_transactions),
    open_payout_amount: numberFrom(row.open_payout_amount),
    open_payout_count: numberFrom(row.open_payout_count),
    paid_payout_amount: numberFrom(row.paid_payout_amount),
    paid_payout_count: numberFrom(row.paid_payout_count),
  };
}

export async function fetchFinancialReportsSnapshot(filters: {
  from?: string | null;
  to?: string | null;
}): Promise<FinancialReportsSnapshot> {
  const { data, error } = await supabase.rpc('control_financial_reports_snapshot', {
    p_from: filters.from || null,
    p_to: filters.to || null,
  });
  if (error) throw error;

  const snapshot = asRecord(data);
  const generatedAt = stringOrNull(snapshot.generated_at);
  if (!generatedAt) throw new Error('O banco retornou um relatório financeiro inválido.');

  return {
    generatedAt,
    summary: parseSummary(snapshot.summary),
    settlementByStatus: parseRows(snapshot.settlement_by_status),
    salesByOfferingType: parseRows(snapshot.sales_by_offering_type),
    salesByProfessional: parseRows(snapshot.sales_by_professional),
    subscriptionStatuses: parseRows(snapshot.subscription_statuses),
    payoutStatuses: parseRows(snapshot.payout_statuses),
    auditEvents: parseRows(snapshot.audit_events),
    providerEvents: parseRows(snapshot.provider_events),
    journalAccounts: parseRows(snapshot.journal_accounts),
    reconciliation: asRecord(snapshot.reconciliation) as Record<string, string | number | null>,
    controlFlags: parseNumberRecord(snapshot.control_flags),
  };
}

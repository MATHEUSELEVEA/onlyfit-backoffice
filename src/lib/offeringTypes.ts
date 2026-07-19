import { supabase } from './supabase';

export type BillingType = 'one_time' | 'recurring' | 'free';
export type BillingInterval = 'month' | '2month' | 'quarter' | 'semester' | 'year';

export type OfferingTypeBilling = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  enabled: boolean;
  sort_order: number;
  billing_type: BillingType;
  billing_interval: BillingInterval | null;
  minimum_price: number;
  platform_fee_percent: number;
  platform_fee_fixed: number;
  max_per_business: number | null;
  unique_per_owner_profile: boolean;
  requires_affinity_group: boolean;
  requires_product_category: boolean;
  active_offerings_count: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function parseOfferingType(value: unknown): OfferingTypeBilling {
  const row = asRecord(value);
  return {
    slug: String(row.slug ?? ''),
    name: String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    icon: typeof row.icon === 'string' ? row.icon : null,
    enabled: row.enabled !== false,
    sort_order: numberFrom(row.sort_order),
    billing_type: row.billing_type === 'recurring' || row.billing_type === 'free' ? row.billing_type : 'one_time',
    billing_interval:
      row.billing_interval === 'month' ||
      row.billing_interval === '2month' ||
      row.billing_interval === 'quarter' ||
      row.billing_interval === 'semester' ||
      row.billing_interval === 'year'
        ? row.billing_interval
        : null,
    minimum_price: numberFrom(row.minimum_price),
    platform_fee_percent: numberFrom(row.platform_fee_percent),
    platform_fee_fixed: numberFrom(row.platform_fee_fixed),
    max_per_business: row.max_per_business === null || row.max_per_business === undefined ? null : numberFrom(row.max_per_business),
    unique_per_owner_profile: row.unique_per_owner_profile === true,
    requires_affinity_group: row.requires_affinity_group === true,
    requires_product_category: row.requires_product_category === true,
    active_offerings_count: numberFrom(row.active_offerings_count),
  };
}

export async function listOfferingTypeBilling(): Promise<OfferingTypeBilling[]> {
  const { data, error } = await supabase.rpc('control_list_offering_type_billing');
  if (error) throw error;
  return Array.isArray(data) ? data.map(parseOfferingType) : [];
}

export async function updateOfferingTypeBilling(input: {
  slug: string;
  billingType: BillingType;
  billingInterval: BillingInterval | null;
  minimumPrice: number;
  platformFeePercent: number;
  platformFeeFixed: number;
}): Promise<OfferingTypeBilling> {
  const { data, error } = await supabase.rpc('control_update_offering_type_billing', {
    p_slug: input.slug,
    p_billing_type: input.billingType,
    p_billing_interval: input.billingInterval,
    p_minimum_price: input.minimumPrice,
    p_platform_fee_percent: input.platformFeePercent,
    p_platform_fee_fixed: input.platformFeeFixed,
  });
  if (error) throw error;
  return parseOfferingType(data);
}

export function billingTypeLabel(value: BillingType): string {
  if (value === 'recurring') return 'Recorrente';
  if (value === 'free') return 'Sem cobrança';
  return 'Pagamento único';
}

export function billingIntervalLabel(value: BillingInterval | null): string {
  switch (value) {
    case 'month':
      return 'Mensal';
    case '2month':
      return 'Bimestral';
    case 'quarter':
      return 'Trimestral';
    case 'semester':
      return 'Semestral';
    case 'year':
      return 'Anual';
    default:
      return 'Sem intervalo';
  }
}

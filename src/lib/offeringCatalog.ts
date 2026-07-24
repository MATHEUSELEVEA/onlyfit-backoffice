import { supabase } from './supabase';

export type OfferingCatalogSource = 'business_offering' | 'market_product';
export type OfferingCatalogStatus = 'draft' | 'active' | 'paused' | 'archived';

export type OfferingCatalogItem = {
  source: OfferingCatalogSource;
  catalog_item_id: string;
  business_offering_id: string | null;
  product_id: string | null;
  offering_type: string | null;
  offering_type_name: string;
  name: string;
  description: string | null;
  status: OfferingCatalogStatus;
  billing_type: 'one_time' | 'recurring' | 'free';
  billing_interval: string | null;
  price: number;
  currency: string;
  fee_percent_snapshot: number | null;
  fee_fixed_snapshot: number | null;
  min_price_snapshot: number | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  owner_profile_id: string | null;
  owner_name: string | null;
  owner_username: string | null;
  financial_status: string;
  transactions_count: number;
  gross_revenue: number;
  platform_commission: number;
  professional_net: number;
  pending_settlement_value: number;
  settled_value: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OfferingCatalogPage = {
  total: number;
  limit: number;
  offset: number;
  items: OfferingCatalogItem[];
};

export type OfferingCatalogFilters = {
  source?: OfferingCatalogSource | null;
  offeringType?: string | null;
  status?: OfferingCatalogStatus | null;
  limit?: number;
  offset?: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
  return typeof value === 'string' && value.trim() ? value : null;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).length : 0;
}

function settingsReady(offeringType: string | null, settings: Record<string, unknown>, name: string): boolean {
  switch (offeringType) {
    case 'premium_content':
      return String(settings.headline ?? name).trim().length >= 3 && arrayLength(settings.benefits) >= 1;
    case 'health_consultancy':
      return ['online', 'in_person', 'hybrid'].includes(String(settings.format ?? ''))
        && Number(settings.duration_minutes ?? 0) >= 15
        && Number(settings.sessions_per_cycle ?? 0) >= 1
        && (String(settings.scheduling_notes ?? '').trim().length >= 3 || arrayLength(settings.deliverables) >= 1);
    case 'physical_products':
      return String(settings.product_category ?? '').trim().length >= 2
        && ['shipping', 'pickup', 'digital', 'hybrid'].includes(String(settings.fulfillment_type ?? ''))
        && ['limited', 'unlimited', 'preorder'].includes(String(settings.stock_mode ?? ''));
    default:
      return true;
  }
}

const SOURCES: OfferingCatalogSource[] = ['business_offering', 'market_product'];
const STATUSES: OfferingCatalogStatus[] = ['draft', 'active', 'paused', 'archived'];

function parseCatalogItem(value: unknown): OfferingCatalogItem {
  const row = asRecord(value);
  const settings = asRecord(row.settings);
  const source = SOURCES.includes(row.source as OfferingCatalogSource) ? row.source as OfferingCatalogSource : 'business_offering';
  const offeringType = stringOrNull(row.offering_type);
  const name = String(row.name ?? 'Oferta');
  const financialStatus = String(row.financial_status ?? 'unknown');
  return {
    source,
    catalog_item_id: String(row.catalog_item_id ?? ''),
    business_offering_id: stringOrNull(row.business_offering_id),
    product_id: stringOrNull(row.product_id),
    offering_type: offeringType,
    offering_type_name: String(row.offering_type_name ?? 'Sem tipo'),
    name,
    description: stringOrNull(row.description),
    status: STATUSES.includes(row.status as OfferingCatalogStatus) ? row.status as OfferingCatalogStatus : 'draft',
    billing_type: row.billing_type === 'recurring' ? 'recurring' : row.billing_type === 'free' ? 'free' : 'one_time',
    billing_interval: stringOrNull(row.billing_interval),
    price: numberFrom(row.price),
    currency: String(row.currency ?? 'BRL'),
    fee_percent_snapshot: numberOrNull(row.fee_percent_snapshot),
    fee_fixed_snapshot: numberOrNull(row.fee_fixed_snapshot),
    min_price_snapshot: numberOrNull(row.min_price_snapshot),
    organization_id: stringOrNull(row.organization_id),
    organization_name: stringOrNull(row.organization_name),
    organization_slug: stringOrNull(row.organization_slug),
    owner_profile_id: stringOrNull(row.owner_profile_id),
    owner_name: stringOrNull(row.owner_name),
    owner_username: stringOrNull(row.owner_username),
    financial_status: source === 'business_offering'
      && financialStatus === 'ready'
      && !settingsReady(offeringType, settings, name)
        ? 'config_required'
        : financialStatus,
    transactions_count: numberFrom(row.transactions_count),
    gross_revenue: numberFrom(row.gross_revenue),
    platform_commission: numberFrom(row.platform_commission),
    professional_net: numberFrom(row.professional_net),
    pending_settlement_value: numberFrom(row.pending_settlement_value),
    settled_value: numberFrom(row.settled_value),
    settings,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? row.created_at ?? ''),
  };
}

export async function listOfferingCatalog(filters: OfferingCatalogFilters): Promise<OfferingCatalogPage> {
  const { data, error } = await supabase.rpc('control_list_financial_offering_catalog', {
    p_source: filters.source ?? null,
    p_offering_type: filters.offeringType ?? null,
    p_status: filters.status ?? null,
    p_limit: filters.limit ?? 100,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;

  const row = asRecord(data);
  return {
    total: numberFrom(row.total),
    limit: numberFrom(row.limit),
    offset: numberFrom(row.offset),
    items: Array.isArray(row.items) ? row.items.map(parseCatalogItem) : [],
  };
}

export async function syncProductOffering(productId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('control_sync_product_financial_offering', {
    p_product_id: productId,
  });
  if (error) throw error;
  return stringOrNull(asRecord(data).business_offering_id);
}

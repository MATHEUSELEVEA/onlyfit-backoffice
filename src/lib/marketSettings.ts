import { supabase } from './supabase';

export type MarketMode = 'algorithm' | 'random';

export type MarketAlgorithmSettings = {
  mode: MarketMode;
  weight_affinity: number;
  weight_sales: number;
  weight_rating: number;
  weight_novelty: number;
  weight_exploration: number;
  diversity_seller_penalty: number;
  diversity_category_penalty: number;
  novelty_half_life_hours: number;
  penalty_already_owned: number;
  updated_at: string | null;
};

export type MarketAlgorithmInput = Omit<MarketAlgorithmSettings, 'updated_at'>;

export type ProductCategory = {
  slug: string;
  label: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

const numberFrom = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function getMarketAlgorithmSettings(): Promise<MarketAlgorithmSettings> {
  const { data, error } = await supabase.rpc('control_get_market_algorithm_settings');
  if (error) throw error;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    mode: row.mode === 'random' ? 'random' : 'algorithm',
    weight_affinity: numberFrom(row.weight_affinity),
    weight_sales: numberFrom(row.weight_sales),
    weight_rating: numberFrom(row.weight_rating),
    weight_novelty: numberFrom(row.weight_novelty),
    weight_exploration: numberFrom(row.weight_exploration),
    diversity_seller_penalty: numberFrom(row.diversity_seller_penalty),
    diversity_category_penalty: numberFrom(row.diversity_category_penalty),
    novelty_half_life_hours: numberFrom(row.novelty_half_life_hours),
    penalty_already_owned: numberFrom(row.penalty_already_owned),
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function setMarketAlgorithmSettings(input: MarketAlgorithmInput) {
  const { data, error } = await supabase.rpc('control_set_market_algorithm_settings', {
    p_mode: input.mode,
    p_weight_affinity: input.weight_affinity,
    p_weight_sales: input.weight_sales,
    p_weight_rating: input.weight_rating,
    p_weight_novelty: input.weight_novelty,
    p_weight_exploration: input.weight_exploration,
    p_diversity_seller_penalty: input.diversity_seller_penalty,
    p_diversity_category_penalty: input.diversity_category_penalty,
    p_novelty_half_life_hours: input.novelty_half_life_hours,
    p_penalty_already_owned: input.penalty_already_owned,
  });
  if (error) throw error;
  return data;
}

export async function listProductCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase.rpc('control_list_product_categories', {
    p_include_inactive: true,
  });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    slug: String(row.slug),
    label: String(row.label),
    icon: String(row.icon),
    sort_order: numberFrom(row.sort_order),
    is_active: row.is_active === true,
  }));
}

export async function saveProductCategory(category: ProductCategory): Promise<void> {
  const { error } = await supabase.rpc('control_save_product_category', {
    p_slug: category.slug,
    p_label: category.label,
    p_icon: category.icon,
    p_sort_order: category.sort_order,
    p_is_active: category.is_active,
  });
  if (error) throw error;
}

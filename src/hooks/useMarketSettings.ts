import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMarketAlgorithmSettings,
  getAdInventory,
  listAdBookings,
  listProductCategories,
  saveProductCategory,
  setMarketAlgorithmSettings,
  setAdPackage,
  setAdPlacement,
  type AdPackage,
  type AdPlacement,
  type MarketAlgorithmInput,
  type ProductCategory,
} from '../lib/marketSettings';

export const useMarketAlgorithmSettings = () => useQuery({
  queryKey: ['market-algorithm-settings'],
  queryFn: getMarketAlgorithmSettings,
  staleTime: 60_000,
});

export const useProductCategories = () => useQuery({
  queryKey: ['product-categories'],
  queryFn: listProductCategories,
  staleTime: 60_000,
});

export function useSetMarketAlgorithmSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: MarketAlgorithmInput) => setMarketAlgorithmSettings(input),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['market-algorithm-settings'] }),
  });
}

export function useSaveProductCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductCategory) => saveProductCategory(input),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['product-categories'] }),
  });
}

export const useAdInventory = () => useQuery({
  queryKey: ['ad-inventory'],
  queryFn: getAdInventory,
  staleTime: 30_000,
});

export const useAdBookings = () => useQuery({
  queryKey: ['ad-bookings'],
  queryFn: listAdBookings,
  staleTime: 30_000,
});

export function useSetAdPlacement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<AdPlacement, 'slug' | 'max_slots' | 'is_active'>) => setAdPlacement(input),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['ad-inventory'] }),
  });
}

export function useSetAdPackage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<AdPackage, 'placement' | 'duration_days' | 'price' | 'is_active'>) => setAdPackage(input),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['ad-inventory'] }),
  });
}

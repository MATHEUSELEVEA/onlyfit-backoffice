import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMarketAlgorithmSettings,
  listProductCategories,
  saveProductCategory,
  setMarketAlgorithmSettings,
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

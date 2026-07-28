import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteUserAccount,
  fetchUserFootprint,
  fetchUserOverview,
  searchUsers,
  updateUserAccount,
  type UserSearchFilters,
} from '../lib/users';

export function useUserSearch(filters: UserSearchFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['user-directory', filters],
    queryFn: () => searchUsers(filters),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useUserOverview(userId: string | null) {
  return useQuery({
    queryKey: ['user-overview', userId],
    queryFn: () => fetchUserOverview(userId as string),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  });
}

/** O raio-x varre o schema inteiro: só roda quando a tela realmente precisa dele. */
export function useUserFootprint(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['user-footprint', userId],
    queryFn: () => fetchUserFootprint(userId as string),
    enabled: Boolean(userId) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useUpdateUserAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserAccount,
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['user-overview', variables.userId] });
      void queryClient.invalidateQueries({ queryKey: ['user-directory'] });
    },
  });
}

export function useDeleteUserAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-directory'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] });
    },
  });
}

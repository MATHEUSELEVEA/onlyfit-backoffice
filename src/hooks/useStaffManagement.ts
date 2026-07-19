import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/useAuth';
import {
  createPlatformStaff,
  fetchCurrentStaffRole,
  fetchPlatformStaff,
  updatePlatformStaff,
} from '../lib/staff';

export function useCurrentStaffRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['platform_staff_role', user?.id],
    queryFn: fetchCurrentStaffRole,
    enabled: Boolean(user?.id),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useStaffList(enabled: boolean) {
  return useQuery({
    queryKey: ['platform_staff'],
    queryFn: fetchPlatformStaff,
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreatePlatformStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlatformStaff,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform_staff'] }),
  });
}

export function useUpdatePlatformStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlatformStaff,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform_staff'] }),
  });
}

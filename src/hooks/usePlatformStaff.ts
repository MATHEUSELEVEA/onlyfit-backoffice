import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/useAuth';
import { isPlatformStaff } from '../lib/dashboard';

export function usePlatformStaff() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform_is_staff', user?.id],
    queryFn: isPlatformStaff,
    enabled: Boolean(user?.id),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

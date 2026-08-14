import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateAffinityGroup,
  createAffinityGroup,
  deactivateAffinityGroup,
  getAffinityGroupImpact,
  listAffinityGroupAudit,
  listAffinityGroups,
  reorderAffinityGroups,
  updateAffinityGroup,
} from '../lib/affinityGroups';

const groupsKey = ['affinity-groups'] as const;
const auditKey = ['affinity-groups-audit'] as const;

export const useAffinityGroups = () => useQuery({
  queryKey: groupsKey,
  queryFn: listAffinityGroups,
  staleTime: 30_000,
});

export const useAffinityGroupImpact = (key: string | null) => useQuery({
  queryKey: ['affinity-group-impact', key],
  queryFn: () => getAffinityGroupImpact(key ?? ''),
  enabled: Boolean(key),
  staleTime: 0,
});

export const useAffinityGroupAudit = () => useQuery({
  queryKey: auditKey,
  queryFn: listAffinityGroupAudit,
  staleTime: 30_000,
});

function useRefreshAffinityGroups() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: groupsKey });
    void client.invalidateQueries({ queryKey: auditKey });
  };
}

export function useCreateAffinityGroup() {
  const refresh = useRefreshAffinityGroups();
  return useMutation({ mutationFn: createAffinityGroup, onSuccess: refresh });
}

export function useUpdateAffinityGroup() {
  const refresh = useRefreshAffinityGroups();
  return useMutation({ mutationFn: updateAffinityGroup, onSuccess: refresh });
}

export function useReorderAffinityGroups() {
  const refresh = useRefreshAffinityGroups();
  return useMutation({ mutationFn: reorderAffinityGroups, onSuccess: refresh });
}

export function useActivateAffinityGroup() {
  const refresh = useRefreshAffinityGroups();
  return useMutation({ mutationFn: activateAffinityGroup, onSuccess: refresh });
}

export function useDeactivateAffinityGroup() {
  const refresh = useRefreshAffinityGroups();
  return useMutation({ mutationFn: deactivateAffinityGroup, onSuccess: refresh });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProfessionalSpecialty,
  listProfessionalSpecialties,
  reorderProfessionalSpecialties,
  setProfessionalSpecialtyActive,
  updateProfessionalSpecialty,
} from '../lib/professionalSpecialties';

const specialtiesKey = ['professional-specialties'] as const;

export const useProfessionalSpecialties = () => useQuery({
  queryKey: specialtiesKey,
  queryFn: listProfessionalSpecialties,
  staleTime: 30_000,
});

function useRefreshProfessionalSpecialties() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: specialtiesKey });
    // O rótulo da especialidade aparece na fila de registros profissionais.
    void client.invalidateQueries({ queryKey: ['professional-credential-reviews'] });
  };
}

export function useCreateProfessionalSpecialty() {
  const refresh = useRefreshProfessionalSpecialties();
  return useMutation({ mutationFn: createProfessionalSpecialty, onSuccess: refresh });
}

export function useUpdateProfessionalSpecialty() {
  const refresh = useRefreshProfessionalSpecialties();
  return useMutation({ mutationFn: updateProfessionalSpecialty, onSuccess: refresh });
}

export function useSetProfessionalSpecialtyActive() {
  const refresh = useRefreshProfessionalSpecialties();
  return useMutation({ mutationFn: setProfessionalSpecialtyActive, onSuccess: refresh });
}

export function useReorderProfessionalSpecialties() {
  const refresh = useRefreshProfessionalSpecialties();
  return useMutation({ mutationFn: reorderProfessionalSpecialties, onSuccess: refresh });
}

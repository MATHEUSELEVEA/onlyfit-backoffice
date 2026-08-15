import { supabase } from './supabase';

/**
 * G20 — a taxonomia de especialidades profissionais.
 *
 * A lista vivia como constante replicada no app Flutter, aqui no backoffice e
 * num `CASE` dentro do banco. Agora é uma tabela governada por esta página:
 * cadastrar, rotular em português, vincular ao conselho, ativar, desativar e
 * ordenar — sem release de cliente.
 *
 * Desativar **não** derruba o selo de quem já foi validado naquela
 * especialidade (regra 10): a revisão aprovada continua valendo, e o que a
 * desativação faz é tirar a especialidade da escolha de novos profissionais e
 * da barra de filtros do feed.
 */
export type ProfessionalSpecialty = {
  key: string;
  label: string;
  council: string;
  regulated: boolean;
  active: boolean;
  sortOrder: number;
  approvedCredentials: number;
  pendingCredentials: number;
  declaredBy: number;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parse(value: unknown): ProfessionalSpecialty {
  const row = record(value);
  return {
    key: String(row.key ?? ''),
    label: String(row.label ?? ''),
    council: String(row.council ?? ''),
    regulated: Boolean(row.regulated),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order) || 0,
    approvedCredentials: Number(row.approved_credentials) || 0,
    pendingCredentials: Number(row.pending_credentials) || 0,
    declaredBy: Number(row.declared_by) || 0,
  };
}

export async function listProfessionalSpecialties(): Promise<ProfessionalSpecialty[]> {
  const { data, error } = await supabase.rpc('control_list_professional_specialties');
  if (error) throw error;
  return Array.isArray(data) ? data.map(parse) : [];
}

export async function createProfessionalSpecialty(input: {
  label: string;
  council: string;
  regulated: boolean;
}): Promise<ProfessionalSpecialty> {
  const { data, error } = await supabase.rpc('control_create_professional_specialty', {
    p_label: input.label,
    p_council: input.council,
    p_regulated: input.regulated,
  });
  if (error) throw error;
  return parse(data);
}

export async function updateProfessionalSpecialty(input: {
  key: string;
  label: string;
  council: string;
  regulated: boolean;
}): Promise<ProfessionalSpecialty> {
  const { data, error } = await supabase.rpc('control_update_professional_specialty', {
    p_key: input.key,
    p_label: input.label,
    p_council: input.council,
    p_regulated: input.regulated,
  });
  if (error) throw error;
  return parse(data);
}

export async function setProfessionalSpecialtyActive(input: {
  key: string;
  active: boolean;
}): Promise<ProfessionalSpecialty> {
  const { data, error } = await supabase.rpc('control_set_professional_specialty_active', {
    p_key: input.key,
    p_active: input.active,
  });
  if (error) throw error;
  return parse(data);
}

export async function reorderProfessionalSpecialties(keys: string[]): Promise<ProfessionalSpecialty[]> {
  const { data, error } = await supabase.rpc('control_reorder_professional_specialties', {
    p_keys: keys,
  });
  if (error) throw error;
  return Array.isArray(data) ? data.map(parse) : [];
}

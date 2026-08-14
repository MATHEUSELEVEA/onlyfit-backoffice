import { supabase } from './supabase';

export type AffinityImpact = {
  interested_users: number;
  professionals: number;
  posts: number;
  communities: number;
  organizations: number;
  places: number;
  featured_ambassadors: number;
  organization_events: number;
  operation_cohorts: number;
  user_goals: number;
  saved_preferences: number;
  offerings: number;
  total_links: number;
  token: string;
};

export type AffinityGroup = AffinityImpact & {
  key: string;
  label: string;
  icon: AffinityIcon;
  accent: AffinityAccent;
  aliases: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AffinityGroupInput = Pick<AffinityGroup, 'label' | 'icon' | 'accent' | 'aliases'>;

export type AffinityAuditEntry = {
  id: string;
  group_key: string | null;
  action: 'create' | 'update' | 'reorder' | 'activate' | 'deactivate';
  before_data: Record<string, unknown>;
  after_data: Record<string, unknown>;
  impact: Partial<AffinityImpact>;
  created_at: string;
  actor_user_id: string | null;
  actor_name: string | null;
};

export const affinityIcons = ['Dumbbell', 'Sparkles', 'Swords', 'Footprints', 'Medal', 'Apple'] as const;
export type AffinityIcon = typeof affinityIcons[number];

export const affinityAccents = [
  'from-amber-500/30',
  'from-rose-500/30',
  'from-red-500/30',
  'from-orange-500/30',
  'from-violet-500/30',
  'from-lime-500/30',
] as const;
export type AffinityAccent = typeof affinityAccents[number];

const numberFrom = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const recordFrom = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function impactFrom(value: unknown): AffinityImpact {
  const row = recordFrom(value);
  return {
    interested_users: numberFrom(row.interested_users),
    professionals: numberFrom(row.professionals),
    posts: numberFrom(row.posts),
    communities: numberFrom(row.communities),
    organizations: numberFrom(row.organizations),
    places: numberFrom(row.places),
    featured_ambassadors: numberFrom(row.featured_ambassadors),
    organization_events: numberFrom(row.organization_events),
    operation_cohorts: numberFrom(row.operation_cohorts),
    user_goals: numberFrom(row.user_goals),
    saved_preferences: numberFrom(row.saved_preferences),
    offerings: numberFrom(row.offerings),
    total_links: numberFrom(row.total_links),
    token: typeof row.token === 'string' ? row.token : '',
  };
}

function groupFrom(value: unknown): AffinityGroup {
  const row = recordFrom(value);
  const icon = affinityIcons.includes(row.icon as AffinityIcon) ? row.icon as AffinityIcon : 'Sparkles';
  const accent = affinityAccents.includes(row.accent as AffinityAccent)
    ? row.accent as AffinityAccent
    : 'from-lime-500/30';
  return {
    ...impactFrom(row),
    key: String(row.key ?? ''),
    label: String(row.label ?? ''),
    icon,
    accent,
    aliases: Array.isArray(row.aliases) ? row.aliases.map(String) : [],
    sort_order: numberFrom(row.sort_order),
    active: row.active === true,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export async function listAffinityGroups(): Promise<AffinityGroup[]> {
  const { data, error } = await supabase.rpc('control_list_affinity_groups');
  if (error) throw error;
  return Array.isArray(data) ? data.map(groupFrom) : [];
}

export async function getAffinityGroupImpact(key: string): Promise<AffinityImpact> {
  const { data, error } = await supabase.rpc('control_get_affinity_group_impact', { p_key: key });
  if (error) throw error;
  return impactFrom(data);
}

export async function createAffinityGroup(input: AffinityGroupInput): Promise<AffinityGroup> {
  const { data, error } = await supabase.rpc('control_create_affinity_group', {
    p_label: input.label,
    p_icon: input.icon,
    p_accent: input.accent,
    p_aliases: input.aliases,
  });
  if (error) throw error;
  return groupFrom(data);
}

export async function updateAffinityGroup(input: AffinityGroupInput & { key: string }): Promise<AffinityGroup> {
  const { data, error } = await supabase.rpc('control_update_affinity_group', {
    p_key: input.key,
    p_label: input.label,
    p_icon: input.icon,
    p_accent: input.accent,
    p_aliases: input.aliases,
  });
  if (error) throw error;
  return groupFrom(data);
}

export async function reorderAffinityGroups(keys: string[]): Promise<void> {
  const { error } = await supabase.rpc('control_reorder_affinity_groups', { p_keys: keys });
  if (error) throw error;
}

export async function activateAffinityGroup(key: string): Promise<AffinityGroup> {
  const { data, error } = await supabase.rpc('control_activate_affinity_group', { p_key: key });
  if (error) throw error;
  return groupFrom(data);
}

export async function deactivateAffinityGroup(input: {
  key: string;
  confirmation: string;
  expectedToken: string;
}): Promise<{ group: AffinityGroup; impact: AffinityImpact; alreadyInactive: boolean }> {
  const { data, error } = await supabase.rpc('control_deactivate_affinity_group', {
    p_key: input.key,
    p_confirmation: input.confirmation,
    p_expected_token: input.expectedToken,
  });
  if (error) throw error;
  const result = recordFrom(data);
  return {
    group: groupFrom(result.group),
    impact: impactFrom(result.impact),
    alreadyInactive: result.already_inactive === true,
  };
}

export async function listAffinityGroupAudit(): Promise<AffinityAuditEntry[]> {
  const { data, error } = await supabase.rpc('control_list_affinity_group_audit', { p_limit: 50 });
  if (error) throw error;
  return Array.isArray(data) ? data.map((value) => {
    const row = recordFrom(value);
    return {
      id: String(row.id ?? ''),
      group_key: typeof row.group_key === 'string' ? row.group_key : null,
      action: String(row.action ?? 'update') as AffinityAuditEntry['action'],
      before_data: recordFrom(row.before_data),
      after_data: recordFrom(row.after_data),
      impact: impactFrom(row.impact),
      created_at: String(row.created_at ?? ''),
      actor_user_id: typeof row.actor_user_id === 'string' ? row.actor_user_id : null,
      actor_name: typeof row.actor_name === 'string' ? row.actor_name : null,
    };
  }) : [];
}

function affinityGroupErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  const row = recordFrom(error);
  return [row.message, row.details, row.hint, row.code]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
}

export function isAffinityGroupImpactChanged(error: unknown): boolean {
  return affinityGroupErrorText(error).includes('affinity_group_impact_changed');
}

export function affinityGroupErrorMessage(error: unknown): string {
  const message = affinityGroupErrorText(error);
  if (message.includes('affinity_group_value_conflict')) return 'Nome, chave ou alias já usado por outro grupo.';
  if (message.includes('last_active_affinity_group')) return 'O último grupo ativo não pode ser desativado.';
  if (message.includes('affinity_group_impact_changed')) return 'Os vínculos mudaram. Revise o impacto atualizado e confirme novamente.';
  if (message.includes('affinity_group_confirmation_mismatch')) return 'O nome digitado não confere.';
  if (message.includes('invalid_affinity_group_order')) return 'A ordem mudou em outra sessão. Atualize a lista e tente novamente.';
  if (message.includes('forbidden')) return 'Seu perfil não possui permissão para esta ação.';
  return 'Não foi possível concluir a ação. Tente novamente.';
}

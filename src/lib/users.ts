import { supabase } from './supabase';

export type UserListItem = {
  id: string;
  username: string | null;
  full_name: string | null;
  preferred_display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  account_kind: string | null;
  created_at: string;
  cpf_last4: string | null;
  has_cpf: boolean;
  is_creator: boolean;
  is_professional: boolean;
  professional_shell_enabled: boolean;
  is_ambassador: boolean;
  app_lockdown: boolean;
  staff_role: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

export type UserSearchFilters = {
  query?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  limit?: number;
  offset?: number;
};

export type UserSearchPage = {
  total: number;
  limit: number;
  offset: number;
  items: UserListItem[];
};

export type IdentityDocumentMetadata = {
  country_code: string;
  doc_type: string;
  last4: string | null;
  is_primary: boolean;
  verification_status: string;
  verified_at: string | null;
};

/** Campos do cadastro que o backoffice mostra e edita. O resto do perfil vem junto em `extra`. */
export type UserProfileRecord = {
  id: string;
  username: string | null;
  full_name: string | null;
  preferred_display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website_url: string | null;
  email: string | null;
  secondary_email: string | null;
  phone: string | null;
  identity_documents: IdentityDocumentMetadata[];
  city: string | null;
  state: string | null;
  country_code: string | null;
  language: string | null;
  timezone: string | null;
  account_kind: string | null;
  default_workspace: string | null;
  onboarding_track: string | null;
  billing_preference: string | null;
  creator_status: string | null;
  professional_specialty: string | null;
  professional_council: string | null;
  professional_registration: string | null;
  professional_types: string[];
  lockdown_reason: string | null;
  is_creator: boolean;
  is_professional: boolean;
  professional_shell_enabled: boolean;
  is_ambassador: boolean;
  is_identity_verified: boolean;
  onboarding_completed: boolean;
  profile_completion_pending: boolean;
  app_lockdown: boolean;
  level: number;
  xp: number;
  streak: number;
  pulse_coins: number;
  created_at: string | null;
};

export type UserAuthInfo = {
  email: string | null;
  phone: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  banned_until: string | null;
  providers: string[];
  mfa_factors: number;
};

export type UserRecentItem = Record<string, unknown> & { id?: string };

export type UserAuditEntry = {
  id: string;
  action: 'profile_update' | 'account_delete';
  actor_email: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  reason: string | null;
  created_at: string;
};

export type UserOverview = {
  profile: UserProfileRecord;
  staff_role: string | null;
  auth: UserAuthInfo | null;
  creator_profile: Record<string, unknown> | null;
  stats: Record<string, number>;
  finance: Record<string, number>;
  recent: Record<string, UserRecentItem[]>;
  audit: UserAuditEntry[];
  generated_at: string;
};

export type FootprintItem = {
  schema: string;
  table: string;
  column: string;
  rows: number;
  capped: boolean;
  effect: 'delete' | 'unlink' | 'blocking';
};

export type UserFootprint = {
  user_id: string;
  total_rows: number;
  blocking_references: number;
  items: FootprintItem[];
  generated_at: string;
};

export type UpdateUserAccountInput = {
  userId: string;
  profile?: Record<string, unknown>;
  email?: string | null;
  password?: string | null;
  cpf?: string | null;
  reason?: string | null;
};

export type DeleteUserAccountInput = {
  userId: string;
  reason?: string | null;
};

export type DeleteUserAccountResult = {
  purge: {
    purged: Record<string, number>;
    footprint: UserFootprint;
    finance: Record<string, number>;
  } | null;
  healthDocumentsRemoved: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function boolFrom(value: unknown): boolean {
  return value === true;
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseIdentityDocuments(value: unknown): IdentityDocumentMetadata[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asRecord(item);
    const countryCode = stringOrNull(row.country_code)?.toUpperCase();
    const docType = stringOrNull(row.doc_type)?.toLowerCase();
    if (!countryCode || !docType) return [];
    return [{
      country_code: countryCode,
      doc_type: docType,
      last4: stringOrNull(row.last4),
      is_primary: boolFrom(row.is_primary),
      verification_status: stringOrNull(row.verification_status) ?? 'unverified',
      verified_at: stringOrNull(row.verified_at),
    }];
  });
}

function numberMap(value: unknown): Record<string, number> {
  const row = asRecord(value);
  return Object.fromEntries(Object.entries(row).map(([key, item]) => [key, numberFrom(item)]));
}

function parseListItem(value: unknown): UserListItem {
  const row = asRecord(value);
  return {
    id: String(row.id ?? ''),
    username: stringOrNull(row.username),
    full_name: stringOrNull(row.full_name),
    preferred_display_name: stringOrNull(row.preferred_display_name),
    avatar_url: stringOrNull(row.avatar_url),
    email: stringOrNull(row.email),
    phone: stringOrNull(row.phone),
    city: stringOrNull(row.city),
    state: stringOrNull(row.state),
    account_kind: stringOrNull(row.account_kind),
    created_at: String(row.created_at ?? ''),
    cpf_last4: stringOrNull(row.cpf_last4),
    has_cpf: boolFrom(row.has_cpf),
    is_creator: boolFrom(row.is_creator),
    is_professional: boolFrom(row.is_professional),
    professional_shell_enabled: boolFrom(row.professional_shell_enabled),
    is_ambassador: boolFrom(row.is_ambassador),
    app_lockdown: boolFrom(row.app_lockdown),
    staff_role: stringOrNull(row.staff_role),
    last_sign_in_at: stringOrNull(row.last_sign_in_at),
    email_confirmed_at: stringOrNull(row.email_confirmed_at),
  };
}

function parseProfile(value: unknown): UserProfileRecord {
  const row = asRecord(value);
  return {
    id: String(row.id ?? ''),
    username: stringOrNull(row.username),
    full_name: stringOrNull(row.full_name),
    preferred_display_name: stringOrNull(row.preferred_display_name),
    avatar_url: stringOrNull(row.avatar_url),
    bio: stringOrNull(row.bio),
    website_url: stringOrNull(row.website_url),
    email: stringOrNull(row.email),
    secondary_email: stringOrNull(row.secondary_email),
    phone: stringOrNull(row.phone),
    identity_documents: parseIdentityDocuments(row.identity_documents),
    city: stringOrNull(row.city),
    state: stringOrNull(row.state),
    country_code: stringOrNull(row.country_code),
    language: stringOrNull(row.language),
    timezone: stringOrNull(row.timezone),
    account_kind: stringOrNull(row.account_kind),
    default_workspace: stringOrNull(row.default_workspace),
    onboarding_track: stringOrNull(row.onboarding_track),
    billing_preference: stringOrNull(row.billing_preference),
    creator_status: stringOrNull(row.creator_status),
    professional_specialty: stringOrNull(row.professional_specialty),
    professional_council: stringOrNull(row.professional_council),
    professional_registration: stringOrNull(row.professional_registration),
    professional_types: stringArray(row.professional_types),
    lockdown_reason: stringOrNull(row.lockdown_reason),
    is_creator: boolFrom(row.is_creator),
    is_professional: boolFrom(row.is_professional),
    professional_shell_enabled: boolFrom(row.professional_shell_enabled),
    is_ambassador: boolFrom(row.is_ambassador),
    is_identity_verified: boolFrom(row.is_identity_verified),
    onboarding_completed: boolFrom(row.onboarding_completed),
    profile_completion_pending: boolFrom(row.profile_completion_pending),
    app_lockdown: boolFrom(row.app_lockdown),
    level: numberFrom(row.level),
    xp: numberFrom(row.xp),
    streak: numberFrom(row.streak),
    pulse_coins: numberFrom(row.pulse_coins),
    created_at: stringOrNull(row.created_at),
  };
}

function parseAudit(value: unknown): UserAuditEntry {
  const row = asRecord(value);
  return {
    id: String(row.id ?? ''),
    action: row.action === 'account_delete' ? 'account_delete' : 'profile_update',
    actor_email: stringOrNull(row.actor_email),
    changes: asRecord(row.changes) as UserAuditEntry['changes'],
    reason: stringOrNull(row.reason),
    created_at: String(row.created_at ?? ''),
  };
}

function parseFootprint(value: unknown): UserFootprint {
  const row = asRecord(value);
  return {
    user_id: String(row.user_id ?? ''),
    total_rows: numberFrom(row.total_rows),
    blocking_references: numberFrom(row.blocking_references),
    items: Array.isArray(row.items)
      ? row.items.map((item) => {
        const entry = asRecord(item);
        const effect = entry.effect === 'unlink' || entry.effect === 'blocking' ? entry.effect : 'delete';
        return {
          schema: String(entry.schema ?? 'public'),
          table: String(entry.table ?? ''),
          column: String(entry.column ?? ''),
          rows: numberFrom(entry.rows),
          capped: boolFrom(entry.capped),
          effect,
        } as FootprintItem;
      })
      : [],
    generated_at: String(row.generated_at ?? ''),
  };
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: Response }).context;
  if (context) {
    try {
      const body = asRecord(await context.json());
      if (body.error) throw new Error(String(body.error));
    } catch (contextError) {
      if (contextError instanceof Error && contextError.message !== 'Unexpected end of JSON input') {
        throw contextError;
      }
    }
  }
  throw error;
}

export async function searchUsers(filters: UserSearchFilters): Promise<UserSearchPage> {
  const { data, error } = await supabase.rpc('control_directory_search_users', {
    p_query: filters.query?.trim() || null,
    p_created_from: filters.createdFrom || null,
    p_created_to: filters.createdTo || null,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;

  const row = asRecord(data);
  return {
    total: numberFrom(row.total),
    limit: numberFrom(row.limit),
    offset: numberFrom(row.offset),
    items: Array.isArray(row.items) ? row.items.map(parseListItem) : [],
  };
}

export async function fetchUserOverview(userId: string): Promise<UserOverview> {
  const { data, error } = await supabase.rpc('control_directory_user_overview', { p_user_id: userId });
  if (error) throw error;

  const row = asRecord(data);
  const auth = row.auth ? asRecord(row.auth) : null;
  const recentRow = asRecord(row.recent);
  const recent: Record<string, UserRecentItem[]> = {};
  for (const [key, value] of Object.entries(recentRow)) {
    recent[key] = Array.isArray(value) ? value.map((item) => asRecord(item) as UserRecentItem) : [];
  }

  return {
    profile: parseProfile(row.profile),
    staff_role: stringOrNull(row.staff_role),
    auth: auth
      ? {
        email: stringOrNull(auth.email),
        phone: stringOrNull(auth.phone),
        created_at: stringOrNull(auth.created_at),
        last_sign_in_at: stringOrNull(auth.last_sign_in_at),
        email_confirmed_at: stringOrNull(auth.email_confirmed_at),
        phone_confirmed_at: stringOrNull(auth.phone_confirmed_at),
        banned_until: stringOrNull(auth.banned_until),
        providers: stringArray(auth.providers),
        mfa_factors: numberFrom(auth.mfa_factors),
      }
      : null,
    creator_profile: row.creator_profile ? asRecord(row.creator_profile) : null,
    stats: numberMap(row.stats),
    finance: numberMap(row.finance),
    recent,
    audit: Array.isArray(row.audit) ? row.audit.map(parseAudit) : [],
    generated_at: String(row.generated_at ?? ''),
  };
}

export async function fetchUserFootprint(userId: string): Promise<UserFootprint> {
  const { data, error } = await supabase.rpc('control_directory_user_footprint', { p_user_id: userId });
  if (error) throw error;
  return parseFootprint(data);
}

export type UpdateUserAccountResult = {
  profile: UserProfileRecord | null;
  changedFields: string[];
};

export async function updateUserAccount(input: UpdateUserAccountInput): Promise<UpdateUserAccountResult> {
  const { data, error } = await supabase.functions.invoke('control-user-account', {
    method: 'PATCH',
    body: {
      user_id: input.userId,
      profile: input.profile ?? {},
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.password ? { password: input.password } : {}),
      ...(input.cpf !== undefined ? { cpf: input.cpf } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
    },
  });
  if (error) return throwFunctionError(error);

  const result = asRecord(data);
  if (result.error) throw new Error(String(result.error));
  const rpcResult = asRecord(result.result);
  return {
    profile: rpcResult.profile ? parseProfile(rpcResult.profile) : null,
    changedFields: stringArray(rpcResult.changed_fields),
  };
}

export async function deleteUserAccount(input: DeleteUserAccountInput): Promise<DeleteUserAccountResult> {
  const { data, error } = await supabase.functions.invoke('control-user-account', {
    method: 'DELETE',
    body: {
      user_id: input.userId,
      ...(input.reason ? { reason: input.reason } : {}),
    },
  });
  if (error) return throwFunctionError(error);

  const result = asRecord(data);
  if (result.error) throw new Error(String(result.error));
  const purge = asRecord(result.purge);
  return {
    purge: result.purge
      ? {
        purged: numberMap(purge.purged),
        footprint: parseFootprint(purge.footprint),
        finance: numberMap(purge.finance),
      }
      : null,
    healthDocumentsRemoved: numberFrom(result.health_documents_removed),
  };
}

/** Nome de exibição estável para lista, cabeçalho e confirmação de exclusão. */
export function displayName(user: { full_name?: string | null; preferred_display_name?: string | null; username?: string | null }): string {
  return user.full_name?.trim()
    || user.preferred_display_name?.trim()
    || (user.username ? `@${user.username}` : 'Sem nome');
}

export function formatDocument(last4: string | null): string {
  if (last4 && last4.length === 4) return `•••.•••.•${last4.slice(0, 2)}-${last4.slice(2)}`;
  if (last4) return `•••.•••.•••-${last4}`;
  return '—';
}

export function primaryCpf(profile: Pick<UserProfileRecord, 'identity_documents'>) {
  return profile.identity_documents.find((document) =>
    document.country_code === 'BR' && document.doc_type === 'cpf'
  ) ?? null;
}

/** Rótulos das tabelas que aparecem no raio-x; sem tradução, mostramos o nome técnico. */
const TABLE_LABELS: Record<string, string> = {
  posts: 'Posts do feed',
  post_comments: 'Comentários em posts',
  post_likes: 'Curtidas',
  post_comment_reactions: 'Reações a comentários',
  stories: 'Stories',
  story_views: 'Visualizações de stories',
  video_views: 'Visualizações de vídeo',
  feed_post_events: 'Eventos do feed',
  communities: 'Comunidades criadas',
  community_members: 'Participações em comunidades',
  community_posts: 'Posts em comunidades',
  community_post_comments: 'Comentários em comunidades',
  community_post_reactions: 'Reações em comunidades',
  community_poll_votes: 'Votos em enquetes',
  community_join_requests: 'Pedidos de entrada',
  community_bans: 'Banimentos',
  challenges: 'Desafios criados',
  challenge_runs: 'Edições de desafio',
  challenge_participants: 'Participações em desafios',
  challenge_checkins: 'Check-ins de desafio',
  challenge_logs: 'Registros de desafio',
  challenge_scores: 'Pontuações de desafio',
  challenge_comments: 'Comentários em desafios',
  challenge_reactions: 'Reações em desafios',
  challenge_task_completions: 'Tarefas de desafio concluídas',
  business_offerings: 'Ofertas de negócio',
  offering_entitlements: 'Acessos concedidos',
  courses: 'Cursos',
  course_completions: 'Conclusões de curso',
  course_lesson_progress: 'Progresso em aulas',
  organizations: 'Negócios/organizações',
  organization_members: 'Vínculos com negócios',
  organization_clients: 'Clientes do negócio',
  payment_transactions: 'Transações de pagamento',
  payment_subscriptions: 'Assinaturas',
  payment_customers: 'Cadastro no provedor de pagamento',
  payment_cards: 'Cartões salvos',
  payment_checkout_intents: 'Tentativas de checkout',
  physical_orders: 'Pedidos físicos',
  wallet_ledger: 'Extrato da carteira',
  payout_requests: 'Pedidos de resgate',
  financial_journal_entries: 'Lançamentos contábeis',
  platform_fee_ledger: 'Taxas da plataforma',
  messages: 'Mensagens diretas',
  message_conversation_state: 'Conversas',
  notifications: 'Notificações',
  creator_follows: 'Seguidores e seguindo',
  subscriptions: 'Assinaturas de criador',
  creator_profiles: 'Perfil de criador',
  workouts: 'Treinos',
  workout_sessions: 'Sessões de treino',
  workout_logs: 'Registros de treino',
  workout_protocols: 'Protocolos de treino',
  workout_templates: 'Modelos de treino',
  workout_cycles: 'Mesociclos',
  student_workout_assignments: 'Treinos atribuídos',
  training_programs: 'Programas de treino',
  training_program_enrollments: 'Inscrições em programas',
  composite_workouts: 'Treinos compostos',
  coach_relationships: 'Relação treinador–aluno',
  coach_exercises: 'Exercícios da biblioteca',
  diet_plans: 'Planos alimentares',
  diet_plan_meals: 'Refeições do plano',
  nutrition_daily_checkins: 'Check-ins de nutrição',
  health_documents: 'Documentos de saúde',
  health_events: 'Eventos de saúde',
  health_metrics_daily: 'Métricas de saúde',
  health_biometric_samples: 'Amostras biométricas',
  wearable_connections: 'Conexões de wearable',
  wearable_samples_agg: 'Dados de wearable',
  user_achievements: 'Conquistas',
  user_badges: 'Selos',
  user_checkins: 'Check-ins',
  user_preferences: 'Preferências',
  user_addresses: 'Endereços',
  user_blocks: 'Bloqueios entre usuários',
  user_push_tokens: 'Tokens de push',
  platform_content_reports: 'Denúncias',
  security_events: 'Eventos de segurança',
  consent_records: 'Consentimentos',
  referrals: 'Indicações',
  referral_codes: 'Códigos de indicação',
  entitlements: 'Direitos de acesso',
  live_rooms: 'Salas ao vivo',
  lives: 'Lives',
  places: 'Locais',
  place_posts: 'Posts em locais',
  progress: 'Progresso',
  myfit_ai_conversations: 'Conversas com a IA',
  myfit_ai_messages: 'Mensagens da IA',
};

export function tableLabel(table: string): string {
  return TABLE_LABELS[table] ?? table.replace(/_/g, ' ');
}

/** Mensagens de erro das RPCs e da edge function, na linguagem da operação. */
export function userAdminErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('forbidden')) return 'Seu papel no backoffice não permite esta ação.';
  if (message.includes('mfa_required')) return 'Refaça o login com verificação em duas etapas.';
  if (message.includes('username_taken')) return 'Este @usuário já pertence a outra conta.';
  if (message.includes('invalid_username')) return 'O @usuário aceita apenas letras minúsculas, números e _ (mínimo 3 caracteres).';
  if (message.includes('email_taken')) return 'Este e-mail já pertence a outra conta.';
  if (message.includes('invalid_email')) return 'Informe um e-mail válido.';
  if (message.includes('weak_password')) return 'A senha precisa de 8 caracteres com maiúscula, minúscula, número e símbolo.';
  if (message.includes('cpf_already_claimed')) return 'Este CPF já está em uso por outra conta.';
  if (message.includes('invalid_cpf') || message.includes('invalid_tax_id')) return 'CPF inválido.';
  if (message.includes('cannot_delete_self')) return 'Você não pode excluir a própria conta.';
  if (message.includes('target_is_staff')) return 'Esta conta é da equipe interna. Remova o acesso em Equipe antes de excluir.';
  if (message.includes('blocked_payout_batches')) return 'Esta conta criou lotes de repasse. Trate os lotes antes de excluir.';
  if (message.includes('delete_blocked')) return `A exclusão foi interrompida pelo banco: ${message.replace('delete_blocked: ', '')}`;
  if (message.includes('user_not_found')) return 'Conta não encontrada. Atualize a lista.';
  if (message.includes('health_documents_purge_failed')) return 'Não foi possível apagar os documentos de saúde no armazenamento. Nada foi excluído.';
  if (message.includes('auth_delete_failed')) return 'Os dados foram apagados, mas a identidade de login não pôde ser removida. Acione o time de plataforma.';
  if (message.includes('auth_update_failed')) return 'O cadastro foi salvo, mas o login não pôde ser atualizado.';
  if (message.includes('empty_patch')) return 'Nenhuma alteração para salvar.';
  if (message.startsWith('unsupported_field')) return `Campo não editável: ${message.split(':')[1] ?? ''}`.trim();
  if (message.includes('profiles_username_format_check')) return 'O @usuário aceita apenas letras minúsculas, números e _.';
  if (message.includes('profiles_professional_credentials_check')) return 'Especialidade profissional exige também o conselho.';
  if (message.includes('profiles_account_kind_check')) return 'Tipo de conta inválido.';
  return 'Não foi possível concluir a operação. Verifique os dados e tente novamente.';
}

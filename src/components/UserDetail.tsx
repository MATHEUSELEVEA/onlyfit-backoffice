import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { formatCurrencyExact, formatDateTime, formatNumber } from '../lib/format';
import {
  displayName,
  formatDocument,
  primaryCpf,
  tableLabel,
  userAdminErrorMessage,
  type UserOverview,
  type UserProfileRecord,
  type UserRecentItem,
} from '../lib/users';
import { useUpdateUserAccount, useUserFootprint, useUserOverview } from '../hooks/useUsers';
import { useProfessionalSpecialties } from '../hooks/useProfessionalSpecialties';
import { UserDeleteDialog } from './UserDeleteDialog';

type TabId = 'cadastro' | 'plataforma' | 'raiox';

type FormState = {
  full_name: string;
  preferred_display_name: string;
  username: string;
  bio: string;
  website_url: string;
  phone: string;
  secondary_email: string;
  city: string;
  state: string;
  country_code: string;
  language: string;
  timezone: string;
  account_kind: string;
  default_workspace: string;
  onboarding_track: string;
  billing_preference: string;
  creator_status: string;
  professional_specialty: string;
  professional_council: string;
  professional_registration: string;
  professional_types: string;
  lockdown_reason: string;
  level: string;
  xp: string;
  streak: string;
  pulse_coins: string;
  is_creator: boolean;
  is_professional: boolean;
  professional_shell_enabled: boolean;
  is_ambassador: boolean;
  is_identity_verified: boolean;
  onboarding_completed: boolean;
  profile_completion_pending: boolean;
  app_lockdown: boolean;
  email: string;
  cpf: string;
  password: string;
};

const TEXT_FIELDS = [
  'full_name', 'preferred_display_name', 'username', 'bio', 'website_url', 'phone', 'secondary_email',
  'city', 'state', 'country_code', 'language', 'timezone', 'account_kind', 'default_workspace',
  'onboarding_track', 'billing_preference', 'creator_status', 'professional_specialty',
  'professional_council', 'professional_registration', 'lockdown_reason',
] as const satisfies ReadonlyArray<keyof UserProfileRecord & keyof FormState>;

const NUMBER_FIELDS = ['level', 'xp', 'streak', 'pulse_coins'] as const;

const BOOLEAN_FIELDS = [
  'is_creator', 'is_professional', 'professional_shell_enabled', 'is_ambassador',
  'is_identity_verified', 'onboarding_completed', 'profile_completion_pending', 'app_lockdown',
] as const;

const accountKindOptions = [
  { value: '', label: 'Não definido' },
  { value: 'athlete', label: 'Atleta / membro' },
  { value: 'professional', label: 'Profissional' },
];

const workspaceOptions = [
  { value: '', label: 'Não definido' },
  { value: 'student', label: 'Aluno' },
  { value: 'coach', label: 'Treinador' },
  { value: 'nutrition', label: 'Nutrição' },
  { value: 'creator', label: 'Criador' },
  { value: 'sports', label: 'Esportes' },
  { value: 'facility', label: 'Academia/espaço' },
];

const onboardingTrackOptions = [
  { value: '', label: 'Não definido' },
  { value: 'athlete', label: 'Atleta' },
  { value: 'personal_trainer', label: 'Personal trainer' },
  { value: 'nutritionist', label: 'Nutricionista' },
  { value: 'hybrid_professional', label: 'Profissional híbrido' },
  { value: 'creator', label: 'Criador' },
  { value: 'sports_consultancy', label: 'Consultoria esportiva' },
  { value: 'facility_owner', label: 'Dono de espaço' },
  { value: 'brand_owner', label: 'Marca' },
  { value: 'professional_athlete', label: 'Atleta profissional' },
];

const billingPreferenceOptions = [
  { value: '', label: 'Não definido' },
  { value: 'pending', label: 'Pendente' },
  { value: 'pass_to_student', label: 'Repassar ao aluno' },
  { value: 'absorb_trainer', label: 'Absorvida pelo profissional' },
];

const creatorStatusOptions = [
  { value: '', label: 'Não definido' },
  { value: 'user', label: 'Usuário' },
  { value: 'pending_kyc', label: 'KYC pendente' },
  { value: 'active_creator', label: 'Criador ativo' },
  { value: 'suspended', label: 'Suspenso' },
];

const booleanLabels: Record<(typeof BOOLEAN_FIELDS)[number], string> = {
  is_creator: 'Criador de conteúdo',
  is_professional: 'Profissional',
  professional_shell_enabled: 'Modo profissional ativo no app',
  is_ambassador: 'Embaixador',
  is_identity_verified: 'Identidade verificada',
  onboarding_completed: 'Onboarding concluído',
  profile_completion_pending: 'Cadastro pendente de conclusão',
  app_lockdown: 'Conta bloqueada no app',
};

const statLabels: Record<string, string> = {
  posts: 'Posts',
  post_comments: 'Comentários',
  post_likes: 'Curtidas',
  stories: 'Stories',
  communities_created: 'Comunidades criadas',
  community_memberships: 'Comunidades que participa',
  community_posts: 'Posts em comunidades',
  challenges_created: 'Desafios criados',
  challenge_participations: 'Desafios que participa',
  offerings: 'Ofertas',
  courses: 'Cursos',
  organizations: 'Negócios',
  training_programs: 'Programas de treino',
  workouts: 'Treinos',
  workout_sessions: 'Sessões de treino',
  coach_students: 'Alunos',
  coach_of: 'Treinadores',
  followers: 'Seguidores',
  following: 'Seguindo',
  messages_sent: 'Mensagens enviadas',
  messages_received: 'Mensagens recebidas',
  entitlements: 'Acessos concedidos',
  health_documents: 'Documentos de saúde',
  reports_against: 'Denúncias recebidas',
  reports_made: 'Denúncias feitas',
};

const financeLabels: Record<string, { label: string; currency: boolean }> = {
  purchases_count: { label: 'Compras', currency: false },
  purchases_paid_value: { label: 'Total comprado', currency: true },
  sales_count: { label: 'Vendas', currency: false },
  sales_paid_value: { label: 'Total vendido', currency: true },
  platform_commission: { label: 'Comissão OnlyFit', currency: true },
  wallet_balance: { label: 'Saldo em carteira', currency: true },
  wallet_entries: { label: 'Lançamentos na carteira', currency: false },
  active_subscriptions: { label: 'Assinaturas ativas', currency: false },
  subscriptions_as_buyer: { label: 'Assinaturas como cliente', currency: false },
  subscriptions_as_seller: { label: 'Assinaturas vendidas', currency: false },
  payout_requests: { label: 'Pedidos de resgate', currency: false },
  physical_orders: { label: 'Pedidos físicos', currency: false },
};

type RecentColumn = { key: string; label: string; kind?: 'text' | 'date' | 'currency' | 'number' | 'boolean' };

const recentSections: ReadonlyArray<{ key: string; title: string; columns: RecentColumn[] }> = [
  {
    key: 'posts',
    title: 'Posts',
    columns: [
      { key: 'title', label: 'Post' },
      { key: 'type', label: 'Tipo' },
      { key: 'visibility', label: 'Visibilidade' },
      { key: 'likes', label: 'Curtidas', kind: 'number' },
      { key: 'comments', label: 'Comentários', kind: 'number' },
      { key: 'published_at', label: 'Publicado', kind: 'date' },
    ],
  },
  {
    key: 'communities',
    title: 'Comunidades criadas',
    columns: [
      { key: 'name', label: 'Comunidade' },
      { key: 'members', label: 'Membros', kind: 'number' },
      { key: 'visibility', label: 'Visibilidade' },
      { key: 'created_at', label: 'Criada em', kind: 'date' },
    ],
  },
  {
    key: 'challenges',
    title: 'Desafios criados',
    columns: [
      { key: 'title', label: 'Desafio' },
      { key: 'published', label: 'Publicado', kind: 'boolean' },
      { key: 'visibility', label: 'Visibilidade' },
      { key: 'created_at', label: 'Criado em', kind: 'date' },
    ],
  },
  {
    key: 'offerings',
    title: 'Ofertas',
    columns: [
      { key: 'name', label: 'Oferta' },
      { key: 'offering_type', label: 'Tipo' },
      { key: 'status', label: 'Status' },
      { key: 'price', label: 'Preço', kind: 'currency' },
      { key: 'created_at', label: 'Criada em', kind: 'date' },
    ],
  },
  {
    key: 'courses',
    title: 'Cursos',
    columns: [
      { key: 'title', label: 'Curso' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Criado em', kind: 'date' },
    ],
  },
  {
    key: 'organizations',
    title: 'Negócios',
    columns: [
      { key: 'name', label: 'Negócio' },
      { key: 'kind', label: 'Tipo' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Criado em', kind: 'date' },
    ],
  },
  {
    key: 'transactions',
    title: 'Transações',
    columns: [
      { key: 'offering_name', label: 'Oferta' },
      { key: 'role', label: 'Papel' },
      { key: 'gross_value', label: 'Valor', kind: 'currency' },
      { key: 'status', label: 'Status' },
      { key: 'payment_method', label: 'Método' },
      { key: 'created_at', label: 'Data', kind: 'date' },
    ],
  },
  {
    key: 'subscriptions',
    title: 'Assinaturas',
    columns: [
      { key: 'offering_name', label: 'Oferta' },
      { key: 'role', label: 'Papel' },
      { key: 'value', label: 'Valor', kind: 'currency' },
      { key: 'cycle', label: 'Ciclo' },
      { key: 'status', label: 'Status' },
      { key: 'next_due_date', label: 'Próxima cobrança', kind: 'date' },
    ],
  },
  {
    key: 'wallet_entries',
    title: 'Carteira',
    columns: [
      { key: 'entry_type', label: 'Lançamento' },
      { key: 'amount', label: 'Valor', kind: 'currency' },
      { key: 'balance_after', label: 'Saldo depois', kind: 'currency' },
      { key: 'created_at', label: 'Data', kind: 'date' },
    ],
  },
  {
    key: 'reports',
    title: 'Denúncias',
    columns: [
      { key: 'role', label: 'Papel' },
      { key: 'target_type', label: 'Alvo' },
      { key: 'reason', label: 'Motivo' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Data', kind: 'date' },
    ],
  },
];

function toForm(profile: UserProfileRecord): FormState {
  const form = {} as FormState;
  for (const field of TEXT_FIELDS) {
    form[field] = (profile[field] as string | null) ?? '';
  }
  for (const field of NUMBER_FIELDS) {
    form[field] = String(profile[field] ?? 0);
  }
  for (const field of BOOLEAN_FIELDS) {
    form[field] = Boolean(profile[field]);
  }
  form.professional_types = profile.professional_types.join(', ');
  form.email = profile.email ?? '';
  form.cpf = '';
  form.password = '';
  return form;
}

function roleLabel(value: unknown): string {
  if (value === 'buyer') return 'Comprador';
  if (value === 'seller') return 'Vendedor';
  if (value === 'subject') return 'Denunciado';
  if (value === 'reporter') return 'Denunciante';
  return String(value ?? '—');
}

function renderCell(item: UserRecentItem, column: RecentColumn): string {
  const value = item[column.key];
  if (value === null || value === undefined || value === '') return '—';
  if (column.key === 'role') return roleLabel(value);
  switch (column.kind) {
    case 'date':
      return formatDateTime(new Date(String(value)));
    case 'currency':
      return formatCurrencyExact(Number(value));
    case 'number':
      return formatNumber(Number(value));
    case 'boolean':
      return value === true ? 'Sim' : 'Não';
    default:
      return String(value);
  }
}

function RecentTable({ title, columns, items }: { title: string; columns: RecentColumn[]; items: UserRecentItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="user-recent-block">
      <div className="section-heading">
        <div>
          <h3>{title}</h3>
          <p>{formatNumber(items.length)} registro(s) mais recentes</p>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="staff-table">
          <thead>
            <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={String(item.id ?? index)}>
                {columns.map((column) => <td key={column.key}>{renderCell(item, column)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProfileForm({
  profile,
  canEdit,
  onSaved,
}: {
  profile: UserProfileRecord;
  canEdit: boolean;
  onSaved: (message: string) => void;
}) {
  const updateMutation = useUpdateUserAccount();
  // G20 regra 8: a taxonomia vem do catálogo governado, nunca de uma constante
  // replicada aqui. O staff enxerga inclusive as inativas, para não perder o
  // rótulo de quem já foi validado numa especialidade desativada.
  const specialties = useProfessionalSpecialties();
  const specialtyOptions = useMemo(
    () => [
      { value: '', label: 'Nenhuma' },
      ...(specialties.data ?? []).map((item) => ({ value: item.key, label: item.label })),
    ],
    [specialties.data],
  );
  const [saved, setSaved] = useState<UserProfileRecord | null>(null);
  // Depois de salvar, o cadastro gravado vira a nova referência.
  const source = saved && saved.id === profile.id ? saved : profile;
  const baseline = useMemo(() => toForm(source), [source]);
  const [form, setForm] = useState<FormState>(baseline);
  const [hydratedFor, setHydratedFor] = useState(profile.id);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rehidrata quando a tela troca de usuário.
  if (hydratedFor !== profile.id) {
    setForm(toForm(profile));
    setSaved(null);
    setHydratedFor(profile.id);
    setMessage(null);
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const dirtyKeys = (Object.keys(baseline) as Array<keyof FormState>).filter((key) => form[key] !== baseline[key]);
  const dirty = dirtyKeys.length > 0;

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !dirty) return;
    setMessage(null);

    const patch: Record<string, unknown> = {};
    for (const field of TEXT_FIELDS) {
      if (form[field] !== baseline[field]) patch[field] = form[field].trim();
    }
    for (const field of NUMBER_FIELDS) {
      if (form[field] !== baseline[field]) {
        const parsed = Number(form[field]);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setMessage({ type: 'error', text: 'Os números de gamificação precisam ser inteiros positivos.' });
          return;
        }
        patch[field] = Math.round(parsed);
      }
    }
    for (const field of BOOLEAN_FIELDS) {
      if (form[field] !== baseline[field]) patch[field] = form[field];
    }
    if (form.professional_types !== baseline.professional_types) {
      patch.professional_types = form.professional_types
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const emailChanged = form.email.trim().toLowerCase() !== baseline.email.trim().toLowerCase();
    const cpfChanged = primaryCpf(source) == null && form.cpf.replace(/\D/g, '').length > 0;
    if (emailChanged && !form.email.trim()) {
      setMessage({ type: 'error', text: 'O e-mail de login não pode ficar vazio.' });
      return;
    }
    if (Object.keys(patch).length === 0 && !emailChanged && !cpfChanged && !form.password) {
      setMessage({ type: 'error', text: 'Nenhuma alteração para salvar.' });
      return;
    }

    updateMutation.mutate(
      {
        userId: profile.id,
        profile: patch,
        ...(emailChanged ? { email: form.email.trim().toLowerCase() } : {}),
        ...(cpfChanged ? { cpf: form.cpf.replace(/\D/g, '') } : {}),
        ...(form.password ? { password: form.password } : {}),
      },
      {
        onSuccess: (result) => {
          if (result.profile) {
            const nextProfile = result.profile.identity_documents.length > 0
              ? result.profile
              : { ...result.profile, identity_documents: source.identity_documents };
            setSaved(nextProfile);
            setForm(toForm(nextProfile));
          } else {
            setForm((current) => ({ ...current, password: '' }));
          }
          onSaved('Cadastro atualizado.');
          setMessage({ type: 'success', text: 'Cadastro atualizado.' });
        },
        onError: (error) => setMessage({ type: 'error', text: userAdminErrorMessage(error) }),
      },
    );
  };

  const textField = (key: keyof FormState & string, label: string, hint?: string) => (
    <label className="user-field" key={key}>
      <span>{label}</span>
      <input
        value={String(form[key] ?? '')}
        disabled={!canEdit}
        onChange={(event) => setField(key as keyof FormState, event.target.value as never)}
      />
      {hint && <small>{hint}</small>}
    </label>
  );

  const selectField = (
    key: keyof FormState & string,
    label: string,
    options: ReadonlyArray<{ value: string; label: string }>,
  ) => (
    <label className="user-field" key={key}>
      <span>{label}</span>
      <select
        value={String(form[key] ?? '')}
        disabled={!canEdit}
        onChange={(event) => setField(key as keyof FormState, event.target.value as never)}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );

  return (
    <form className="user-form" onSubmit={save}>
      <fieldset className="user-form-group">
        <legend>Identidade</legend>
        <div className="user-field-grid">
          {textField('full_name', 'Nome completo')}
          {textField('preferred_display_name', 'Nome de exibição')}
          {textField('username', '@usuário', 'Letras minúsculas, números e _')}
          {textField('website_url', 'Site')}
        </div>
        <label className="user-field">
          <span>Bio</span>
          <textarea
            rows={3}
            value={form.bio}
            disabled={!canEdit}
            onChange={(event) => setField('bio', event.target.value)}
          />
        </label>
      </fieldset>

      <fieldset className="user-form-group">
        <legend>Acesso e contato</legend>
        <div className="user-field-grid">
          {textField('email', 'E-mail de login', 'Atualiza o login e o cadastro')}
          {textField('secondary_email', 'E-mail secundário')}
          {textField('phone', 'Telefone')}
          {primaryCpf(source) ? (
            <div className="user-field">
              <span>CPF</span>
              <strong>{formatDocument(primaryCpf(source)?.last4 ?? null)}</strong>
            </div>
          ) : textField('cpf', 'CPF')}
          <label className="user-field">
            <span>Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              disabled={!canEdit}
              onChange={(event) => setField('password', event.target.value)}
            />
            <small>Deixe em branco para manter a senha atual</small>
          </label>
        </div>
      </fieldset>

      <fieldset className="user-form-group">
        <legend>Localização e preferências</legend>
        <div className="user-field-grid">
          {textField('city', 'Cidade')}
          {textField('state', 'Estado')}
          {textField('country_code', 'País')}
          {textField('language', 'Idioma')}
          {textField('timezone', 'Fuso horário')}
          {selectField('account_kind', 'Tipo de conta', accountKindOptions)}
          {selectField('default_workspace', 'Área padrão', workspaceOptions)}
          {selectField('onboarding_track', 'Trilha de onboarding', onboardingTrackOptions)}
          {selectField('billing_preference', 'Preferência de cobrança', billingPreferenceOptions)}
        </div>
      </fieldset>

      <fieldset className="user-form-group">
        <legend>Perfil profissional e criador</legend>
        <div className="user-field-grid">
          {selectField('professional_specialty', 'Especialidade', specialtyOptions)}
          {textField('professional_council', 'Conselho', 'Obrigatório quando há especialidade')}
          {textField('professional_registration', 'Registro no conselho')}
          {textField('professional_types', 'Tipos profissionais', 'Separados por vírgula')}
          {selectField('creator_status', 'Status de criador', creatorStatusOptions)}
        </div>
      </fieldset>

      <fieldset className="user-form-group">
        <legend>Marcadores da conta</legend>
        <div className="user-toggle-grid">
          {BOOLEAN_FIELDS.map((field) => (
            <label key={field} className={`user-toggle ${form[field] ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={form[field]}
                disabled={!canEdit}
                onChange={(event) => setField(field, event.target.checked)}
              />
              <span>{booleanLabels[field]}</span>
            </label>
          ))}
        </div>
        {form.app_lockdown && textField('lockdown_reason', 'Motivo do bloqueio')}
      </fieldset>

      <fieldset className="user-form-group">
        <legend>Gamificação</legend>
        <div className="user-field-grid">
          {NUMBER_FIELDS.map((field) => (
            <label className="user-field" key={field}>
              <span>{field === 'pulse_coins' ? 'Moedas' : field === 'level' ? 'Nível' : field === 'xp' ? 'XP' : 'Ofensiva'}</span>
              <input
                inputMode="numeric"
                value={form[field]}
                disabled={!canEdit}
                onChange={(event) => setField(field, event.target.value.replace(/[^\d]/g, ''))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      {message && (
        <div className={`inline-alert ${message.type === 'error' ? 'danger' : ''}`} role="status">
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      {canEdit && (
        <div className="user-form-actions">
          <span>{dirty ? `${dirtyKeys.length} campo(s) alterado(s)` : 'Nenhuma alteração pendente'}</span>
          <button className="button primary" type="submit" disabled={!dirty || updateMutation.isPending}>
            {updateMutation.isPending ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
            Salvar cadastro
          </button>
        </div>
      )}
    </form>
  );
}

function FootprintPanel({ userId, active }: { userId: string; active: boolean }) {
  const query = useUserFootprint(userId, active);

  if (query.isLoading) return <div className="skeleton staff-skeleton" />;
  if (query.isError) {
    return (
      <div className="inline-alert danger" role="alert">
        <AlertTriangle size={18} />
        Não foi possível montar o raio-x desta conta.
      </div>
    );
  }
  const data = query.data;
  if (!data) return null;

  return (
    <section className="staff-list-section">
      <div className="section-heading">
        <div>
          <h2>Tudo que existe em nome desta conta</h2>
          <p>
            {formatNumber(data.total_rows)} registro(s) em {formatNumber(data.items.length)} tabela(s).
            Varredura direta sobre as referências do banco.
          </p>
        </div>
      </div>
      {data.items.length === 0 ? (
        <p className="empty-copy">Nenhum registro vinculado além do próprio cadastro.</p>
      ) : (
        <div className="table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Área</th>
                <th>Tabela</th>
                <th>Registros</th>
                <th>Na exclusão</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={`${item.table}.${item.column}`}>
                  <td><strong>{tableLabel(item.table)}</strong><span>{item.column}</span></td>
                  <td>{item.schema === 'public' ? item.table : `${item.schema}.${item.table}`}</td>
                  <td>{formatNumber(item.rows)}{item.capped ? '+' : ''}</td>
                  <td>
                    <span className={`role-badge ${item.effect === 'unlink' ? '' : 'role-admin'}`}>
                      {item.effect === 'unlink' ? 'Desvincula' : 'Apaga'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PlatformPanel({ overview }: { overview: UserOverview }) {
  const stats = Object.entries(overview.stats).filter(([, value]) => value > 0);
  const finance = Object.entries(overview.finance).filter(([, value]) => value > 0);

  return (
    <>
      <section className="staff-list-section">
        <div className="section-heading">
          <div>
            <h2>Números da conta</h2>
            <p>Somente o que tem registro; o restante está zerado.</p>
          </div>
        </div>
        {stats.length === 0 && finance.length === 0 ? (
          <p className="empty-copy">Esta conta ainda não gerou atividade na plataforma.</p>
        ) : (
          <div className="user-stat-grid">
            {stats.map(([key, value]) => (
              <article key={key}>
                <span>{statLabels[key] ?? key.replace(/_/g, ' ')}</span>
                <strong>{formatNumber(value)}</strong>
              </article>
            ))}
            {finance.map(([key, value]) => {
              const descriptor = financeLabels[key];
              return (
                <article key={key} className="finance">
                  <span>{descriptor?.label ?? key.replace(/_/g, ' ')}</span>
                  <strong>{descriptor?.currency ? formatCurrencyExact(value) : formatNumber(value)}</strong>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {recentSections.map((section) => (
        <RecentTable
          key={section.key}
          title={section.title}
          columns={section.columns}
          items={overview.recent[section.key] ?? []}
        />
      ))}
    </>
  );
}

export function UserDetail({
  userId,
  canEdit,
  canDelete,
  onBack,
  onDeleted,
}: {
  userId: string;
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onDeleted: (message: string) => void;
}) {
  const [tab, setTab] = useState<TabId>('cadastro');
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState('');
  const query = useUserOverview(userId);
  const overview = query.data;

  if (query.isLoading) {
    return (
      <section className="content">
        <div className="skeleton staff-skeleton" />
      </section>
    );
  }

  if (query.isError || !overview) {
    return (
      <section className="content">
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} />
          Não foi possível carregar esta conta.
        </div>
        <button className="button secondary" type="button" onClick={onBack}>
          <ArrowLeft size={16} />
          Voltar para a lista
        </button>
      </section>
    );
  }

  const profile = overview.profile;
  const name = displayName(profile);
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <>
      <header className="page-header user-detail-header">
        <div>
          <button className="button ghost compact" type="button" onClick={onBack}>
            <ArrowLeft size={16} />
            Usuários
          </button>
          <div className="user-identity">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="user-avatar large" />
              : <div className="user-avatar large placeholder" aria-hidden="true">{initials}</div>}
            <div>
              <h1>{name}</h1>
              <span>
                {profile.username ? `@${profile.username}` : 'sem @usuário'} · {overview.auth?.email ?? profile.email ?? 'sem e-mail'}
              </span>
              <div className="user-badges">
                {overview.staff_role && <span className="role-badge role-admin">Equipe · {overview.staff_role}</span>}
                {profile.app_lockdown && <span className="role-badge alert">Bloqueado</span>}
                {profile.is_professional && <span className="role-badge">Profissional</span>}
                {profile.is_creator && <span className="role-badge">Criador</span>}
                {profile.is_ambassador && <span className="role-badge">Embaixador</span>}
                {profile.is_identity_verified && <span className="role-badge">Identidade verificada</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} />
            Atualizar
          </button>
          {canDelete && (
            <button className="button danger" type="button" onClick={() => setDeleting(true)}>
              <Trash2 size={16} />
              Excluir conta
            </button>
          )}
        </div>
      </header>

      <section className="content user-detail">
        {banner && (
          <div className="inline-alert" role="status">
            <CheckCircle2 size={18} />
            {banner}
          </div>
        )}

        {!canEdit && (
          <div className="inline-alert soft" role="status">
            <ShieldAlert size={18} />
            Seu papel permite consultar, mas não alterar o cadastro.
          </div>
        )}

        <div className="user-summary">
          <div>
            <span>Cadastro</span>
            <strong>{profile.created_at ? formatDateTime(new Date(profile.created_at)) : '—'}</strong>
          </div>
          <div>
            <span>Último acesso</span>
            <strong>{overview.auth?.last_sign_in_at ? formatDateTime(new Date(overview.auth.last_sign_in_at)) : 'nunca'}</strong>
          </div>
          <div>
            <span>E-mail confirmado</span>
            <strong>{overview.auth?.email_confirmed_at ? 'sim' : 'não'}</strong>
          </div>
          <div>
            <span>MFA</span>
            <strong>{overview.auth?.mfa_factors ? `${overview.auth.mfa_factors} fator(es)` : 'sem MFA'}</strong>
          </div>
          <div>
            <span>CPF</span>
            <strong>{formatDocument(primaryCpf(profile)?.last4 ?? null)}</strong>
          </div>
          <div>
            <span>Login por</span>
            <strong>{overview.auth?.providers.join(', ') || '—'}</strong>
          </div>
        </div>

        <div className="finance-tabs" role="tablist" aria-label="Detalhe do usuário">
          <button type="button" role="tab" aria-selected={tab === 'cadastro'} onClick={() => setTab('cadastro')}>Cadastro</button>
          <button type="button" role="tab" aria-selected={tab === 'plataforma'} onClick={() => setTab('plataforma')}>Na plataforma</button>
          <button type="button" role="tab" aria-selected={tab === 'raiox'} onClick={() => setTab('raiox')}>Raio-x completo</button>
        </div>

        {tab === 'cadastro' && (
          <>
            <ProfileForm profile={profile} canEdit={canEdit} onSaved={(text) => { setBanner(text); void query.refetch(); }} />
            {overview.audit.length > 0 && (
              <section className="staff-list-section">
                <div className="section-heading">
                  <div>
                    <h2>Histórico de alterações</h2>
                    <p>Registro das últimas ações do backoffice sobre esta conta.</p>
                  </div>
                </div>
                <ul className="user-audit-list">
                  {overview.audit.map((entry) => (
                    <li key={entry.id}>
                      <div>
                        <strong>{entry.action === 'account_delete' ? 'Exclusão de conta' : 'Alteração cadastral'}</strong>
                        <span>{formatDateTime(new Date(entry.created_at))} · {entry.actor_email ?? 'equipe'}</span>
                      </div>
                      <p>{Object.keys(entry.changes).join(', ') || 'sem detalhes'}</p>
                      {entry.reason && <small>{entry.reason}</small>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {tab === 'plataforma' && <PlatformPanel overview={overview} />}
        {tab === 'raiox' && <FootprintPanel userId={userId} active={tab === 'raiox'} />}
      </section>

      {deleting && (
        <UserDeleteDialog
          overview={overview}
          onCancel={() => setDeleting(false)}
          onDeleted={(summary) => {
            setDeleting(false);
            onDeleted(summary);
          }}
        />
      )}
    </>
  );
}

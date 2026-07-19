import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Dumbbell,
  Gauge,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Pencil,
  RefreshCw,
  Save,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useAuth } from './contexts/useAuth';
import type { WeeklyActivity } from './lib/dashboard';
import { formatCurrency, formatCurrencyExact, formatDateTime, formatNumber } from './lib/format';
import { normalizeEmail } from './lib/auth';
import { supabase } from './lib/supabase';
import { useDashboardSnapshot } from './hooks/useDashboardSnapshot';
import { useOfferingTypeBilling, useUpdateOfferingTypeBilling } from './hooks/useOfferingTypeBilling';
import { usePlatformStaff } from './hooks/usePlatformStaff';
import {
  useCreatePlatformStaff,
  useCurrentStaffRole,
  useStaffList,
  useUpdatePlatformStaff,
} from './hooks/useStaffManagement';
import type { PlatformStaffMember, StaffRole } from './lib/staff';
import {
  billingIntervalLabel,
  billingTypeLabel,
  type BillingInterval,
  type BillingType,
  type OfferingTypeBilling,
} from './lib/offeringTypes';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'offering-types', label: 'Tipos de oferta', icon: HandCoins },
  { id: 'users', label: 'Equipe', icon: Users },
  { label: 'Financeiro', icon: CreditCard, disabled: true },
  { label: 'Moderação', icon: Shield, disabled: true },
  { label: 'Alertas', icon: Bell, disabled: true },
] as const;

type SectionId = 'dashboard' | 'offering-types' | 'users';

const billingTypeOptions: ReadonlyArray<{ value: BillingType; label: string }> = [
  { value: 'one_time', label: 'Pagamento único' },
  { value: 'recurring', label: 'Recorrente' },
  { value: 'free', label: 'Sem cobrança' },
];

const billingIntervalOptions: ReadonlyArray<{ value: BillingInterval; label: string }> = [
  { value: 'month', label: 'Mensal' },
  { value: '2month', label: 'Bimestral' },
  { value: 'quarter', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'year', label: 'Anual' },
];

const staffRoleOptions: ReadonlyArray<{ value: StaffRole; label: string; description: string }> = [
  { value: 'support', label: 'Suporte', description: 'Atendimento e consulta operacional.' },
  { value: 'moderator', label: 'Moderação', description: 'Triagem e moderação de conteúdo.' },
  { value: 'admin', label: 'Administrador', description: 'Configuração e operação da plataforma.' },
  { value: 'super_admin', label: 'Superadministrador', description: 'Acesso total, incluindo gestão da equipe.' },
];

function parseCurrencyInput(value: string): number | null {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function formatPriceInput(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function staffRoleLabel(role: StaffRole): string {
  return staffRoleOptions.find((option) => option.value === role)?.label ?? role;
}

function AppLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">OF</div>
      {!collapsed && (
        <div className="brand-copy">
          <strong>OnlyFit</strong>
          <span>Backoffice</span>
        </div>
      )}
    </div>
  );
}

function LoginPage() {
  const { user, signOut } = useAuth();
  const { data: isStaff, isLoading: checkingStaff } = usePlatformStaff();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !checkingStaff && !isStaff) {
    return (
      <main className="login-shell">
        <section className="access-panel" aria-live="polite">
          <div className="status-icon danger"><Shield size={24} /></div>
          <h1>Acesso restrito</h1>
          <p>A conta {user.email} não possui permissão de equipe para acessar o backoffice.</p>
          <button className="button secondary" type="button" onClick={signOut}>
            <LogOut size={16} />
            Sair e usar outra conta
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <AppLogo />
        <div>
          <h1>Gestão OnlyFit</h1>
          <p>Entre com uma conta interna autorizada para acompanhar a operação da plataforma.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            autoComplete="email"
            inputMode="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <RefreshCw className="spin" size={16} /> : <Shield size={16} />}
            Entrar no backoffice
          </button>
        </form>
      </section>
    </main>
  );
}

function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onToggle,
  onSignOut,
  activeSection,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (section: SectionId) => void;
  onToggle: () => void;
  onSignOut: () => void;
  activeSection: SectionId;
}) {
  return (
    <>
      {mobileOpen && <button className="scrim" type="button" aria-label="Fechar menu" onClick={onCloseMobile} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <AppLogo collapsed={collapsed} />
          <button className="icon-button desktop-only" type="button" aria-label="Recolher menu" onClick={onToggle}>
            <ChevronLeft className={collapsed ? 'rotate' : ''} size={18} />
          </button>
          <button className="icon-button mobile-only" type="button" aria-label="Fechar menu" onClick={onCloseMobile}>
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list" aria-label="Menu principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const itemId = 'id' in item ? item.id : null;
            const isActive = itemId === activeSection;
            const isDisabled = 'disabled' in item && item.disabled === true;
            return (
              <button
                key={item.label}
                className={`nav-item ${isActive ? 'active' : ''}`}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (itemId) onNavigate(itemId);
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && isDisabled && <small>em breve</small>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span>OF</span>
            {!collapsed && <strong>Equipe OnlyFit</strong>}
          </div>
          <button className="icon-button" type="button" aria-label="Sair" onClick={onSignOut}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}

function OfferingTypeBillingRow({ item, canEdit }: { item: OfferingTypeBilling; canEdit: boolean }) {
  const updateMutation = useUpdateOfferingTypeBilling();
  const [billingType, setBillingType] = useState<BillingType>(item.billing_type);
  const [billingInterval, setBillingInterval] = useState<BillingInterval | null>(item.billing_interval);
  const [minimumPriceInput, setMinimumPriceInput] = useState(() => formatPriceInput(item.minimum_price));
  const [message, setMessage] = useState('');

  const parsedMinimumPrice = parseCurrencyInput(minimumPriceInput);
  const minimumPrice = billingType === 'free' ? 0 : parsedMinimumPrice;
  const isMinimumPriceInvalid = minimumPrice === null || minimumPrice < 0;
  const dirty =
    billingType !== item.billing_type ||
    billingInterval !== item.billing_interval ||
    Math.round((minimumPrice ?? -1) * 100) !== Math.round(item.minimum_price * 100);
  const isRecurring = billingType === 'recurring';

  const save = () => {
    const nextInterval = billingType === 'recurring' ? billingInterval ?? 'month' : null;
    setMessage('');
    if (minimumPrice === null || isMinimumPriceInvalid) {
      setMessage('Informe um valor mínimo válido.');
      return;
    }
    updateMutation.mutate(
      { slug: item.slug, billingType, billingInterval: nextInterval, minimumPrice },
      {
        onSuccess: () => setMessage('Configuração salva. Ofertas ativas deste tipo foram sincronizadas.'),
        onError: (error) => setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'),
      },
    );
  };

  return (
    <article className="offering-row">
      <div className="offering-main">
        <div>
          <strong>{item.name}</strong>
          <span>{item.description}</span>
        </div>
        <div className="offering-badges">
          <span>{formatNumber(item.active_offerings_count)} ofertas ativas</span>
          {item.unique_per_owner_profile && <span>única por perfil</span>}
          {item.requires_affinity_group && <span>grupo de afinidade</span>}
          {item.requires_product_category && <span>categoria</span>}
        </div>
      </div>

      <div className="billing-controls">
        <label>
          <span>Tipo de cobrança</span>
          <select
            value={billingType}
            disabled={!canEdit}
            onChange={(event) => {
              const next = event.target.value as BillingType;
              setBillingType(next);
              if (next !== 'recurring') setBillingInterval(null);
              if (next === 'recurring' && !billingInterval) setBillingInterval('month');
              if (next === 'free') setMinimumPriceInput(formatPriceInput(0));
            }}
          >
            {billingTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Intervalo</span>
          <select
            value={billingInterval ?? 'month'}
            disabled={!canEdit || !isRecurring}
            onChange={(event) => setBillingInterval(event.target.value as BillingInterval)}
          >
            {billingIntervalOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Valor mínimo</span>
          <input
            value={minimumPriceInput}
            disabled={!canEdit || billingType === 'free'}
            inputMode="decimal"
            aria-invalid={isMinimumPriceInvalid}
            onBlur={() => {
              if (minimumPrice !== null) setMinimumPriceInput(formatPriceInput(minimumPrice));
            }}
            onChange={(event) => {
              setMinimumPriceInput(event.target.value.replace(/[^\d.,]/g, ''));
            }}
          />
        </label>

        <button
          className="button secondary"
          type="button"
          disabled={!canEdit || !dirty || isMinimumPriceInvalid || updateMutation.isPending}
          onClick={save}
        >
          {updateMutation.isPending ? <RefreshCw className="spin" size={16} /> : <HandCoins size={16} />}
          Salvar
        </button>
      </div>

      <p className="billing-summary">
        Profissional verá: <strong>{billingTypeLabel(billingType)}</strong>
        {billingType === 'recurring' ? `, ${billingIntervalLabel(billingInterval ?? 'month').toLowerCase()}` : ''}
        {billingType !== 'free' ? `, mínimo ${formatCurrencyExact(minimumPrice ?? 0)}` : ', sem cobrança'}.
      </p>
      {message && <p className="row-message" role="status">{message}</p>}
    </article>
  );
}

function OfferingTypesPage() {
  const { data = [], isLoading, isError, refetch, isFetching } = useOfferingTypeBilling(true);
  const { data: currentRole } = useCurrentStaffRole();
  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Configuração</p>
          <h1>Tipos de oferta</h1>
          <span>Defina a cobrança e o valor mínimo que profissionais não podem reduzir.</span>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'spin' : ''} size={16} />
            Atualizar
          </button>
        </div>
      </header>

      <section className="content">
        <div className="inline-alert">
          <HandCoins size={18} />
          {canEdit
            ? 'A equipe OnlyFit define o tipo de cobrança e o valor mínimo. No app, o profissional configura apenas valores iguais ou superiores e os detalhes da oferta.'
            : 'Seu papel permite consultar esta configuração, mas somente administradores podem alterá-la.'}
        </div>

        {isLoading ? (
          <div className="dashboard-grid" aria-label="Carregando tipos de oferta">
            {Array.from({ length: 5 }, (_, index) => <div className="skeleton" key={index} />)}
          </div>
        ) : isError ? (
          <div className="inline-alert danger" role="alert">
            <AlertTriangle size={18} />
            Não foi possível carregar os tipos de oferta. Verifique se a migration de cobrança foi aplicada.
          </div>
        ) : (
          <div className="offering-list">
            {data.map((item) => <OfferingTypeBillingRow key={item.slug} item={item} canEdit={canEdit} />)}
          </div>
        )}
      </section>
    </>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <article className="metric-card">
      <div className="metric-title">
        <span>{title}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function LineChart({ activity }: { activity: WeeklyActivity[] }) {
  const width = 720;
  const height = 220;
  const max = Math.max(1, ...activity.map((point) => point.completed_sessions));
  const denominator = Math.max(1, activity.length - 1);
  const points = activity.map((point, index) => {
    const x = 24 + (index * (width - 48)) / denominator;
    const y = height - 28 - (point.completed_sessions / max) * (height - 56);
    const date = new Date(`${point.date}T12:00:00`);
    return {
      ...point,
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      x,
      y,
    };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const total = activity.reduce((sum, point) => sum + point.completed_sessions, 0);

  return (
    <figure className="chart-panel">
      <figcaption>
        <div>
          <strong>Atividade dos últimos 7 dias</strong>
          <span>Treinos concluídos por dia</span>
        </div>
        <div className="chart-total">
          <BarChart3 size={16} />
          <strong>{formatNumber(total)}</strong>
          <span>no período</span>
        </div>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Treinos concluídos nos últimos sete dias">
        {[0, 1, 2, 3].map((line) => {
          const y = 28 + line * 44;
          return <line key={line} x1="24" x2={width - 24} y1={y} y2={y} className="grid-line" />;
        })}
        {points.length > 0 && <path d={path} className="chart-line" />}
        {points.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="4" className="chart-dot" />
            <text x={point.x} y={Math.max(18, point.y - 12)} textAnchor="middle">{point.completed_sessions}</text>
            <text x={point.x} y={height - 8} textAnchor="middle">{point.label}</text>
          </g>
        ))}
      </svg>
      <div className="chart-values" aria-label="Valores diários">
        {points.map((point) => (
          <span key={point.date}><small>{point.label}</small><strong>{formatNumber(point.completed_sessions)}</strong></span>
        ))}
      </div>
    </figure>
  );
}

function PulseStatusPanel({ outbox }: { outbox: Record<string, number> }) {
  const statuses = Object.entries(outbox).sort((left, right) => right[1] - left[1]);

  return (
    <aside className="ops-panel">
      <div>
        <strong>Fila Pulse</strong>
        <span>Eventos atuais agrupados pelo status gravado no banco</span>
      </div>
      {statuses.length === 0 ? (
        <p className="empty-copy">Nenhum evento na fila.</p>
      ) : (
        <dl className="status-list">
          {statuses.map(([status, count]) => (
            <div key={status}>
              <dt>{status}</dt>
              <dd>{formatNumber(count)}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-grid" aria-label="Carregando dashboard">
      {Array.from({ length: 6 }, (_, index) => <div className="skeleton" key={index} />)}
    </div>
  );
}

function Dashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboardSnapshot(true);
  const outboxTotal = data ? Object.values(data.outbox).reduce((sum, value) => sum + value, 0) : 0;

  const metrics = useMemo(
    () => data ? [
      {
        title: 'Usuários totais',
        value: formatNumber(data.overview.profiles_total),
        detail: `${formatNumber(data.overview.profiles_created_today)} novos hoje`,
        icon: Users,
      },
      {
        title: 'Receita no mês',
        value: formatCurrency(data.payments.charges_paid_month_value),
        detail: `${formatNumber(data.payments.charges_paid_month_count)} pagamentos confirmados`,
        icon: CreditCard,
      },
      {
        title: 'Pagamentos hoje',
        value: formatCurrency(data.payments.charges_paid_today_value),
        detail: `${formatNumber(data.payments.charges_paid_today_count)} cobranças pagas`,
        icon: Gauge,
      },
      {
        title: 'Treinos hoje',
        value: formatNumber(data.overview.workout_sessions_completed_today),
        detail: 'Sessões concluídas no dia',
        icon: Dumbbell,
      },
      {
        title: 'Denúncias pendentes',
        value: formatNumber(data.overview.pending_content_reports),
        detail: 'Fila de moderação aguardando triagem',
        icon: AlertTriangle,
      },
      {
        title: 'Fila Pulse',
        value: formatNumber(outboxTotal),
        detail: 'Eventos de automação por status',
        icon: Activity,
      },
    ] : [],
    [data, outboxTotal],
  );

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Dashboard</p>
          <h1>Visão geral da plataforma</h1>
          <span>{data ? `Atualizado em ${formatDateTime(new Date(data.generatedAt))}` : 'Aguardando dados do banco'}</span>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'spin' : ''} size={16} />
            Atualizar
          </button>
        </div>
      </header>

      <section className="content">
        {isError && (
          <div className="inline-alert danger" role="alert">
            <AlertTriangle size={18} />
            Não foi possível consultar o banco. Nenhum valor substituto foi exibido. Atualize para tentar novamente.
          </div>
        )}

        {isLoading ? (
          <DashboardSkeleton />
        ) : data ? (
          <div className="dashboard-grid">
            {metrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}
          </div>
        ) : null}

        {data && (
          <div className="lower-grid">
            <LineChart activity={data.weeklyActivity} />
            <PulseStatusPanel outbox={data.outbox} />
          </div>
        )}
      </section>
    </>
  );
}

function staffErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('weak_password')) {
    return 'Use uma senha com pelo menos 8 caracteres, maiúscula, minúscula, número e caractere especial.';
  }
  if (message.includes('full_name_required')) return 'Informe o nome completo.';
  if (message.includes('invalid_email')) return 'Informe um e-mail válido.';
  if (message.includes('email_already_exists')) return 'Este e-mail já pertence a outra conta da plataforma.';
  if (message.includes('last_super_admin')) return 'O último superadministrador não pode perder esse papel.';
  if (message.includes('staff_not_found')) return 'Este acesso interno não existe mais. Atualize a lista.';
  if (message.includes('forbidden')) return 'Somente superadministradores podem gerenciar a equipe.';
  return 'Não foi possível salvar o usuário. Verifique os dados e tente novamente.';
}

function UsersPage() {
  const { data: currentRole, isLoading: roleLoading } = useCurrentStaffRole();
  const canManage = currentRole === 'super_admin';
  const { data: staff = [], isLoading, isError, refetch, isFetching } = useStaffList(canManage);
  const createMutation = useCreatePlatformStaff();
  const updateMutation = useUpdatePlatformStaff();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('support');
  const [editingMember, setEditingMember] = useState<PlatformStaffMember | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordConfirmation, setEditPasswordConfirmation] = useState('');
  const [editRole, setEditRole] = useState<StaffRole>('support');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startEditing = (member: PlatformStaffMember) => {
    setEditingMember(member);
    setEditEmail(member.email ?? '');
    setEditFullName(member.full_name ?? member.username ?? '');
    setEditPassword('');
    setEditPasswordConfirmation('');
    setEditRole(member.role);
    setMessage(null);
  };

  const stopEditing = () => {
    setEditingMember(null);
    setEditPassword('');
    setEditPasswordConfirmation('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    createMutation.mutate(
      { email, fullName, password, role },
      {
        onSuccess: (result) => {
          const accountText = result.staffStatus === 'already_staff'
            ? 'Este usuário já tinha acesso ao backoffice; nenhum dado foi duplicado ou alterado.'
            : result.accountStatus === 'existing'
              ? 'A conta já existia na plataforma e foi vinculada ao backoffice.'
              : 'A conta foi criada e vinculada ao backoffice.';
          setMessage({ type: 'success', text: accountText });
          setEmail('');
          setFullName('');
          setPassword('');
          setRole('support');
        },
        onError: (error) => setMessage({ type: 'error', text: staffErrorMessage(error) }),
      },
    );
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMember) return;
    setMessage(null);
    if (editPassword !== editPasswordConfirmation) {
      setMessage({ type: 'error', text: 'A confirmação não corresponde à nova senha.' });
      return;
    }

    updateMutation.mutate(
      {
        userId: editingMember.user_id,
        email: editEmail,
        fullName: editFullName,
        password: editPassword,
        role: editRole,
      },
      {
        onSuccess: () => {
          stopEditing();
          setMessage({ type: 'success', text: 'Dados e acesso do usuário atualizados.' });
        },
        onError: (error) => setMessage({ type: 'error', text: staffErrorMessage(error) }),
      },
    );
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Acesso interno</p>
          <h1>Equipe OnlyFit</h1>
          <span>Contas da plataforma com permissão explícita para o backoffice.</span>
        </div>
        {canManage && (
          <button className="button secondary" type="button" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'spin' : ''} size={16} />
            Atualizar
          </button>
        )}
      </header>

      <section className="content">
        {roleLoading ? (
          <div className="skeleton staff-skeleton" />
        ) : !canManage ? (
          <div className="access-panel inline-access" role="status">
            <div className="status-icon danger"><Shield size={24} /></div>
            <div>
              <h2>Gestão restrita</h2>
              <p>Seu papel permite usar o backoffice, mas não conceder acesso a outros funcionários.</p>
            </div>
          </div>
        ) : (
          <>
            <section className="staff-create-panel" aria-labelledby="staff-create-title">
              <div className="staff-create-copy">
                <UserPlus size={20} />
                <div>
                  <h2 id="staff-create-title">Incluir funcionário</h2>
                  <p>Se o e-mail já existir no app, a conta e a senha atuais serão preservadas.</p>
                </div>
              </div>

              <form className="staff-form" onSubmit={handleSubmit}>
                <label>
                  <span>E-mail</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Nome completo</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </label>
                <label>
                  <span>Papel no backoffice</span>
                  <select value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
                    {staffRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <small>{staffRoleOptions.find((option) => option.value === role)?.description}</small>
                </label>
                <label>
                  <span>Senha inicial</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                  />
                  <small>Obrigatória somente para conta nova. A conta existente nunca terá a senha alterada.</small>
                </label>
                <button className="button primary" type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <RefreshCw className="spin" size={16} /> : <UserPlus size={16} />}
                  Incluir no backoffice
                </button>
              </form>

            </section>

            {message && (
              <div className={`inline-alert ${message.type === 'error' ? 'danger' : ''}`} role="status">
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                {message.text}
              </div>
            )}

            {editingMember && (
              <section className="staff-edit-panel" aria-labelledby="staff-edit-title">
                <div className="staff-create-copy">
                  <Pencil size={20} />
                  <div>
                    <h2 id="staff-edit-title">Editar acesso</h2>
                    <p>Alterações no e-mail e na senha também atualizam o login da plataforma.</p>
                  </div>
                </div>

                <form className="staff-form" onSubmit={handleEditSubmit}>
                  <label>
                    <span>E-mail de login</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={editEmail}
                      onChange={(event) => setEditEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>Nome completo</span>
                    <input
                      type="text"
                      autoComplete="name"
                      value={editFullName}
                      onChange={(event) => setEditFullName(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>Papel no backoffice</span>
                    <select value={editRole} onChange={(event) => setEditRole(event.target.value as StaffRole)}>
                      {staffRoleOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <small>{staffRoleOptions.find((option) => option.value === editRole)?.description}</small>
                  </label>
                  <label>
                    <span>Nova senha</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={editPassword}
                      onChange={(event) => setEditPassword(event.target.value)}
                      minLength={8}
                    />
                    <small>Deixe em branco para preservar a senha atual.</small>
                  </label>
                  <label>
                    <span>Confirmar nova senha</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={editPasswordConfirmation}
                      onChange={(event) => setEditPasswordConfirmation(event.target.value)}
                      minLength={8}
                    />
                  </label>
                  <div className="staff-form-actions">
                    <button className="button primary" type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
                      Salvar alterações
                    </button>
                    <button className="button secondary" type="button" onClick={stopEditing} disabled={updateMutation.isPending}>
                      <X size={16} />
                      Cancelar
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="staff-list-section" aria-labelledby="staff-list-title">
              <div className="section-heading">
                <div>
                  <h2 id="staff-list-title">Acessos ativos</h2>
                  <p>{formatNumber(staff.length)} membros com permissão interna</p>
                </div>
              </div>

              {isError ? (
                <div className="inline-alert danger" role="alert">
                  <AlertTriangle size={18} />
                  Não foi possível consultar os acessos internos.
                </div>
              ) : isLoading ? (
                <div className="skeleton staff-skeleton" />
              ) : (
                <div className="table-wrapper">
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th>Pessoa</th>
                        <th>Papel interno</th>
                        <th>Incluído em</th>
                        <th><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member) => (
                        <tr key={member.user_id}>
                          <td>
                            <strong>{member.full_name || member.username || 'Sem nome'}</strong>
                            <span>{member.email || 'E-mail indisponível'}</span>
                          </td>
                          <td><span className={`role-badge role-${member.role}`}>{staffRoleLabel(member.role)}</span></td>
                          <td>{formatDateTime(new Date(member.created_at))}</td>
                          <td className="staff-actions-cell">
                            <button
                              className="icon-button table-action"
                              type="button"
                              title={`Editar ${member.full_name || member.email || 'usuário'}`}
                              aria-label={`Editar ${member.full_name || member.email || 'usuário'}`}
                              onClick={() => startEditing(member)}
                            >
                              <Pencil size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </>
  );
}

function AppShell() {
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('onlyfit.backoffice.sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');

  const handleToggle = () => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem('onlyfit.backoffice.sidebar', next ? 'collapsed' : 'expanded');
      return next;
    });
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeSection={activeSection}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={(section) => {
          setActiveSection(section);
          setMobileOpen(false);
        }}
        onSignOut={signOut}
        onToggle={handleToggle}
      />
      <div className="main-column">
        <header className="mobile-header">
          <button className="icon-button" type="button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <AppLogo />
        </header>
        {activeSection === 'dashboard' && <Dashboard />}
        {activeSection === 'offering-types' && <OfferingTypesPage />}
        {activeSection === 'users' && <UsersPage />}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="login-shell">
      <section className="access-panel">
        <RefreshCw className="spin" size={28} />
        <p>Validando sessão...</p>
      </section>
    </main>
  );
}

export function App() {
  const { user, isLoading } = useAuth();
  const { data: isStaff, isLoading: staffLoading } = usePlatformStaff();

  if (isLoading || (user && staffLoading)) return <LoadingScreen />;
  if (!user || !isStaff) return <LoginPage />;

  return (
    <>
      <button className="theme-button" type="button" aria-label="Tema OnlyFit">
        <Moon size={16} />
      </button>
      <AppShell />
    </>
  );
}

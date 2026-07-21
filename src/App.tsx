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
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Menu,
  Moon,
  Pencil,
  ReceiptText,
  RefreshCw,
  Rss,
  Save,
  Shield,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { FormEvent, type ReactNode, useMemo, useState } from 'react';
import { useAuth } from './contexts/useAuth';
import type { WeeklyActivity, WeeklyFinance } from './lib/dashboard';
import { formatCurrency, formatCurrencyExact, formatDateTime, formatNumber } from './lib/format';
import { normalizeEmail } from './lib/auth';
import { supabase } from './lib/supabase';
import { useDashboardSnapshot } from './hooks/useDashboardSnapshot';
import { useOfferingTypeBilling, useUpdateOfferingTypeBilling } from './hooks/useOfferingTypeBilling';
import { usePlatformPaymentSettings, useUpdatePlatformPaymentSettings } from './hooks/usePlatformPaymentSettings';
import { usePlatformStaff } from './hooks/usePlatformStaff';
import { useFeedAlgorithmSettings, useUpdateFeedAlgorithmSettings } from './hooks/useFeedAlgorithm';
import type { FeedMode } from './lib/feedSettings';
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
  { id: 'feed', label: 'Feed', icon: Rss },
  { id: 'offering-types', label: 'Tipos de oferta', icon: HandCoins },
  { id: 'finance', label: 'Financeiro', icon: CreditCard },
  { id: 'users', label: 'Equipe', icon: Users },
  { label: 'Moderação', icon: Shield, disabled: true },
  { label: 'Alertas', icon: Bell, disabled: true },
] as const;

type SectionId = 'dashboard' | 'feed' | 'offering-types' | 'finance' | 'users';

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
  const [feePercentInput, setFeePercentInput] = useState(() => formatPriceInput(item.platform_fee_percent));
  const [feeFixedInput, setFeeFixedInput] = useState(() => formatPriceInput(item.platform_fee_fixed));
  const [message, setMessage] = useState('');

  const isFree = billingType === 'free';
  const isRecurring = billingType === 'recurring';
  // Recorrente usa só percentual (split); único aceita % e/ou fixo; free zera tudo.
  const feeFixedApplies = billingType === 'one_time';

  const parsedMinimumPrice = parseCurrencyInput(minimumPriceInput);
  const minimumPrice = isFree ? 0 : parsedMinimumPrice;
  const isMinimumPriceInvalid = minimumPrice === null || minimumPrice < 0;

  const parsedFeePercent = parseCurrencyInput(feePercentInput);
  const feePercent = isFree ? 0 : parsedFeePercent;
  const isFeePercentInvalid = feePercent === null || feePercent < 0 || feePercent > 100;

  const parsedFeeFixed = parseCurrencyInput(feeFixedInput);
  const feeFixed = feeFixedApplies ? parsedFeeFixed : 0;
  const isFeeFixedInvalid = feeFixed === null || feeFixed < 0;

  const dirty =
    billingType !== item.billing_type ||
    billingInterval !== item.billing_interval ||
    Math.round((minimumPrice ?? -1) * 100) !== Math.round(item.minimum_price * 100) ||
    Math.round((feePercent ?? -1) * 100) !== Math.round(item.platform_fee_percent * 100) ||
    Math.round((feeFixed ?? -1) * 100) !== Math.round(item.platform_fee_fixed * 100);

  const hasInvalid = isMinimumPriceInvalid || isFeePercentInvalid || isFeeFixedInvalid;

  const save = () => {
    const nextInterval = billingType === 'recurring' ? billingInterval ?? 'month' : null;
    setMessage('');
    if (minimumPrice === null || isMinimumPriceInvalid) {
      setMessage('Informe um valor mínimo válido.');
      return;
    }
    if (feePercent === null || isFeePercentInvalid) {
      setMessage('Informe uma taxa percentual entre 0 e 100.');
      return;
    }
    if (feeFixed === null || isFeeFixedInvalid) {
      setMessage('Informe uma taxa fixa válida.');
      return;
    }
    updateMutation.mutate(
      {
        slug: item.slug,
        billingType,
        billingInterval: nextInterval,
        minimumPrice,
        platformFeePercent: feePercent,
        platformFeeFixed: feeFixed,
      },
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
              if (next === 'free') {
                setMinimumPriceInput(formatPriceInput(0));
                setFeePercentInput(formatPriceInput(0));
                setFeeFixedInput(formatPriceInput(0));
              }
              if (next === 'recurring') setFeeFixedInput(formatPriceInput(0));
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
            disabled={!canEdit || isFree}
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

        <label>
          <span>Taxa (%)</span>
          <input
            value={feePercentInput}
            disabled={!canEdit || isFree}
            inputMode="decimal"
            aria-invalid={isFeePercentInvalid}
            onBlur={() => {
              if (feePercent !== null) setFeePercentInput(formatPriceInput(feePercent));
            }}
            onChange={(event) => {
              setFeePercentInput(event.target.value.replace(/[^\d.,]/g, ''));
            }}
          />
        </label>

        <label>
          <span>Taxa fixa (R$)</span>
          <input
            value={feeFixedInput}
            disabled={!canEdit || !feeFixedApplies}
            inputMode="decimal"
            aria-invalid={isFeeFixedInvalid}
            title={feeFixedApplies ? undefined : 'A taxa fixa só se aplica a pagamento único.'}
            onBlur={() => {
              if (feeFixed !== null) setFeeFixedInput(formatPriceInput(feeFixed));
            }}
            onChange={(event) => {
              setFeeFixedInput(event.target.value.replace(/[^\d.,]/g, ''));
            }}
          />
        </label>

        <button
          className="button secondary"
          type="button"
          disabled={!canEdit || !dirty || hasInvalid || updateMutation.isPending}
          onClick={save}
        >
          {updateMutation.isPending ? <RefreshCw className="spin" size={16} /> : <HandCoins size={16} />}
          Salvar
        </button>
      </div>

      <p className="billing-summary">
        Profissional verá: <strong>{billingTypeLabel(billingType)}</strong>
        {billingType === 'recurring' ? `, ${billingIntervalLabel(billingInterval ?? 'month').toLowerCase()}` : ''}
        {isFree ? ', sem cobrança' : `, mínimo ${formatCurrencyExact(minimumPrice ?? 0)}`}
        {!isFree && (
          <>
            {'. '}Comissão da plataforma: <strong>{formatPriceInput(feePercent ?? 0)}%</strong>
            {feeFixedApplies && (feeFixed ?? 0) > 0 ? ` + ${formatCurrencyExact(feeFixed ?? 0)}` : ''} sobre o líquido.
          </>
        )}
      </p>
      {message && <p className="row-message" role="status">{message}</p>}
    </article>
  );
}

function parseDecimalInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatDecimal(value: number, maxFractionDigits = 3): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits });
}

type FeedFieldKey =
  | 'weightAffinity'
  | 'weightRetention'
  | 'weightEngagement'
  | 'weightNovelty'
  | 'weightExploration'
  | 'penaltyQuicklySkipped'
  | 'penaltyAlreadyWatched'
  | 'diversityCreatorPenalty'
  | 'diversityTopicPenalty'
  | 'noveltyHalfLifeHours'
  | 'slotsInterest'
  | 'slotsFollowed'
  | 'slotsPopular'
  | 'slotsExperimental';

const feedSlotKeys: ReadonlyArray<FeedFieldKey> = [
  'slotsInterest',
  'slotsFollowed',
  'slotsPopular',
  'slotsExperimental',
];

type FeedFieldDescriptor = {
  key: FeedFieldKey;
  label: string;
  hint: string;
  min?: number;
};

const feedWeightFields: ReadonlyArray<FeedFieldDescriptor> = [
  { key: 'weightAffinity', label: 'Afinidade', hint: 'Quanto o interesse do usuário pesa (padrão 0,40).' },
  { key: 'weightRetention', label: 'Retenção', hint: 'Peso de quanto do vídeo costuma ser assistido (padrão 0,30).' },
  { key: 'weightEngagement', label: 'Engajamento', hint: 'Peso de curtidas, comentários, saves e shares (padrão 0,15).' },
  { key: 'weightNovelty', label: 'Novidade', hint: 'Peso da recência da publicação (padrão 0,10).' },
  { key: 'weightExploration', label: 'Exploração', hint: 'Peso do fator aleatório que injeta descoberta (padrão 0,05).' },
];

const feedTuningFields: ReadonlyArray<FeedFieldDescriptor> = [
  { key: 'penaltyQuicklySkipped', label: 'Penalidade — pulou rápido', hint: 'Desconto para posts que o usuário já ignorou (padrão 0,30).' },
  { key: 'penaltyAlreadyWatched', label: 'Penalidade — já assistiu', hint: 'Desconto para posts já vistos por completo (padrão 1,00).' },
  { key: 'diversityCreatorPenalty', label: 'Diversidade — mesmo criador', hint: 'Desconto por post repetido do mesmo criador (padrão 0,12).' },
  { key: 'diversityTopicPenalty', label: 'Diversidade — mesmo tema', hint: 'Desconto por post repetido do mesmo grupo (padrão 0,04).' },
  { key: 'noveltyHalfLifeHours', label: 'Meia-vida da novidade (horas)', hint: 'Em quantas horas a novidade cai pela metade (padrão 24).', min: 0.1 },
];

const feedSlotFields: ReadonlyArray<FeedFieldDescriptor> = [
  { key: 'slotsInterest', label: 'Vagas — afinidade/interesse', hint: 'Posições por bloco reservadas a posts alinhados com o interesse do usuário (padrão 6).', min: 1 },
  { key: 'slotsFollowed', label: 'Vagas — seguidos', hint: 'Posições por bloco reservadas a posts de quem o usuário segue (padrão 2).', min: 1 },
  { key: 'slotsPopular', label: 'Vagas — popular', hint: 'Posições por bloco reservadas a posts com engajamento alto (padrão 1).', min: 1 },
  { key: 'slotsExperimental', label: 'Vagas — experimental', hint: 'Posições por bloco reservadas a descoberta fora do padrão do usuário (padrão 1).', min: 1 },
];

const feedDefaults: Record<FeedFieldKey, number> = {
  weightAffinity: 0.4,
  weightRetention: 0.3,
  weightEngagement: 0.15,
  weightNovelty: 0.1,
  weightExploration: 0.05,
  penaltyQuicklySkipped: 0.3,
  penaltyAlreadyWatched: 1,
  diversityCreatorPenalty: 0.12,
  diversityTopicPenalty: 0.04,
  noveltyHalfLifeHours: 24,
  slotsInterest: 6,
  slotsFollowed: 2,
  slotsPopular: 1,
  slotsExperimental: 1,
};

function FeedField({
  descriptor,
  value,
  disabled,
  onChange,
  onBlurFormat,
}: {
  descriptor: FeedFieldDescriptor;
  value: string;
  disabled: boolean;
  onChange: (raw: string) => void;
  onBlurFormat: () => void;
}) {
  const parsed = parseDecimalInput(value);
  const min = descriptor.min ?? 0;
  const invalid = parsed === null || parsed < min;
  return (
    <label>
      <span>{descriptor.label}</span>
      <input
        value={value}
        disabled={disabled}
        inputMode="decimal"
        aria-invalid={invalid}
        onBlur={onBlurFormat}
        onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ''))}
      />
      <small>{descriptor.hint}</small>
    </label>
  );
}

function FeedAlgorithmPage() {
  const { data: currentRole } = useCurrentStaffRole();
  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const { data: settings, isLoading, isError, refetch, isFetching } = useFeedAlgorithmSettings(true);
  const updateMutation = useUpdateFeedAlgorithmSettings();

  const [mode, setMode] = useState<FeedMode>('algorithm');
  const [values, setValues] = useState<Record<FeedFieldKey, string>>(() =>
    Object.fromEntries(
      (Object.keys(feedDefaults) as FeedFieldKey[]).map((key) => [key, formatDecimal(feedDefaults[key])]),
    ) as Record<FeedFieldKey, string>,
  );
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Popula o formulário quando os dados do banco chegam (uma vez por linha).
  const stamp = settings?.updated_at ?? (settings ? 'loaded' : null);
  if (settings && stamp !== hydratedFor) {
    setMode(settings.mode);
    setValues({
      weightAffinity: formatDecimal(settings.weight_affinity),
      weightRetention: formatDecimal(settings.weight_retention),
      weightEngagement: formatDecimal(settings.weight_engagement),
      weightNovelty: formatDecimal(settings.weight_novelty),
      weightExploration: formatDecimal(settings.weight_exploration),
      penaltyQuicklySkipped: formatDecimal(settings.penalty_quickly_skipped),
      penaltyAlreadyWatched: formatDecimal(settings.penalty_already_watched),
      diversityCreatorPenalty: formatDecimal(settings.diversity_creator_penalty),
      diversityTopicPenalty: formatDecimal(settings.diversity_topic_penalty),
      noveltyHalfLifeHours: formatDecimal(settings.novelty_half_life_hours),
      slotsInterest: formatDecimal(settings.slots_interest, 0),
      slotsFollowed: formatDecimal(settings.slots_followed, 0),
      slotsPopular: formatDecimal(settings.slots_popular, 0),
      slotsExperimental: formatDecimal(settings.slots_experimental, 0),
    });
    setHydratedFor(stamp);
  }

  const parsedValues = useMemo(() => {
    const result = {} as Record<FeedFieldKey, number | null>;
    for (const key of Object.keys(feedDefaults) as FeedFieldKey[]) {
      result[key] = parseDecimalInput(values[key]);
    }
    return result;
  }, [values]);

  const weightSum = feedWeightFields.reduce((sum, field) => sum + (parsedValues[field.key] ?? 0), 0);
  const blockSize = feedSlotKeys.reduce((sum, key) => sum + (parsedValues[key] ?? 0), 0);
  const hasInvalid = (Object.keys(feedDefaults) as FeedFieldKey[]).some((key) => {
    const parsed = parsedValues[key];
    const isSlot = (feedSlotKeys as ReadonlyArray<FeedFieldKey>).includes(key);
    const min = key === 'noveltyHalfLifeHours' ? 0.1 : isSlot ? 1 : 0;
    if (parsed === null || parsed < min) return true;
    if (isSlot && !Number.isInteger(parsed)) return true;
    return false;
  });

  const setField = (key: FeedFieldKey, raw: string) => {
    setValues((current) => ({ ...current, [key]: raw }));
  };

  const formatField = (key: FeedFieldKey) => {
    const parsed = parsedValues[key];
    if (parsed !== null) setValues((current) => ({ ...current, [key]: formatDecimal(parsed) }));
  };

  const restoreDefaults = () => {
    setValues(
      Object.fromEntries(
        (Object.keys(feedDefaults) as FeedFieldKey[]).map((key) => [key, formatDecimal(feedDefaults[key])]),
      ) as Record<FeedFieldKey, string>,
    );
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (mode === 'algorithm' && hasInvalid) {
      setMessage({ type: 'error', text: 'Confira os valores: pesos não podem ser negativos, a meia-vida deve ser positiva e as vagas por bucket devem ser números inteiros a partir de 1.' });
      return;
    }
    updateMutation.mutate(
      {
        mode,
        weightAffinity: parsedValues.weightAffinity ?? feedDefaults.weightAffinity,
        weightRetention: parsedValues.weightRetention ?? feedDefaults.weightRetention,
        weightEngagement: parsedValues.weightEngagement ?? feedDefaults.weightEngagement,
        weightNovelty: parsedValues.weightNovelty ?? feedDefaults.weightNovelty,
        weightExploration: parsedValues.weightExploration ?? feedDefaults.weightExploration,
        penaltyQuicklySkipped: parsedValues.penaltyQuicklySkipped ?? feedDefaults.penaltyQuicklySkipped,
        penaltyAlreadyWatched: parsedValues.penaltyAlreadyWatched ?? feedDefaults.penaltyAlreadyWatched,
        diversityCreatorPenalty: parsedValues.diversityCreatorPenalty ?? feedDefaults.diversityCreatorPenalty,
        diversityTopicPenalty: parsedValues.diversityTopicPenalty ?? feedDefaults.diversityTopicPenalty,
        noveltyHalfLifeHours: parsedValues.noveltyHalfLifeHours ?? feedDefaults.noveltyHalfLifeHours,
        slotsInterest: parsedValues.slotsInterest ?? feedDefaults.slotsInterest,
        slotsFollowed: parsedValues.slotsFollowed ?? feedDefaults.slotsFollowed,
        slotsPopular: parsedValues.slotsPopular ?? feedDefaults.slotsPopular,
        slotsExperimental: parsedValues.slotsExperimental ?? feedDefaults.slotsExperimental,
      },
      {
        onSuccess: () =>
          setMessage({ type: 'success', text: 'Configuração salva. O feed de todos os usuários já segue esta regra.' }),
        onError: (error) =>
          setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar.' }),
      },
    );
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Configuração</p>
          <h1>Feed</h1>
          <span>Defina como o conteúdo aparece no feed de todos os usuários.</span>
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
          <Rss size={18} />
          {canEdit
            ? 'A regra escolhida aqui é aplicada em tempo real ao feed de todos os usuários do app, sem novo deploy.'
            : 'Seu papel permite consultar esta configuração, mas somente administradores podem alterá-la.'}
        </div>

        {isLoading ? (
          <div className="skeleton staff-skeleton" />
        ) : isError ? (
          <div className="inline-alert danger" role="alert">
            <AlertTriangle size={18} />
            Não foi possível carregar a configuração do feed. Verifique se a migration do feed foi aplicada.
          </div>
        ) : (
          <form className="staff-form feed-form" onSubmit={save}>
            <fieldset className="feed-mode" disabled={!canEdit}>
              <legend>Modo do feed</legend>
              <label className={`feed-mode-option ${mode === 'algorithm' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="feed-mode"
                  value="algorithm"
                  checked={mode === 'algorithm'}
                  onChange={() => setMode('algorithm')}
                />
                <Sparkles size={18} />
                <div>
                  <strong>Algoritmo personalizado</strong>
                  <span>Ranking por afinidade, retenção, engajamento, novidade e exploração, com diversidade.</span>
                </div>
              </label>
              <label className={`feed-mode-option ${mode === 'random' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="feed-mode"
                  value="random"
                  checked={mode === 'random'}
                  onChange={() => setMode('random')}
                />
                <Shuffle size={18} />
                <div>
                  <strong>Aleatório</strong>
                  <span>Mostra todo o conteúdo elegível em ordem aleatória, ignorando o ranking.</span>
                </div>
              </label>
            </fieldset>

            {mode === 'algorithm' && (
              <>
                <div className="feed-section-head">
                  <SlidersHorizontal size={18} />
                  <div>
                    <h2>Pesos do ranking</h2>
                    <p>
                      Quanto cada sinal contribui para a posição do post. Soma atual dos pesos:{' '}
                      <strong>{formatDecimal(weightSum)}</strong> (o clássico soma 1, mas valores livres funcionam).
                    </p>
                  </div>
                </div>
                <div className="feed-grid">
                  {feedWeightFields.map((field) => (
                    <FeedField
                      key={field.key}
                      descriptor={field}
                      value={values[field.key]}
                      disabled={!canEdit}
                      onChange={(raw) => setField(field.key, raw)}
                      onBlurFormat={() => formatField(field.key)}
                    />
                  ))}
                </div>

                <div className="feed-section-head">
                  <SlidersHorizontal size={18} />
                  <div>
                    <h2>Penalidades e diversidade</h2>
                    <p>Descontos que evitam repetição e conteúdo já visto.</p>
                  </div>
                </div>
                <div className="feed-grid">
                  {feedTuningFields.map((field) => (
                    <FeedField
                      key={field.key}
                      descriptor={field}
                      value={values[field.key]}
                      disabled={!canEdit}
                      onChange={(raw) => setField(field.key, raw)}
                      onBlurFormat={() => formatField(field.key)}
                    />
                  ))}
                </div>

                <div className="feed-section-head">
                  <SlidersHorizontal size={18} />
                  <div>
                    <h2>Distribuição de slots</h2>
                    <p>
                      Quantas posições de cada critério entram por bloco de conteúdo. Bloco atual:{' '}
                      <strong>{blockSize || '—'}</strong> posts, sendo {values.slotsInterest || '—'} de afinidade,{' '}
                      {values.slotsFollowed || '—'} de seguidos, {values.slotsPopular || '—'} de popular e{' '}
                      {values.slotsExperimental || '—'} experimental.
                    </p>
                  </div>
                </div>
                <div className="feed-grid">
                  {feedSlotFields.map((field) => (
                    <FeedField
                      key={field.key}
                      descriptor={field}
                      value={values[field.key]}
                      disabled={!canEdit}
                      onChange={(raw) => setField(field.key, raw)}
                      onBlurFormat={() => formatField(field.key)}
                    />
                  ))}
                </div>
              </>
            )}

            {canEdit && (
              <div className="feed-actions">
                {mode === 'algorithm' && (
                  <button className="button secondary" type="button" onClick={restoreDefaults}>
                    <RefreshCw size={16} />
                    Restaurar padrões
                  </button>
                )}
                <button
                  className="button primary"
                  type="submit"
                  disabled={updateMutation.isPending || (mode === 'algorithm' && hasInvalid)}
                >
                  {updateMutation.isPending ? <RefreshCw className="spin" size={16} /> : <CheckCircle2 size={16} />}
                  Salvar configuração
                </button>
              </div>
            )}

            {message && (
              <div className={`inline-alert ${message.type === 'error' ? 'danger' : ''}`} role="status">
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                {message.text}
              </div>
            )}
          </form>
        )}
      </section>
    </>
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

function parseIntInput(value: string): number | null {
  const normalized = value.trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function PaymentSettingsForm({
  settings,
  canEdit,
}: {
  settings: { payout_processing_hours: number; payout_minimum_amount: number; card_settlement_days: number };
  canEdit: boolean;
}) {
  const updateMutation = useUpdatePlatformPaymentSettings();
  const [hoursInput, setHoursInput] = useState(() => String(settings.payout_processing_hours));
  const [minimumInput, setMinimumInput] = useState(() => formatPriceInput(settings.payout_minimum_amount));
  const [settlementInput, setSettlementInput] = useState(() => String(settings.card_settlement_days));
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hours = parseIntInput(hoursInput);
  const minimum = parseCurrencyInput(minimumInput);
  const settlement = parseIntInput(settlementInput);

  const isHoursInvalid = hours === null;
  const isMinimumInvalid = minimum === null || minimum < 0;
  const isSettlementInvalid = settlement === null;
  const hasInvalid = isHoursInvalid || isMinimumInvalid || isSettlementInvalid;

  const dirty =
    (hours ?? -1) !== settings.payout_processing_hours ||
    Math.round((minimum ?? -1) * 100) !== Math.round(settings.payout_minimum_amount * 100) ||
    (settlement ?? -1) !== settings.card_settlement_days;

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (hours === null || minimum === null || settlement === null || hasInvalid) {
      setMessage({ type: 'error', text: 'Confira os valores: horas e dias devem ser inteiros positivos.' });
      return;
    }
    updateMutation.mutate(
      { payoutProcessingHours: hours, payoutMinimumAmount: minimum, cardSettlementDays: settlement },
      {
        onSuccess: () => setMessage({ type: 'success', text: 'Parâmetros de pagamento atualizados.' }),
        onError: (error) =>
          setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar.' }),
      },
    );
  };

  return (
    <section className="staff-create-panel" aria-labelledby="payment-settings-title">
      <div className="staff-create-copy">
        <Gauge size={20} />
        <div>
          <h2 id="payment-settings-title">Parâmetros de pagamento</h2>
          <p>Regras globais usadas quando o fluxo de pagamentos estiver ativo. Só administradores alteram.</p>
        </div>
      </div>

      <form className="staff-form" onSubmit={save}>
        <label>
          <span>Prazo de processamento de resgate (horas úteis)</span>
          <input
            value={hoursInput}
            disabled={!canEdit}
            inputMode="numeric"
            aria-invalid={isHoursInvalid}
            onChange={(event) => setHoursInput(event.target.value.replace(/[^\d]/g, ''))}
          />
          <small>Tempo-alvo entre a solicitação e o envio do resgate (padrão 48).</small>
        </label>
        <label>
          <span>Valor mínimo de resgate (R$)</span>
          <input
            value={minimumInput}
            disabled={!canEdit}
            inputMode="decimal"
            aria-invalid={isMinimumInvalid}
            onBlur={() => {
              if (minimum !== null) setMinimumInput(formatPriceInput(minimum));
            }}
            onChange={(event) => setMinimumInput(event.target.value.replace(/[^\d.,]/g, ''))}
          />
          <small>0 permite resgatar qualquer valor disponível.</small>
        </label>
        <label>
          <span>Janela de liquidação de cartão (dias)</span>
          <input
            value={settlementInput}
            disabled={!canEdit}
            inputMode="numeric"
            aria-invalid={isSettlementInvalid}
            onChange={(event) => setSettlementInput(event.target.value.replace(/[^\d]/g, ''))}
          />
          <small>Prazo informativo exibido ao profissional (padrão 32).</small>
        </label>
        {canEdit && (
          <button className="button primary" type="submit" disabled={!dirty || hasInvalid || updateMutation.isPending}>
            {updateMutation.isPending ? <RefreshCw className="spin" size={16} /> : <CheckCircle2 size={16} />}
            Salvar parâmetros
          </button>
        )}
      </form>

      {message && (
        <div className={`inline-alert ${message.type === 'error' ? 'danger' : ''}`} role="status">
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}
    </section>
  );
}

function FinancePage() {
  const { data: currentRole } = useCurrentStaffRole();
  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const { data, isLoading, isError, refetch, isFetching } = usePlatformPaymentSettings(true);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Financeiro</p>
          <h1>Pagamentos e resgates</h1>
          <span>Parâmetros globais de pagamento e a fila de aprovação de resgates dos profissionais.</span>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'spin' : ''} size={16} />
            Atualizar
          </button>
        </div>
      </header>

      <section className="content">
        {isLoading ? (
          <div className="skeleton staff-skeleton" />
        ) : isError ? (
          <div className="inline-alert danger" role="alert">
            <AlertTriangle size={18} />
            Não foi possível carregar os parâmetros de pagamento.
          </div>
        ) : data ? (
          <PaymentSettingsForm settings={data} canEdit={canEdit} />
        ) : null}

        <section className="staff-list-section" aria-labelledby="payout-queue-title">
          <div className="section-heading">
            <div>
              <h2 id="payout-queue-title">Fila de resgates</h2>
              <p>Aprovação dos pedidos de resgate via PIX (chave CPF) dos profissionais.</p>
            </div>
          </div>
          <div className="access-panel inline-access" role="status">
            <div className="status-icon"><HandCoins size={24} /></div>
            <div>
              <h2>Aguardando o fluxo de pagamentos</h2>
              <p>
                A fila de resgates aparece aqui assim que o modelo de custódia for definido e o recebimento
                de pagamentos entrar em operação. A estrutura de auditoria e os parâmetros acima já estão prontos.
              </p>
            </div>
          </div>
        </section>
      </section>
    </>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: 'neutral' | 'finance' | 'attention';
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-title">
        <span>{title}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function DashboardSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function AppActivityChart({ activity }: { activity: WeeklyActivity[] }) {
  const width = 720;
  const height = 220;
  const max = Math.max(
    1,
    ...activity.flatMap((point) => [
      point.completed_sessions,
      point.posts_created,
      point.saves_created,
      point.comments_created,
    ]),
  );
  const denominator = Math.max(1, activity.length - 1);
  const points = activity.map((point, index) => {
    const x = 24 + (index * (width - 48)) / denominator;
    const date = new Date(`${point.date}T12:00:00`);
    return {
      ...point,
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      x,
      sessionsY: height - 28 - (point.completed_sessions / max) * (height - 56),
      postsY: height - 28 - (point.posts_created / max) * (height - 56),
      savesY: height - 28 - (point.saves_created / max) * (height - 56),
      commentsY: height - 28 - (point.comments_created / max) * (height - 56),
    };
  });
  const pathFor = (key: 'sessionsY' | 'postsY' | 'savesY' | 'commentsY') => (
    points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point[key]}`).join(' ')
  );
  const totals = activity.reduce(
    (sum, point) => ({
      completed_sessions: sum.completed_sessions + point.completed_sessions,
      posts_created: sum.posts_created + point.posts_created,
      saves_created: sum.saves_created + point.saves_created,
      comments_created: sum.comments_created + point.comments_created,
    }),
    { completed_sessions: 0, posts_created: 0, saves_created: 0, comments_created: 0 },
  );
  const total = totals.completed_sessions + totals.posts_created + totals.saves_created + totals.comments_created;

  return (
    <figure className="chart-panel">
      <figcaption>
        <div>
          <strong>Atividade dos últimos 7 dias</strong>
          <span>Treinos, posts, comentários e salvamentos por dia</span>
        </div>
        <div className="chart-total">
          <BarChart3 size={16} />
          <strong>{formatNumber(total)}</strong>
          <span>ações no período</span>
        </div>
      </figcaption>
      <div className="chart-legend" aria-label="Legenda do gráfico de atividade">
        <span><i className="legend-workouts" />Treinos</span>
        <span><i className="legend-posts" />Posts</span>
        <span><i className="legend-comments" />Comentários</span>
        <span><i className="legend-saves" />Salvos</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ações do app nos últimos sete dias">
        {[0, 1, 2, 3].map((line) => {
          const y = 28 + line * 44;
          return <line key={line} x1="24" x2={width - 24} y1={y} y2={y} className="grid-line" />;
        })}
        {points.length > 0 && (
          <>
            <path d={pathFor('sessionsY')} className="chart-line chart-line-workouts" />
            <path d={pathFor('postsY')} className="chart-line chart-line-posts" />
            <path d={pathFor('commentsY')} className="chart-line chart-line-comments" />
            <path d={pathFor('savesY')} className="chart-line chart-line-saves" />
          </>
        )}
        {points.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.sessionsY} r="4" className="chart-dot chart-dot-workouts" />
            <text x={point.x} y={height - 8} textAnchor="middle">{point.label}</text>
          </g>
        ))}
      </svg>
      <div className="chart-values" aria-label="Valores diários">
        {points.map((point) => (
          <span key={point.date}>
            <small>{point.label}</small>
            <strong>{formatNumber(point.completed_sessions + point.posts_created + point.comments_created + point.saves_created)}</strong>
          </span>
        ))}
      </div>
    </figure>
  );
}

function FinanceChart({ finance }: { finance: WeeklyFinance[] }) {
  const width = 720;
  const height = 220;
  const max = Math.max(1, ...finance.map((point) => point.gross_value));
  const bars = finance.map((point, index) => {
    const availableWidth = width - 48;
    const slot = availableWidth / Math.max(1, finance.length);
    const barWidth = Math.max(18, slot * 0.5);
    const barHeight = (point.gross_value / max) * (height - 64);
    const date = new Date(`${point.date}T12:00:00`);
    return {
      ...point,
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      x: 24 + index * slot + (slot - barWidth) / 2,
      y: height - 28 - barHeight,
      barWidth,
      barHeight,
    };
  });
  const total = finance.reduce((sum, point) => sum + point.gross_value, 0);

  return (
    <figure className="chart-panel">
      <figcaption>
        <div>
          <strong>Receita confirmada nos últimos 7 dias</strong>
          <span>Valor bruto por data de confirmação</span>
        </div>
        <div className="chart-total">
          <ReceiptText size={16} />
          <strong>{formatCurrency(total)}</strong>
          <span>no período</span>
        </div>
      </figcaption>
      {total === 0 ? (
        <p className="empty-copy">Nenhuma transação financeira confirmada neste período.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Receita confirmada nos últimos sete dias">
          {[0, 1, 2, 3].map((line) => {
            const y = 28 + line * 44;
            return <line key={line} x1="24" x2={width - 24} y1={y} y2={y} className="grid-line" />;
          })}
          {bars.map((bar) => (
            <g key={bar.date}>
              <rect
                className="finance-bar"
                x={bar.x}
                y={bar.y}
                width={bar.barWidth}
                height={Math.max(2, bar.barHeight)}
                rx="6"
              />
              <text x={bar.x + bar.barWidth / 2} y={height - 8} textAnchor="middle">{bar.label}</text>
            </g>
          ))}
        </svg>
      )}
      <div className="chart-values" aria-label="Valores financeiros diários">
        {bars.map((bar) => (
          <span key={bar.date}>
            <small>{bar.label}</small>
            <strong>{formatCurrency(bar.gross_value)}</strong>
          </span>
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

  const appMetrics = useMemo(
    () => data ? [
      {
        title: 'Usuários totais',
        value: formatNumber(data.overview.profiles_total),
        detail: `${formatNumber(data.overview.profiles_created_today)} novos hoje`,
        icon: Users,
      },
      {
        title: 'Treinos hoje',
        value: formatNumber(data.overview.workout_sessions_completed_today),
        detail: `${formatNumber(data.appActivity.workout_sessions_total)} sessões concluídas no histórico`,
        icon: Dumbbell,
      },
      {
        title: 'Posts publicados',
        value: formatNumber(data.appActivity.posts_total),
        detail: `${formatNumber(data.appActivity.posts_published_today)} novos hoje`,
        icon: Rss,
      },
      {
        title: 'Curtidas',
        value: formatNumber(data.appActivity.post_likes_total),
        detail: 'Interações registradas em posts',
        icon: Heart,
      },
      {
        title: 'Comentários',
        value: formatNumber(data.appActivity.post_comments_total),
        detail: 'Conversas registradas no feed',
        icon: MessageCircle,
      },
      {
        title: 'Denúncias pendentes',
        value: formatNumber(data.overview.pending_content_reports),
        detail: 'Fila de moderação aguardando triagem',
        icon: AlertTriangle,
        tone: data.overview.pending_content_reports > 0 ? 'attention' as const : 'neutral' as const,
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

  const financeMetrics = useMemo(
    () => data ? [
      {
        title: 'Receita acumulada',
        value: formatCurrency(data.finance.gross_revenue_total),
        detail: `${formatNumber(data.finance.transactions_total)} transações registradas`,
        icon: CreditCard,
        tone: 'finance' as const,
      },
      {
        title: 'Receita no mês',
        value: formatCurrency(data.finance.transactions_paid_month_value),
        detail: `${formatNumber(data.finance.transactions_paid_month_count)} pagamentos confirmados`,
        icon: ReceiptText,
        tone: 'finance' as const,
      },
      {
        title: 'Pagamentos hoje',
        value: formatCurrency(data.finance.transactions_paid_today_value),
        detail: `${formatNumber(data.finance.transactions_paid_today_count)} cobranças confirmadas`,
        icon: Gauge,
        tone: 'finance' as const,
      },
      {
        title: 'Comissão acumulada',
        value: formatCurrency(data.finance.platform_commission_total),
        detail: 'Receita OnlyFit retida nas transações',
        icon: WalletCards,
        tone: 'finance' as const,
      },
      {
        title: 'Assinaturas ativas',
        value: formatNumber(data.finance.active_subscriptions_total),
        detail: 'Recorrências vigentes na plataforma',
        icon: Activity,
        tone: 'finance' as const,
      },
      {
        title: 'Liquidação pendente',
        value: formatCurrency(data.finance.pending_settlement_value),
        detail: 'Valor líquido ainda não liquidado',
        icon: HandCoins,
        tone: 'finance' as const,
      },
    ] : [],
    [data],
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
          <div className="inline-alert soft" role="alert">
            <AlertTriangle size={18} />
            O snapshot do dashboard não respondeu agora. Tente atualizar; quando uma fonte ainda não tiver dados, o painel mostra zero e uma mensagem no bloco correspondente.
          </div>
        )}

        {isLoading ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            {data.notes.length > 0 && (
              <div className="inline-alert soft" role="status">
                <AlertTriangle size={18} />
                {data.notes.join(' ')}
              </div>
            )}

            <DashboardSection
              title="Ações no app"
              description="Grandes números de uso, criação de conteúdo, engajamento e operação."
            >
              <div className="dashboard-grid">
                {appMetrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}
              </div>
            </DashboardSection>

            <DashboardSection
              title="Financeiro"
              description="Valores acumulados e situação das cobranças processadas pela plataforma."
            >
              <div className="dashboard-grid">
                {financeMetrics.map((metric) => <MetricCard key={metric.title} {...metric} />)}
              </div>
              {data.finance.transactions_total === 0 && (
                <div className="inline-alert soft" role="status">
                  <CreditCard size={18} />
                  Nenhuma transação financeira foi registrada ainda. Os indicadores ficam zerados até a primeira cobrança confirmada.
                </div>
              )}
            </DashboardSection>
          </>
        ) : null}

        {data && (
          <div className="lower-grid">
            <AppActivityChart activity={data.weeklyActivity} />
            <FinanceChart finance={data.weeklyFinance} />
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
        {activeSection === 'feed' && <FeedAlgorithmPage />}
        {activeSection === 'offering-types' && <OfferingTypesPage />}
        {activeSection === 'finance' && <FinancePage />}
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

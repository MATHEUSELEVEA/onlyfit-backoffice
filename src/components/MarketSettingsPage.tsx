import {
  AlertTriangle,
  Check,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Ticket,
} from 'lucide-react';
import { CSSProperties, FormEvent, useState } from 'react';
import {
  useMarketAlgorithmSettings,
  useAdBookings,
  useAdInventory,
  useProductCategories,
  useSaveProductCategory,
  useSetMarketAlgorithmSettings,
  useSetAdPackage,
  useSetAdPlacement,
} from '../hooks/useMarketSettings';
import type { AdBooking, AdPackage, AdPlacement, MarketAlgorithmInput, ProductCategory } from '../lib/marketSettings';
import { useCurrentStaffRole } from '../hooks/useStaffManagement';
import { formatNumber } from '../lib/format';

type FieldKey = keyof Omit<MarketAlgorithmInput, 'mode'>;

type FieldDescriptor = {
  key: FieldKey;
  label: string;
  /** Teto do slider. O valor gravado pode ultrapassá-lo; o slider se estica. */
  max: number;
  step: number;
  unit?: string;
};

const defaults: MarketAlgorithmInput = {
  mode: 'algorithm',
  weight_affinity: 0.3,
  weight_sales: 0.25,
  weight_rating: 0.15,
  weight_novelty: 0.2,
  weight_exploration: 0.1,
  diversity_seller_penalty: 0.12,
  diversity_category_penalty: 0.06,
  novelty_half_life_hours: 168,
  penalty_already_owned: 0.4,
};

const weightFields: readonly FieldDescriptor[] = [
  { key: 'weight_affinity', label: 'Afinidade', max: 1, step: 0.01 },
  { key: 'weight_sales', label: 'Vendas', max: 1, step: 0.01 },
  { key: 'weight_rating', label: 'Avaliação', max: 1, step: 0.01 },
  { key: 'weight_novelty', label: 'Novidade', max: 1, step: 0.01 },
  { key: 'weight_exploration', label: 'Exploração', max: 1, step: 0.01 },
];

const tuningFields: readonly FieldDescriptor[] = [
  { key: 'diversity_seller_penalty', label: 'Diversidade por vendedor', max: 1, step: 0.01 },
  { key: 'diversity_category_penalty', label: 'Diversidade por categoria', max: 1, step: 0.01 },
  { key: 'penalty_already_owned', label: 'Item já adquirido', max: 2, step: 0.01 },
  { key: 'novelty_half_life_hours', label: 'Meia-vida da novidade', max: 720, step: 1, unit: 'h' },
];

const allFields: readonly FieldDescriptor[] = [...weightFields, ...tuningFields];

const emptyCategory: ProductCategory = { slug: '', label: '', icon: 'package', sort_order: 100, is_active: true };

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const placementLabel = (value: string) =>
  value === 'sponsor_carousel' ? 'Carrossel patrocinado' : 'Produtos em destaque';

const bookingStatusLabel: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  active: { label: 'Ativa', tone: 'ok' },
  expired: { label: 'Encerrada', tone: 'muted' },
  failed: { label: 'Falhou', tone: 'danger' },
  refunded: { label: 'Reembolsada', tone: 'muted' },
};

const decimals = (step: number) => (step >= 1 ? 0 : 2);

export function MarketSettingsPage() {
  const { data: role } = useCurrentStaffRole();
  const canEdit = role === 'super_admin' || role === 'admin';
  const settings = useMarketAlgorithmSettings();
  const categories = useProductCategories();
  const adInventory = useAdInventory();
  const adBookings = useAdBookings();

  const refreshAll = () => {
    void settings.refetch();
    void categories.refetch();
    void adInventory.refetch();
    void adBookings.refetch();
  };

  const refreshing =
    settings.isFetching || categories.isFetching || adInventory.isFetching || adBookings.isFetching;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Configuração</p>
          <h1>Mercado</h1>
          <span>Ranking do catálogo, inventário de publicidade e categorias dos produtos físicos.</span>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={refreshAll} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'spin' : ''} size={16} /> Atualizar
          </button>
        </div>
      </header>

      <section className="content market-page">
        <AlgorithmSection query={settings} canEdit={canEdit} />
        <AdvertisingSection
          inventory={adInventory.data ?? []}
          loading={adInventory.isLoading}
          error={adInventory.isError}
          canEdit={canEdit}
        />
        <BookingsSection
          bookings={adBookings.data?.items ?? []}
          total={adBookings.data?.total ?? 0}
          loading={adBookings.isLoading}
          error={adBookings.isError}
        />
        <CategoriesSection
          categories={categories.data ?? []}
          loading={categories.isLoading}
          error={categories.isError}
          canEdit={canEdit}
        />
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Algoritmo do catálogo                                               */
/* ------------------------------------------------------------------ */

function AlgorithmSection({
  query,
  canEdit,
}: {
  query: ReturnType<typeof useMarketAlgorithmSettings>;
  canEdit: boolean;
}) {
  const mutation = useSetMarketAlgorithmSettings();
  const [form, setForm] = useState<MarketAlgorithmInput>(defaults);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const stamp = query.data?.updated_at ?? (query.data ? 'loaded' : null);
  if (query.data && stamp !== hydratedFor) {
    const { updated_at, ...values } = query.data;
    void updated_at;
    setForm(values);
    setHydratedFor(stamp);
  }

  const weightSum = weightFields.reduce((sum, field) => sum + (form[field.key] || 0), 0);
  const invalidField = allFields.find((field) => {
    const value = form[field.key];
    if (!Number.isFinite(value) || value < 0) return true;
    return field.key === 'novelty_half_life_hours' && value <= 0;
  });

  const dirty = query.data ? allFields.some((field) => form[field.key] !== query.data?.[field.key]) || form.mode !== query.data.mode : false;

  const save = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (invalidField) {
      setFeedback({ tone: 'danger', text: `Confira “${invalidField.label}”.` });
      return;
    }
    mutation.mutate(form, {
      onSuccess: () => setFeedback({ tone: 'ok', text: 'Algoritmo do mercado atualizado.' }),
      onError: (error) =>
        setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'Não foi possível salvar.' }),
    });
  };

  if (query.isLoading) return <div className="skeleton market-skeleton" />;
  if (query.isError) {
    return (
      <div className="inline-alert danger" role="alert">
        <AlertTriangle size={18} /> Não foi possível carregar o algoritmo do mercado.
      </div>
    );
  }

  const randomMode = form.mode === 'random';

  return (
    <form className="market-form" onSubmit={save}>
      <section className="feed-command-panel">
        <div className="feed-command-head">
          <div>
            <span>Modo ativo</span>
            <h2>{randomMode ? 'Aleatório' : 'Algoritmo'}</h2>
          </div>
          <div className="feed-live-pill">
            <Sparkles size={14} /> Catálogo
          </div>
        </div>

        <fieldset className="feed-mode" disabled={!canEdit}>
          <legend className="sr-only">Modo do catálogo</legend>
          <label className={`feed-mode-option ${randomMode ? '' : 'selected'}`}>
            <input
              type="radio"
              name="market-mode"
              checked={!randomMode}
              onChange={() => setForm((value) => ({ ...value, mode: 'algorithm' }))}
            />
            <SlidersHorizontal size={18} />
            <div>
              <strong>Algoritmo</strong>
              <span>Sinais e diversidade</span>
            </div>
          </label>
          <label className={`feed-mode-option ${randomMode ? 'selected' : ''}`}>
            <input
              type="radio"
              name="market-mode"
              checked={randomMode}
              onChange={() => setForm((value) => ({ ...value, mode: 'random' }))}
            />
            <Shuffle size={18} />
            <div>
              <strong>Aleatório</strong>
              <span>Estável por dia</span>
            </div>
          </label>
        </fieldset>

        <div className="feed-kpis">
          <article>
            <span>Pesos</span>
            <strong>{weightSum.toFixed(2)}</strong>
          </article>
          <article>
            <span>Novidade</span>
            <strong>{form.novelty_half_life_hours}h</strong>
          </article>
          <article>
            <span>Já adquirido</span>
            <strong>{form.penalty_already_owned.toFixed(2)}</strong>
          </article>
          <article>
            <span>Estado</span>
            <strong>{invalidField ? 'Revisar' : 'OK'}</strong>
          </article>
        </div>
      </section>

      {!randomMode && (
        <>
          <MarketPanel icon={SlidersHorizontal} title="Ranking" meta={`Soma ${weightSum.toFixed(2)}`}>
            <div className="feed-grid">
              {weightFields.map((field) => (
                <RangeField
                  key={field.key}
                  descriptor={field}
                  value={form[field.key]}
                  disabled={!canEdit}
                  onChange={(next) => setForm((current) => ({ ...current, [field.key]: next }))}
                />
              ))}
            </div>
          </MarketPanel>

          <MarketPanel icon={SlidersHorizontal} title="Ajustes" meta="Penalidades e decaimento">
            <div className="feed-grid">
              {tuningFields.map((field) => (
                <RangeField
                  key={field.key}
                  descriptor={field}
                  value={form[field.key]}
                  disabled={!canEdit}
                  onChange={(next) => setForm((current) => ({ ...current, [field.key]: next }))}
                />
              ))}
            </div>
          </MarketPanel>
        </>
      )}

      {canEdit && (
        <div className="market-form-actions">
          <FeedbackLine feedback={feedback} />
          <button className="button primary" type="submit" disabled={mutation.isPending || !dirty || Boolean(invalidField)}>
            {mutation.isPending ? <RefreshCw className="spin" size={16} /> : <Save size={16} />} Salvar algoritmo
          </button>
        </div>
      )}
    </form>
  );
}

function RangeField({
  descriptor,
  value,
  disabled,
  onChange,
}: {
  descriptor: FieldDescriptor;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const safe = Number.isFinite(value) ? value : 0;
  const max = Math.max(descriptor.max, safe);
  const progress = max === 0 ? 0 : (Math.min(max, Math.max(0, safe)) / max) * 100;
  const places = decimals(descriptor.step);
  return (
    <label className="feed-field-card" style={{ '--feed-progress': `${progress}%` } as CSSProperties}>
      <div className="feed-field-top">
        <span>{descriptor.label}</span>
        <strong>
          {safe.toFixed(places)}
          {descriptor.unit ? ` ${descriptor.unit}` : ''}
        </strong>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={descriptor.step}
        value={Math.min(max, Math.max(0, safe))}
        disabled={disabled}
        aria-label={descriptor.label}
        onChange={(event) => onChange(Number(Number(event.target.value).toFixed(places)))}
      />
      <div className="feed-slider-scale" aria-hidden="true">
        <span>0</span>
        <span>
          {max.toFixed(places === 0 ? 0 : 1)}
          {descriptor.unit ? ` ${descriptor.unit}` : ''}
        </span>
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Publicidade                                                         */
/* ------------------------------------------------------------------ */

function AdvertisingSection({
  inventory,
  loading,
  error,
  canEdit,
}: {
  inventory: AdPlacement[];
  loading: boolean;
  error: boolean;
  canEdit: boolean;
}) {
  return (
    <MarketPanel icon={Megaphone} title="Destaques pagos" meta={`${inventory.length} posição(ões)`}>
      {error ? (
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} /> Não foi possível carregar o inventário de anúncios.
        </div>
      ) : loading ? (
        <div className="market-placement-grid">
          <div className="skeleton market-skeleton" />
          <div className="skeleton market-skeleton" />
        </div>
      ) : inventory.length === 0 ? (
        <p className="market-empty">
          <Megaphone size={20} aria-hidden="true" /> Nenhuma posição cadastrada
        </p>
      ) : (
        <div className="market-placement-grid">
          {inventory.map((placement) => (
            <PlacementCard
              key={`${placement.slug}-${placement.max_slots}-${placement.is_active}-${placement.packages
                .map((item) => `${item.id}:${item.price}:${item.is_active}`)
                .join('|')}`}
              placement={placement}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </MarketPanel>
  );
}

function PlacementCard({ placement, canEdit }: { placement: AdPlacement; canEdit: boolean }) {
  const savePlacement = useSetAdPlacement();
  const [maxSlots, setMaxSlots] = useState(placement.max_slots);
  const [active, setActive] = useState(placement.is_active);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const invalidSlots = !Number.isInteger(maxSlots) || maxSlots < 0 || maxSlots > 100;
  const dirty = maxSlots !== placement.max_slots || active !== placement.is_active;

  const free = Math.max(0, placement.max_slots - placement.occupied_slots - placement.reserved_slots);

  const submit = () => {
    setFeedback(null);
    savePlacement.mutate(
      { slug: placement.slug, max_slots: maxSlots, is_active: active },
      {
        onSuccess: () => setFeedback({ tone: 'ok', text: 'Posição salva.' }),
        onError: (error) =>
          setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'Não foi possível salvar a posição.' }),
      },
    );
  };

  return (
    <article className="market-placement">
      <header className="market-placement-head">
        <h3>{placement.name || placementLabel(placement.slug)}</h3>
        <span className={`market-pill ${active ? 'ok' : 'muted'}`}>{active ? 'Ativa' : 'Inativa'}</span>
      </header>

      <OccupancyMeter
        occupied={placement.occupied_slots}
        reserved={placement.reserved_slots}
        free={free}
        total={placement.max_slots}
      />

      <div className="market-placement-controls">
        <label className="market-field">
          <span>Limite de vagas</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={maxSlots}
            disabled={!canEdit}
            aria-invalid={invalidSlots || undefined}
            onChange={(event) => setMaxSlots(Math.trunc(Number(event.target.value)))}
          />
        </label>
        <SwitchField
          label="Posição ativa"
          checked={active}
          disabled={!canEdit}
          onChange={setActive}
        />
      </div>

      <div className="market-packages">
        <div className="market-packages-head" aria-hidden="true">
          <span>Duração</span>
          <span>Preço</span>
          <span>Venda</span>
          <span />
        </div>
        {placement.packages.length === 0 ? (
          <p className="market-empty compact">
            <Ticket size={18} aria-hidden="true" /> Nenhum pacote
          </p>
        ) : (
          placement.packages.map((item) => (
            <PackageRow key={`${item.id}-${item.price}-${item.is_active}`} item={item} canEdit={canEdit} />
          ))
        )}
      </div>

      {canEdit && (
        <footer className="market-placement-foot">
          <FeedbackLine feedback={feedback} />
          <button
            className="button secondary"
            type="button"
            disabled={savePlacement.isPending || !dirty || invalidSlots}
            onClick={submit}
          >
            {savePlacement.isPending ? <RefreshCw className="spin" size={16} /> : <Save size={16} />} Salvar posição
          </button>
        </footer>
      )}
    </article>
  );
}

function OccupancyMeter({
  occupied,
  reserved,
  free,
  total,
}: {
  occupied: number;
  reserved: number;
  free: number;
  total: number;
}) {
  const denominator = Math.max(total, occupied + reserved) || 1;
  const share = (value: number) => `${(value / denominator) * 100}%`;
  return (
    <div className="market-occupancy">
      <div
        className="market-occupancy-bar"
        role="img"
        aria-label={`${occupied} ocupada(s), ${reserved} reservada(s) e ${free} livre(s) de ${total} vaga(s)`}
      >
        <span className="occupied" style={{ width: share(occupied) }} />
        <span className="reserved" style={{ width: share(reserved) }} />
        <span className="free" style={{ width: share(free) }} />
      </div>
      <dl className="market-occupancy-legend">
        <div>
          <dt>Ocupadas</dt>
          <dd>{formatNumber(occupied)}</dd>
        </div>
        <div>
          <dt>Reservadas</dt>
          <dd>{formatNumber(reserved)}</dd>
        </div>
        <div>
          <dt>Livres</dt>
          <dd>{formatNumber(free)}</dd>
        </div>
      </dl>
    </div>
  );
}

function PackageRow({ item, canEdit }: { item: AdPackage; canEdit: boolean }) {
  const savePackage = useSetAdPackage();
  const [price, setPrice] = useState(item.price == null ? '' : item.price.toFixed(2).replace('.', ','));
  const [active, setActive] = useState(item.is_active);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const numericPrice = Number(price.replace(/\./g, '').replace(',', '.'));
  const priceValid = price.trim() !== '' && Number.isFinite(numericPrice) && numericPrice > 0;
  const dirty = numericPrice !== item.price || active !== item.is_active;

  const submit = () => {
    setFeedback(null);
    savePackage.mutate(
      { placement: item.placement, duration_days: item.duration_days, price: numericPrice, is_active: active },
      {
        onSuccess: () => setFeedback({ tone: 'ok', text: 'Pacote salvo.' }),
        onError: (error) =>
          setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'Não foi possível salvar o pacote.' }),
      },
    );
  };

  return (
    <div className="market-package-row">
      <span className="market-package-duration">{item.duration_days} dias</span>
      <label className="market-price">
        <span aria-hidden="true">R$</span>
        <input
          inputMode="decimal"
          placeholder="0,00"
          value={price}
          disabled={!canEdit}
          aria-label={`Preço do pacote de ${item.duration_days} dias`}
          aria-invalid={price.trim() !== '' && !priceValid ? true : undefined}
          onChange={(event) => setPrice(event.target.value.replace(/[^\d,.]/g, ''))}
        />
      </label>
      <SwitchField
        label={`Vender pacote de ${item.duration_days} dias`}
        hideLabel
        checked={active}
        disabled={!canEdit || !priceValid}
        onChange={setActive}
      />
      {canEdit ? (
        <button
          className="icon-button"
          type="button"
          disabled={savePackage.isPending || !priceValid || !dirty}
          aria-label={`Salvar pacote de ${item.duration_days} dias`}
          title={feedback?.text ?? 'Salvar pacote'}
          onClick={submit}
        >
          {savePackage.isPending ? <RefreshCw className="spin" size={16} /> : feedback?.tone === 'ok' && !dirty ? <Check size={16} /> : <Save size={16} />}
        </button>
      ) : (
        <span />
      )}
      {feedback?.tone === 'danger' && (
        <p className="market-package-error" role="alert">
          {feedback.text}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campanhas contratadas                                               */
/* ------------------------------------------------------------------ */

function BookingsSection({
  bookings,
  total,
  loading,
  error,
}: {
  bookings: AdBooking[];
  total: number;
  loading: boolean;
  error: boolean;
}) {
  return (
    <MarketPanel icon={Ticket} title="Campanhas contratadas" meta={total ? `${formatNumber(total)} no total` : undefined}>
      {error ? (
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} /> Não foi possível carregar as campanhas.
        </div>
      ) : loading ? (
        <div className="skeleton market-skeleton" />
      ) : bookings.length === 0 ? (
        <p className="market-empty">
          <Ticket size={20} aria-hidden="true" /> Nenhuma campanha contratada
        </p>
      ) : (
        <div className="market-table-wrap">
          <table className="market-table">
            <thead>
              <tr>
                <th>Oferta</th>
                <th>Comprador</th>
                <th>Posição</th>
                <th>Período</th>
                <th>Valor</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const status = bookingStatusLabel[booking.status] ?? { label: booking.status, tone: 'muted' };
                return (
                  <tr key={booking.id}>
                    <td>{booking.offering_name}</td>
                    <td>{booking.purchaser_name}</td>
                    <td>{placementLabel(booking.placement)}</td>
                    <td>{booking.duration_days} dias</td>
                    <td className="market-numeric">{currency.format(booking.price_paid)}</td>
                    <td>
                      <span className={`market-pill ${status.tone}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </MarketPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Categorias                                                          */
/* ------------------------------------------------------------------ */

function CategoriesSection({
  categories,
  loading,
  error,
  canEdit,
}: {
  categories: ProductCategory[];
  loading: boolean;
  error: boolean;
  canEdit: boolean;
}) {
  const saveCategory = useSaveProductCategory();
  const [draft, setDraft] = useState<ProductCategory>(emptyCategory);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const slugTaken = categories.some((category) => category.slug === draft.slug.trim());
  const draftValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim()) && draft.label.trim().length > 0 && !slugTaken;

  const create = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    saveCategory.mutate(
      { ...draft, slug: draft.slug.trim(), label: draft.label.trim(), icon: draft.icon.trim() || 'package' },
      {
        onSuccess: () => {
          setDraft(emptyCategory);
          setFeedback({ tone: 'ok', text: 'Categoria criada.' });
        },
        onError: (error) =>
          setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'Não foi possível criar a categoria.' }),
      },
    );
  };

  return (
    <MarketPanel icon={Tags} title="Categorias" meta={`${formatNumber(categories.length)} cadastrada(s)`}>
      {error ? (
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} /> Não foi possível carregar as categorias.
        </div>
      ) : loading ? (
        <div className="skeleton market-skeleton" />
      ) : categories.length === 0 ? (
        <p className="market-empty">
          <Tags size={20} aria-hidden="true" /> Nenhuma categoria cadastrada
        </p>
      ) : (
        <div className="market-table-wrap">
          <table className="market-table market-category-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Chave</th>
                <th>Ícone</th>
                <th>Ordem</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <CategoryRow
                  key={`${category.slug}-${category.label}-${category.icon}-${category.sort_order}-${category.is_active}`}
                  category={category}
                  canEdit={canEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <form className="market-category-form" onSubmit={create}>
          <label className="market-field">
            <span>Nome</span>
            <input
              required
              value={draft.label}
              onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))}
            />
          </label>
          <label className="market-field">
            <span>Chave</span>
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={draft.slug}
              aria-invalid={slugTaken || undefined}
              onChange={(event) => setDraft((value) => ({ ...value, slug: event.target.value.toLowerCase() }))}
            />
          </label>
          <label className="market-field">
            <span>Ícone</span>
            <input
              required
              value={draft.icon}
              onChange={(event) => setDraft((value) => ({ ...value, icon: event.target.value }))}
            />
          </label>
          <label className="market-field compact">
            <span>Ordem</span>
            <input
              type="number"
              value={draft.sort_order}
              onChange={(event) => setDraft((value) => ({ ...value, sort_order: Number(event.target.value) }))}
            />
          </label>
          <button className="button secondary" type="submit" disabled={saveCategory.isPending || !draftValid}>
            {saveCategory.isPending ? <RefreshCw className="spin" size={16} /> : <Plus size={16} />} Adicionar
          </button>
          <FeedbackLine feedback={slugTaken ? { tone: 'danger', text: 'Chave já usada.' } : feedback} />
        </form>
      )}
    </MarketPanel>
  );
}

function CategoryRow({ category, canEdit }: { category: ProductCategory; canEdit: boolean }) {
  const saveCategory = useSaveProductCategory();
  const [value, setValue] = useState(category);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const dirty =
    value.label !== category.label ||
    value.icon !== category.icon ||
    value.sort_order !== category.sort_order ||
    value.is_active !== category.is_active;
  const valid = value.label.trim().length > 0 && value.icon.trim().length > 0;

  const submit = () => {
    setFeedback(null);
    saveCategory.mutate(value, {
      onSuccess: () => setFeedback({ tone: 'ok', text: 'Categoria salva.' }),
      onError: (error) =>
        setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'Não foi possível salvar.' }),
    });
  };

  return (
    <tr>
      <td>
        <input
          className="of-field"
          value={value.label}
          disabled={!canEdit}
          aria-label={`Nome de ${category.label}`}
          onChange={(event) => setValue((current) => ({ ...current, label: event.target.value }))}
        />
      </td>
      <td>
        <code>{value.slug}</code>
      </td>
      <td>
        <input
          className="of-field"
          value={value.icon}
          disabled={!canEdit}
          aria-label={`Ícone de ${category.label}`}
          onChange={(event) => setValue((current) => ({ ...current, icon: event.target.value }))}
        />
      </td>
      <td>
        <input
          className="of-field market-numeric-input"
          type="number"
          value={value.sort_order}
          disabled={!canEdit}
          aria-label={`Ordem de ${category.label}`}
          onChange={(event) => setValue((current) => ({ ...current, sort_order: Number(event.target.value) }))}
        />
      </td>
      <td>
        <SwitchField
          label={`Categoria ${category.label} ativa`}
          hideLabel
          checked={value.is_active}
          disabled={!canEdit}
          onChange={(next) => setValue((current) => ({ ...current, is_active: next }))}
        />
      </td>
      <td>
        {canEdit && (
          <button
            className="icon-button"
            type="button"
            disabled={saveCategory.isPending || !dirty || !valid}
            aria-label={`Salvar ${category.label}`}
            title={feedback?.text ?? 'Salvar categoria'}
            onClick={submit}
          >
            {saveCategory.isPending ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
          </button>
        )}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Peças compartilhadas                                                */
/* ------------------------------------------------------------------ */

type Feedback = { tone: 'ok' | 'danger'; text: string } | null;

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  if (!feedback) return <span className="market-feedback" aria-hidden="true" />;
  return (
    <p className={`market-feedback ${feedback.tone}`} role={feedback.tone === 'danger' ? 'alert' : 'status'}>
      {feedback.tone === 'ok' ? <Check size={14} /> : <AlertTriangle size={14} />}
      {feedback.text}
    </p>
  );
}

function MarketPanel({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: typeof Megaphone;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="market-panel">
      <header className="market-panel-head">
        <span className="market-panel-icon" aria-hidden="true"><Icon size={17} /></span>
        <h2>{title}</h2>
        {meta && <p>{meta}</p>}
      </header>
      {children}
    </section>
  );
}

function SwitchField({
  label,
  checked,
  disabled,
  hideLabel,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  hideLabel?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`market-switch ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={hideLabel ? label : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="market-switch-track" aria-hidden="true">
        <span className="market-switch-thumb" />
      </span>
      {!hideLabel && <span className="market-switch-label">{label}</span>}
    </label>
  );
}

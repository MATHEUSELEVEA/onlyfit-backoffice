import { AlertTriangle, Megaphone, Plus, RefreshCw, Save, ShoppingBag } from 'lucide-react';
import { FormEvent, useState } from 'react';
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

const defaults: MarketAlgorithmInput = {
  mode: 'algorithm',
  weight_affinity: 0.30,
  weight_sales: 0.25,
  weight_rating: 0.15,
  weight_novelty: 0.20,
  weight_exploration: 0.10,
  diversity_seller_penalty: 0.12,
  diversity_category_penalty: 0.06,
  novelty_half_life_hours: 168,
  penalty_already_owned: 0.40,
};

const fields: Array<{ key: keyof Omit<MarketAlgorithmInput, 'mode'>; label: string; step: number }> = [
  { key: 'weight_affinity', label: 'Afinidade', step: 0.01 },
  { key: 'weight_sales', label: 'Vendas', step: 0.01 },
  { key: 'weight_rating', label: 'Avaliação', step: 0.01 },
  { key: 'weight_novelty', label: 'Novidade', step: 0.01 },
  { key: 'weight_exploration', label: 'Exploração', step: 0.01 },
  { key: 'diversity_seller_penalty', label: 'Diversidade por vendedor', step: 0.01 },
  { key: 'diversity_category_penalty', label: 'Diversidade por categoria', step: 0.01 },
  { key: 'novelty_half_life_hours', label: 'Meia-vida da novidade (horas)', step: 1 },
  { key: 'penalty_already_owned', label: 'Penalidade de item já adquirido', step: 0.01 },
];

const emptyCategory: ProductCategory = {
  slug: '', label: '', icon: 'package', sort_order: 100, is_active: true,
};

export function MarketSettingsPage() {
  const { data: role } = useCurrentStaffRole();
  const canEdit = role === 'super_admin' || role === 'admin';
  const settings = useMarketAlgorithmSettings();
  const categories = useProductCategories();
  const adInventory = useAdInventory();
  const adBookings = useAdBookings();
  const setSettings = useSetMarketAlgorithmSettings();
  const saveCategory = useSaveProductCategory();
  const [form, setForm] = useState<MarketAlgorithmInput>(defaults);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<ProductCategory>(emptyCategory);
  const [message, setMessage] = useState<string | null>(null);

  const settingsStamp = settings.data?.updated_at ?? (settings.data ? 'loaded' : null);
  if (settings.data && settingsStamp !== hydratedFor) {
    setForm({
      mode: settings.data.mode,
      weight_affinity: settings.data.weight_affinity,
      weight_sales: settings.data.weight_sales,
      weight_rating: settings.data.weight_rating,
      weight_novelty: settings.data.weight_novelty,
      weight_exploration: settings.data.weight_exploration,
      diversity_seller_penalty: settings.data.diversity_seller_penalty,
      diversity_category_penalty: settings.data.diversity_category_penalty,
      novelty_half_life_hours: settings.data.novelty_half_life_hours,
      penalty_already_owned: settings.data.penalty_already_owned,
    });
    setHydratedFor(settingsStamp);
  }

  const saveAlgorithm = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const numericValues = fields.map(({ key }) => form[key]);
    if (numericValues.some((value) => !Number.isFinite(value) || value < 0) || form.novelty_half_life_hours <= 0) {
      setMessage('Confira os valores informados.');
      return;
    }
    setSettings.mutate(form, {
      onSuccess: () => setMessage('Algoritmo do mercado atualizado.'),
      onError: () => setMessage('Não foi possível atualizar o algoritmo.'),
    });
  };

  const createCategory = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    saveCategory.mutate(newCategory, {
      onSuccess: () => {
        setNewCategory(emptyCategory);
        setMessage('Categoria salva.');
      },
      onError: () => setMessage('Não foi possível salvar a categoria.'),
    });
  };

  return <>
    <header className="page-header">
      <div>
        <p className="section-label">Configuração</p>
        <h1>Mercado</h1>
        <span>Ranking do catálogo e categorias dos produtos físicos.</span>
      </div>
      <div className="header-actions">
        <button className="button secondary" type="button" onClick={() => { void settings.refetch(); void categories.refetch(); void adInventory.refetch(); void adBookings.refetch(); }}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>
    </header>

    <section className="content feed-page">
      {(settings.isError || categories.isError) && <div className="inline-alert danger" role="alert">
        <AlertTriangle size={18} /> Não foi possível carregar a configuração do mercado.
      </div>}
      {message && <div className="inline-alert" role="status">{message}</div>}

      <AdvertisingControl
        inventory={adInventory.data ?? []}
        bookings={adBookings.data?.items ?? []}
        loading={adInventory.isLoading || adBookings.isLoading}
        error={adInventory.isError || adBookings.isError}
        canEdit={canEdit}
      />

      <form className="feed-form" onSubmit={saveAlgorithm}>
        <section className="feed-command-panel">
          <div className="feed-command-head"><div><span>Descoberta</span><h2>Algoritmo do catálogo</h2></div><ShoppingBag size={20} /></div>
          <fieldset className="feed-mode" disabled={!canEdit || settings.isLoading}>
            <label className={`feed-mode-option ${form.mode === 'algorithm' ? 'selected' : ''}`}>
              <input type="radio" checked={form.mode === 'algorithm'} onChange={() => setForm((value) => ({ ...value, mode: 'algorithm' }))} />
              <div><strong>Algoritmo</strong><span>Combina sinais e diversidade.</span></div>
            </label>
            <label className={`feed-mode-option ${form.mode === 'random' ? 'selected' : ''}`}>
              <input type="radio" checked={form.mode === 'random'} onChange={() => setForm((value) => ({ ...value, mode: 'random' }))} />
              <div><strong>Aleatório</strong><span>Ordem estável por usuário e dia.</span></div>
            </label>
          </fieldset>
          <div className="feed-fields-grid">
            {fields.map((field) => <label className="feed-number-field" key={field.key}>
              <span>{field.label}</span>
              <input type="number" min={field.key === 'novelty_half_life_hours' ? field.step : 0} step={field.step} value={form[field.key]}
                disabled={!canEdit || form.mode === 'random'}
                onChange={(event) => setForm((value) => ({ ...value, [field.key]: Number(event.target.value) }))} />
            </label>)}
          </div>
          {canEdit && <button className="button primary" type="submit" disabled={setSettings.isPending}>
            <Save size={16} /> Salvar algoritmo
          </button>}
        </section>
      </form>

      <section className="feed-command-panel">
        <div className="feed-command-head"><div><span>Produtos físicos</span><h2>Categorias</h2></div></div>
        <div className="table-wrap">
          <table><thead><tr><th>Categoria</th><th>Chave</th><th>Ícone</th><th>Ordem</th><th>Estado</th><th /></tr></thead>
            <tbody>{categories.data?.map((category) => <CategoryRow key={`${category.slug}-${category.label}-${category.icon}-${category.sort_order}-${category.is_active}`} category={category} canEdit={canEdit} onSave={(value) => saveCategory.mutate(value)} saving={saveCategory.isPending} />)}</tbody>
          </table>
        </div>
        {canEdit && <form className="feed-fields-grid" onSubmit={createCategory}>
          <label className="feed-number-field"><span>Chave</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={newCategory.slug} onChange={(e) => setNewCategory((value) => ({ ...value, slug: e.target.value.toLowerCase() }))} /></label>
          <label className="feed-number-field"><span>Nome</span><input required value={newCategory.label} onChange={(e) => setNewCategory((value) => ({ ...value, label: e.target.value }))} /></label>
          <label className="feed-number-field"><span>Ícone</span><input required value={newCategory.icon} onChange={(e) => setNewCategory((value) => ({ ...value, icon: e.target.value }))} /></label>
          <label className="feed-number-field"><span>Ordem</span><input type="number" value={newCategory.sort_order} onChange={(e) => setNewCategory((value) => ({ ...value, sort_order: Number(e.target.value) }))} /></label>
          <button className="button secondary" type="submit" disabled={saveCategory.isPending}><Plus size={16} /> Adicionar</button>
        </form>}
      </section>
    </section>
  </>;
}

function AdvertisingControl({ inventory, bookings, loading, error, canEdit }: {
  inventory: AdPlacement[];
  bookings: AdBooking[];
  loading: boolean;
  error: boolean;
  canEdit: boolean;
}) {
  return <section className="feed-command-panel">
    <div className="feed-command-head"><div><span>Publicidade</span><h2>Destaques pagos</h2></div><Megaphone size={20} /></div>
    {error ? <div className="inline-alert danger" role="alert"><AlertTriangle size={18} /> Não foi possível carregar o inventário de anúncios.</div> : null}
    {loading ? <p>Carregando inventário…</p> : (
      <div className="feed-fields-grid">
        {inventory.map((placement) => <AdPlacementEditor
          key={`${placement.slug}-${placement.max_slots}-${placement.is_active}-${placement.packages.map((item) => `${item.id}:${item.price}:${item.is_active}`).join('|')}`}
          placement={placement}
          canEdit={canEdit}
        />)}
      </div>
    )}

    <div className="table-wrap">
      <table>
        <thead><tr><th>Oferta</th><th>Comprador</th><th>Posição</th><th>Período</th><th>Valor</th><th>Estado</th></tr></thead>
        <tbody>{bookings.length ? bookings.map((booking) => <tr key={booking.id}>
          <td>{booking.offering_name}</td>
          <td>{booking.purchaser_name}</td>
          <td>{placementName(booking.placement)}</td>
          <td>{booking.duration_days} dias</td>
          <td>{formatCurrency(booking.price_paid)}</td>
          <td><span className="status-pill">{bookingStatus(booking.status)}</span></td>
        </tr>) : <tr><td colSpan={6}>Nenhuma campanha contratada.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}

function AdPlacementEditor({ placement, canEdit }: { placement: AdPlacement; canEdit: boolean }) {
  const savePlacement = useSetAdPlacement();
  const savePackage = useSetAdPackage();
  const [maxSlots, setMaxSlots] = useState(placement.max_slots);
  const [active, setActive] = useState(placement.is_active);
  const [message, setMessage] = useState<string | null>(null);

  const savePlacementSettings = () => {
    setMessage(null);
    savePlacement.mutate({ slug: placement.slug, max_slots: maxSlots, is_active: active }, {
      onSuccess: () => setMessage('Posição salva.'),
      onError: () => setMessage('Não foi possível salvar a posição.'),
    });
  };

  return <article className="feed-mode-option selected">
    <div style={{ width: '100%' }}>
      <strong>{placement.name}</strong>
      <span>{placement.occupied_slots} ocupada(s) · {placement.reserved_slots} reservada(s) · {placement.max_slots} vaga(s)</span>
      <div className="feed-fields-grid" style={{ marginTop: 12 }}>
        <label className="feed-number-field"><span>Limite de vagas</span><input type="number" min={0} max={100} value={maxSlots} disabled={!canEdit} onChange={(event) => setMaxSlots(Number(event.target.value))} /></label>
        <label><input type="checkbox" checked={active} disabled={!canEdit} onChange={(event) => setActive(event.target.checked)} /> {active ? 'Posição ativa' : 'Posição inativa'}</label>
      </div>
      {canEdit ? <button className="button secondary" type="button" disabled={savePlacement.isPending || maxSlots < 0 || maxSlots > 100} onClick={savePlacementSettings}><Save size={16} /> Salvar posição</button> : null}
      <div className="table-wrap" style={{ marginTop: 12 }}><table><thead><tr><th>Duração</th><th>Preço</th><th>Disponível</th><th /></tr></thead><tbody>
        {placement.packages.map((item) => <AdPackageRow key={`${item.id}-${item.price}-${item.is_active}`} item={item} canEdit={canEdit} saving={savePackage.isPending} onSave={(value) => savePackage.mutate(value, { onSuccess: () => setMessage('Pacote salvo.'), onError: () => setMessage('Informe um preço válido antes de ativar.') })} />)}
      </tbody></table></div>
      {message ? <span role="status">{message}</span> : null}
    </div>
  </article>;
}

function AdPackageRow({ item, canEdit, saving, onSave }: {
  item: AdPackage;
  canEdit: boolean;
  saving: boolean;
  onSave: (value: AdPackage) => void;
}) {
  const [price, setPrice] = useState(item.price == null ? '' : String(item.price));
  const [active, setActive] = useState(item.is_active);
  const numericPrice = Number(price.replace(',', '.'));
  return <tr>
    <td>{item.duration_days} dias</td>
    <td><input className="of-field" inputMode="decimal" placeholder="0,00" value={price} disabled={!canEdit} onChange={(event) => setPrice(event.target.value.replace(/[^\d,.]/g, ''))} /></td>
    <td><label><input type="checkbox" checked={active} disabled={!canEdit || !(numericPrice > 0)} onChange={(event) => setActive(event.target.checked)} /> {active ? 'Ativo' : 'Inativo'}</label></td>
    <td>{canEdit ? <button className="icon-button" type="button" disabled={saving || !(numericPrice > 0)} onClick={() => onSave({ ...item, price: numericPrice, is_active: active })} aria-label={`Salvar pacote de ${item.duration_days} dias`}><Save size={16} /></button> : null}</td>
  </tr>;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const placementName = (value: string) => value === 'sponsor_carousel' ? 'Carrossel de patrocinadores' : 'Produtos em destaque';
const bookingStatus = (value: string) => ({ pending: 'Pendente', active: 'Ativa', expired: 'Encerrada', failed: 'Falhou', refunded: 'Reembolsada' }[value] ?? value);

function CategoryRow({ category, canEdit, onSave, saving }: { category: ProductCategory; canEdit: boolean; onSave: (value: ProductCategory) => void; saving: boolean }) {
  const [value, setValue] = useState(category);
  return <tr>
    <td><input className="of-field" value={value.label} disabled={!canEdit} onChange={(e) => setValue((current) => ({ ...current, label: e.target.value }))} /></td>
    <td><code>{value.slug}</code></td>
    <td><input className="of-field" value={value.icon} disabled={!canEdit} onChange={(e) => setValue((current) => ({ ...current, icon: e.target.value }))} /></td>
    <td><input className="of-field" type="number" value={value.sort_order} disabled={!canEdit} onChange={(e) => setValue((current) => ({ ...current, sort_order: Number(e.target.value) }))} /></td>
    <td><label><input type="checkbox" checked={value.is_active} disabled={!canEdit} onChange={(e) => setValue((current) => ({ ...current, is_active: e.target.checked }))} /> {value.is_active ? 'Ativa' : 'Inativa'}</label></td>
    <td>{canEdit && <button className="icon-button" type="button" disabled={saving} onClick={() => onSave(value)} aria-label={`Salvar ${value.label}`}><Save size={16} /></button>}</td>
  </tr>;
}

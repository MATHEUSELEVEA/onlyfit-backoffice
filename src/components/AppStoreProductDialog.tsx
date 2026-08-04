import { AlertTriangle, RefreshCw, Save, ShoppingBag, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useUpsertAppStoreProduct } from '../hooks/useOfferingCatalog';
import type {
  AppStoreProductStatus,
  AppStoreProductType,
  OfferingCatalogItem,
} from '../lib/offeringCatalog';

type Props = {
  item: OfferingCatalogItem;
  onCancel: () => void;
  onSaved: () => void;
};

export function AppStoreProductDialog({ item, onCancel, onSaved }: Props) {
  const expectedType: AppStoreProductType = item.billing_type === 'recurring'
    ? 'auto_renewable_subscription'
    : 'non_consumable';
  const [productId, setProductId] = useState(item.app_store_product_id ?? '');
  const [status, setStatus] = useState<AppStoreProductStatus>(item.app_store_product_status ?? 'pending');
  const [price, setPrice] = useState(String(item.ios_price ?? ''));
  const [group, setGroup] = useState(item.app_store_subscription_group ?? '');
  const [error, setError] = useState('');
  const mutation = useUpsertAppStoreProduct();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const parsedPrice = price.trim() ? Number(price.replace(',', '.')) : null;
    if (!productId.trim()) {
      setError('Informe o Product ID criado no App Store Connect.');
      return;
    }
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      setError('Informe um preço válido.');
      return;
    }
    try {
      await mutation.mutateAsync({
        offeringId: item.business_offering_id!,
        productId: productId.trim(),
        productType: expectedType,
        status,
        appStorePrice: parsedPrice,
        currency: item.currency || 'BRL',
        subscriptionGroupReference: expectedType === 'auto_renewable_subscription'
          ? group.trim() || null
          : null,
      });
      onSaved();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Não foi possível salvar.');
    }
  }

  return (
    <>
      <button className="scrim" type="button" aria-label="Fechar" onClick={onCancel} />
      <form className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="app-store-product-title" onSubmit={submit}>
        <header className="user-dialog-head">
          <div className="status-icon"><ShoppingBag size={22} /></div>
          <div>
            <h2 id="app-store-product-title">Produto Apple</h2>
            <p>{item.name}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Fechar" onClick={onCancel} disabled={mutation.isPending}>
            <X size={18} />
          </button>
        </header>

        <section className="user-dialog-body">
          <label className="user-dialog-field">
            <span>Product ID</span>
            <input
              value={productId}
              autoComplete="off"
              spellCheck={false}
              placeholder="com.onlyfitapp.app.oferta"
              onChange={(event) => setProductId(event.target.value)}
            />
          </label>
          <label className="user-dialog-field">
            <span>Tipo</span>
            <input value={expectedType === 'auto_renewable_subscription' ? 'Assinatura renovável' : 'Compra única'} disabled />
          </label>
          <label className="user-dialog-field">
            <span>Preço na Apple</span>
            <input
              inputMode="decimal"
              value={price}
              placeholder="39,90"
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          {expectedType === 'auto_renewable_subscription' && (
            <label className="user-dialog-field">
              <span>Grupo de assinatura</span>
              <input value={group} onChange={(event) => setGroup(event.target.value)} />
            </label>
          )}
          <label className="user-dialog-field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as AppStoreProductStatus)}>
              <option value="pending">Pendente</option>
              <option value="ready">Disponível no app</option>
              <option value="retired">Retirado</option>
            </select>
          </label>
          {error && <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />{error}</div>}
        </section>

        <footer className="user-dialog-actions">
          <button className="button secondary" type="button" onClick={onCancel} disabled={mutation.isPending}>Cancelar</button>
          <button className="button primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
            Salvar
          </button>
        </footer>
      </form>
    </>
  );
}

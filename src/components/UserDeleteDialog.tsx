import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrencyExact, formatNumber } from '../lib/format';
import { displayName, tableLabel, userAdminErrorMessage, type UserOverview } from '../lib/users';
import { useDeleteUserAccount, useUserFootprint } from '../hooks/useUsers';

const VISIBLE_ITEMS = 12;

export function UserDeleteDialog({
  overview,
  onCancel,
  onDeleted,
}: {
  overview: UserOverview;
  onCancel: () => void;
  onDeleted: (summary: string) => void;
}) {
  const profile = overview.profile;
  const name = displayName(profile);
  const handle = profile.username ? `@${profile.username}` : profile.email ?? profile.id;
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const footprintQuery = useUserFootprint(profile.id, true);
  const deleteMutation = useDeleteUserAccount();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleteMutation.isPending) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, deleteMutation.isPending]);

  const footprint = footprintQuery.data;
  const items = useMemo(() => footprint?.items ?? [], [footprint]);
  const visible = items.slice(0, VISIBLE_ITEMS);
  const hidden = Math.max(0, items.length - VISIBLE_ITEMS);
  const financeRows = overview.finance;
  const hasFinance = (financeRows.purchases_count ?? 0) > 0
    || (financeRows.sales_count ?? 0) > 0
    || (financeRows.wallet_entries ?? 0) > 0;

  const confirmed = confirmation.trim().toLowerCase() === handle.toLowerCase();

  const submit = () => {
    if (!confirmed || deleteMutation.isPending) return;
    setError('');
    deleteMutation.mutate(
      { userId: profile.id, reason: reason.trim() || null },
      {
        onSuccess: (result) => {
          const purged = result.purge?.purged ?? {};
          const rows = Object.values(purged).reduce((sum, value) => sum + value, 0);
          onDeleted(
            `Conta de ${name} excluída. ${formatNumber(rows)} registro(s) removidos diretamente, `
            + `${formatNumber(result.healthDocumentsRemoved)} documento(s) de saúde apagados do armazenamento `
            + 'e todo o conteúdo vinculado saiu junto.',
          );
        },
        onError: (mutationError) => setError(userAdminErrorMessage(mutationError)),
      },
    );
  };

  return (
    <>
      <button className="scrim" type="button" aria-label="Fechar" onClick={() => !deleteMutation.isPending && onCancel()} />
      <div className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="user-delete-title">
        <header className="user-dialog-head">
          <div className="status-icon danger"><AlertTriangle size={22} /></div>
          <div>
            <h2 id="user-delete-title">Excluir a conta de {name}?</h2>
            <p>
              A exclusão é definitiva e apaga o usuário e tudo que existe em nome dele: posts, comunidades,
              desafios, negócios, ofertas, cursos, treinos, mensagens, dados de saúde e registros financeiros.
              Não há como desfazer.
            </p>
          </div>
          <button className="icon-button" type="button" aria-label="Fechar" onClick={onCancel} disabled={deleteMutation.isPending}>
            <X size={18} />
          </button>
        </header>

        <section className="user-dialog-body">
          {footprintQuery.isLoading ? (
            <div className="skeleton user-footprint-skeleton" />
          ) : footprintQuery.isError ? (
            <div className="inline-alert danger" role="alert">
              <AlertTriangle size={18} />
              Não foi possível levantar o que existe em nome desta conta. Sem esse retrato, não conclua a exclusão.
            </div>
          ) : (
            <>
              <p className="user-dialog-total">
                <strong>{formatNumber(footprint?.total_rows ?? 0)}</strong> registro(s) em{' '}
                <strong>{formatNumber(items.length)}</strong> tabela(s) da plataforma.
              </p>
              <ul className="user-footprint-list">
                {visible.map((item) => (
                  <li key={`${item.table}.${item.column}`}>
                    <span>{tableLabel(item.table)}</span>
                    <strong>
                      {formatNumber(item.rows)}{item.capped ? '+' : ''}
                      <small>{item.effect === 'unlink' ? 'desvincula' : 'apaga'}</small>
                    </strong>
                  </li>
                ))}
              </ul>
              {hidden > 0 && <p className="muted-copy">e mais {formatNumber(hidden)} tabela(s) com registros desta conta.</p>}
            </>
          )}

          {hasFinance && (
            <div className="inline-alert danger" role="note">
              <AlertTriangle size={18} />
              <span>
                Há histórico financeiro: {formatNumber(financeRows.purchases_count ?? 0)} compra(s) de{' '}
                {formatCurrencyExact(financeRows.purchases_paid_value ?? 0)} e {formatNumber(financeRows.sales_count ?? 0)}{' '}
                venda(s) de {formatCurrencyExact(financeRows.sales_paid_value ?? 0)}. Transações, lançamentos contábeis e
                extrato da carteira também serão apagados, o que altera relatórios já fechados.
              </span>
            </div>
          )}

          <label className="user-dialog-field">
            <span>Digite <b>{handle}</b> para confirmar</span>
            <input
              ref={inputRef}
              value={confirmation}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setConfirmation(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
            />
          </label>

          <label className="user-dialog-field">
            <span>Motivo (fica registrado na auditoria)</span>
            <input
              value={reason}
              maxLength={200}
              placeholder="ex.: solicitação do titular, conta fraudulenta"
              onChange={(event) => setReason(event.target.value)}
            />
          </label>

          {error && <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />{error}</div>}
        </section>

        <footer className="user-dialog-actions">
          <button className="button secondary" type="button" onClick={onCancel} disabled={deleteMutation.isPending}>
            Cancelar
          </button>
          <button
            className="button danger"
            type="button"
            onClick={submit}
            disabled={!confirmed || deleteMutation.isPending || footprintQuery.isLoading || footprintQuery.isError}
          >
            {deleteMutation.isPending ? <RefreshCw className="spin" size={16} /> : <Trash2 size={16} />}
            Excluir tudo desta conta
          </button>
        </footer>
      </div>
    </>
  );
}

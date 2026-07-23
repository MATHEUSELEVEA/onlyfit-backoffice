import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  KeyRound,
  ReceiptText,
  RefreshCw,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { formatCurrencyExact, formatDateTime } from '../lib/format';
import { supabase } from '../lib/supabase';
import { payoutStatusLabel, type PayoutRequest } from '../lib/payouts';
import {
  transactionStatusLabel,
  type SettlementStatus,
  type TransactionStatus,
} from '../lib/paymentTransactions';
import type { AsaasEnvironment } from '../lib/asaasIntegration';
import {
  usePayoutQueueDay,
  usePayoutQueueDays,
  useApprovePayout,
  useCreatePayoutBatch,
  useFailManualPayout,
  useFinalizeManualPayout,
  useRecordManualPayout,
  useRejectPayout,
  useReversePaidPayout,
} from '../hooks/usePayoutQueue';
import { usePaymentTransactions } from '../hooks/usePaymentTransactions';
import { useAsaasIntegrationStatus, useSetAsaasCredentials } from '../hooks/useAsaasIntegration';
import { useFinancialReconciliationRuns, useRecordTreasuryMovement, useRunFinancialReconciliation } from '../hooks/useFinancialReconciliation';

function formatDay(value: string): string {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR', { dateStyle: 'medium' });
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function FinancialReconciliationPanel({ canEdit }: { canEdit: boolean }) {
  const today = useMemo(() => isoDate(new Date()), []);
  const weekAgo = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() - 7);
    return isoDate(value);
  }, []);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [treasuryDirection, setTreasuryDirection] = useState<'invest' | 'redeem'>('invest');
  const [treasuryAmount, setTreasuryAmount] = useState('');
  const [treasuryReference, setTreasuryReference] = useState('');
  const runs = useFinancialReconciliationRuns();
  const run = useRunFinancialReconciliation();
  const treasury = useRecordTreasuryMovement();
  const parsedTreasuryAmount = Number(treasuryAmount.replace(',', '.'));

  return (
    <section className="staff-list-section" aria-labelledby="financial-reconciliation-title">
      <div className="section-heading">
        <div>
          <h2 id="financial-reconciliation-title">Conciliação financeira</h2>
          <p>Compara o extrato Asaas com o livro razão e abre exceções para revisão.</p>
        </div>
        {canEdit ? (
          <div className="header-actions">
            <label><span className="sr-only">Início</span><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
            <label><span className="sr-only">Fim</span><input type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} /></label>
            <button className="button" type="button" disabled={run.isPending || !from || !to || from > to} onClick={() => run.mutate({ from, to })}>
              <ReceiptText size={16} />
              Conciliar período
            </button>
          </div>
        ) : null}
      </div>
      {run.isError ? <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />Não foi possível executar a conciliação.</div> : null}
      {canEdit ? <form className="staff-form" onSubmit={(event) => {
        event.preventDefault();
        if (!Number.isFinite(parsedTreasuryAmount) || parsedTreasuryAmount <= 0 || !treasuryReference.trim()) return;
        treasury.mutate({ direction: treasuryDirection, amount: parsedTreasuryAmount, reference: treasuryReference.trim() }, {
          onSuccess: () => { setTreasuryAmount(''); setTreasuryReference(''); },
        });
      }}>
        <label><span>Tesouraria</span><select value={treasuryDirection} onChange={(event) => setTreasuryDirection(event.target.value as 'invest' | 'redeem')}><option value="invest">Aplicar liquidez</option><option value="redeem">Resgatar liquidez</option></select></label>
        <label><span>Valor (R$)</span><input inputMode="decimal" value={treasuryAmount} onChange={(event) => setTreasuryAmount(event.target.value.replace(/[^\d,.]/g, ''))} /></label>
        <label><span>Referência bancária</span><input value={treasuryReference} maxLength={128} onChange={(event) => setTreasuryReference(event.target.value)} /></label>
        <button className="button secondary" type="submit" disabled={treasury.isPending || !Number.isFinite(parsedTreasuryAmount) || parsedTreasuryAmount <= 0 || !treasuryReference.trim()}>Registrar</button>
      </form> : null}
      {treasury.isError ? <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />Não foi possível registrar a movimentação de tesouraria.</div> : null}
      {runs.isLoading ? <div className="skeleton staff-skeleton" /> : runs.data?.length ? (
        <div className="table-wrapper"><table className="staff-table"><thead><tr><th>Período</th><th>Status</th><th>Exceções</th><th>Executada</th></tr></thead><tbody>
          {runs.data.map((item) => <tr key={item.id}><td>{formatDay(item.period_start)} a {formatDay(item.period_end)}</td><td><span className={`role-badge role-${item.status}`}>{item.status === 'completed' ? 'Concluída' : item.status === 'failed' ? 'Falhou' : 'Aberta'}</span></td><td>{item.exception_count}</td><td>{formatDateTime(new Date(item.created_at))}</td></tr>)}
        </tbody></table></div>
      ) : <p className="muted-copy">Nenhuma conciliação executada.</p>}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Fila de liquidação (§12)
// -----------------------------------------------------------------------------
export function PayoutQueuePanel({ canEdit }: { canEdit: boolean }) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [recordingPayoutId, setRecordingPayoutId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  const daysQuery = usePayoutQueueDays(true);
  const dayQuery = usePayoutQueueDay(openDay);
  const approveMutation = useApprovePayout();
  const createBatchMutation = useCreatePayoutBatch();
  const recordMutation = useRecordManualPayout();
  const finalizeMutation = useFinalizeManualPayout();
  const rejectMutation = useRejectPayout();
  const failMutation = useFailManualPayout();
  const reverseMutation = useReversePaidPayout();

  const requests = useMemo(() => dayQuery.data ?? [], [dayQuery.data]);
  const selectableIds = useMemo(
    () => requests.filter((r) => r.status === 'approved' && !r.batch_id).map((r) => r.id),
    [requests],
  );
  const selectedIds = selectableIds.filter((id) => selected[id]);

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAll() {
    if (selectedIds.length === selectableIds.length) {
      setSelected({});
    } else {
      setSelected(Object.fromEntries(selectableIds.map((id) => [id, true])));
    }
  }

  async function createBatch() {
    if (!selectedIds.length) return;
    const total = requests
      .filter((r) => selectedIds.includes(r.id))
      .reduce((sum, r) => sum + r.amount, 0);
    if (!window.confirm(`Criar lote manual com ${selectedIds.length} resgate(s), total ${formatCurrencyExact(total)}?`)) return;
    await createBatchMutation.mutateAsync(selectedIds);
    setSelected({});
  }

  async function recordManualPayment(request: PayoutRequest) {
    if (!paymentProof || !paymentReference.trim()) {
      window.alert('Informe a referência bancária e anexe o comprovante.');
      return;
    }
    const extension = paymentProof.name.split('.').pop()?.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'bin';
    const proofPath = `payout/${request.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('payout-proofs')
      .upload(proofPath, paymentProof, { contentType: paymentProof.type, upsert: false });
    if (uploadError) throw uploadError;
    await recordMutation.mutateAsync({
      payoutId: request.id,
      paymentReference: paymentReference.trim(),
      paymentProofPath: proofPath,
    });
    setRecordingPayoutId(null);
    setPaymentReference('');
    setPaymentProof(null);
  }

  async function runReject(request: PayoutRequest) {
    const reason = window.prompt(`Motivo da rejeição do resgate de ${request.professional_name} (${formatCurrencyExact(request.amount)}):`);
    if (reason == null) return;
    if (!reason.trim()) {
      window.alert('Informe um motivo para rejeitar.');
      return;
    }
    await rejectMutation.mutateAsync({ payoutId: request.id, reason: reason.trim() });
    setSelected((prev) => ({ ...prev, [request.id]: false }));
  }

  async function runFailure(request: PayoutRequest) {
    const reason = window.prompt(`Motivo da falha do pagamento de ${request.professional_name} (${formatCurrencyExact(request.amount)}):`);
    if (reason == null) return;
    if (!reason.trim()) {
      window.alert('Informe um motivo para registrar a falha.');
      return;
    }
    await failMutation.mutateAsync({ payoutId: request.id, reason: reason.trim() });
  }

  async function runReversal(request: PayoutRequest) {
    const reason = window.prompt(`Motivo da reversão do repasse de ${request.professional_name} (${formatCurrencyExact(request.amount)}):`);
    if (reason == null) return;
    if (!reason.trim()) {
      window.alert('Informe um motivo para registrar a reversão.');
      return;
    }
    await reverseMutation.mutateAsync({ payoutId: request.id, reason: reason.trim() });
  }

  const days = daysQuery.data ?? [];

  return (
    <section className="staff-list-section" aria-labelledby="payout-queue-title">
      <div className="section-heading">
        <div>
          <h2 id="payout-queue-title">Fila de liquidação</h2>
          <p>Resgates manuais por dia de liquidação. A aprovação, a evidência bancária e a baixa são auditadas.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => daysQuery.refetch()} disabled={daysQuery.isFetching}>
          <RefreshCw className={daysQuery.isFetching ? 'spin' : ''} size={16} />
          Atualizar
        </button>
      </div>

      {daysQuery.isError ? (
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} />
          Não foi possível carregar a fila de liquidação.
        </div>
      ) : daysQuery.isLoading ? (
        <div className="skeleton staff-skeleton" />
      ) : days.length === 0 ? (
        <div className="access-panel inline-access" role="status">
          <div className="status-icon"><HandCoins size={24} /></div>
          <div>
            <h2>Nenhum resgate pendente</h2>
            <p>Quando um profissional solicitar resgate, o dia de liquidação aparece aqui com o total a liquidar.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Dia de liquidação</th>
                <th>Aguardando</th>
                <th>Aprovados</th>
                <th>Registrado</th>
                <th>Total a liquidar</th>
                <th><span className="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.settlement_date}>
                  <td><strong>{formatDay(day.settlement_date)}</strong></td>
                  <td>{day.pending_count} · {formatCurrencyExact(day.pending_amount)}</td>
                  <td>{day.approved_count} · {formatCurrencyExact(day.approved_amount)}</td>
                  <td>{day.payment_recorded_count} · {formatCurrencyExact(day.payment_recorded_amount)}</td>
                  <td><strong>{formatCurrencyExact(day.actionable_amount)}</strong></td>
                  <td>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => { setOpenDay(day.settlement_date); setSelected({}); }}
                    >
                      Abrir dia
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openDay ? (
        <div className="section-heading" style={{ marginTop: '1.5rem' }}>
          <div>
            <h2>Dia {formatDay(openDay)}</h2>
            <p>{requests.length} solicitação(ões). {selectableIds.length} aprovada(s) sem lote.</p>
          </div>
          <div className="header-actions">
            <button className="button secondary" type="button" onClick={() => setOpenDay(null)}>Fechar</button>
            {canEdit ? (
              <button
                className="button"
                type="button"
                onClick={createBatch}
                disabled={!selectedIds.length || createBatchMutation.isPending}
              >
                <CheckCircle2 size={16} />
                Criar lote ({selectedIds.length})
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {openDay && (approveMutation.isError || createBatchMutation.isError || recordMutation.isError || finalizeMutation.isError || rejectMutation.isError || failMutation.isError || reverseMutation.isError) ? (
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} />
          Não foi possível registrar a ação financeira. Confira o status, a evidência e tente novamente.
        </div>
      ) : null}

      {openDay ? (
        dayQuery.isLoading ? (
          <div className="skeleton staff-skeleton" />
        ) : (
          <div className="table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  {canEdit ? (
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Selecionar todos"
                        checked={selectableIds.length > 0 && selectedIds.length === selectableIds.length}
                        onChange={toggleAll}
                        disabled={!selectableIds.length}
                      />
                    </th>
                  ) : null}
                  <th>Profissional</th>
                  <th>Valor</th>
                  <th>PIX (CPF)</th>
                  <th>Status</th>
                  <th>Solicitado</th>
                  <th><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const selectable = request.status === 'approved' && !request.batch_id;
                  return (
                    <tr key={request.id}>
                      {canEdit ? (
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${request.professional_name}`}
                            checked={Boolean(selected[request.id])}
                            onChange={() => toggle(request.id)}
                            disabled={!selectable}
                          />
                        </td>
                      ) : null}
                      <td>
                        <strong>{request.professional_name}</strong>
                        <span>{request.professional_username ? `@${request.professional_username}` : request.professional_profile_id.slice(0, 8)}</span>
                      </td>
                      <td><strong>{formatCurrencyExact(request.amount)}</strong></td>
                      <td>•••• {request.pix_key_last4}</td>
                      <td><span className={`role-badge role-${request.status}`}>{payoutStatusLabel(request.status)}</span></td>
                      <td>{request.requested_at ? formatDateTime(new Date(request.requested_at)) : '—'}</td>
                      <td className="staff-actions-cell">
                        {canEdit && request.status === 'pending_approval' ? (
                          <button
                            className="icon-button table-action"
                            type="button"
                            title="Aprovar resgate"
                            aria-label={`Aprovar resgate de ${request.professional_name}`}
                            onClick={() => approveMutation.mutate(request.id)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        ) : null}
                        {canEdit && request.status === 'approved' ? (
                          <button
                            className="icon-button table-action"
                            type="button"
                            title="Registrar pagamento manual"
                            aria-label={`Registrar pagamento manual de ${request.professional_name}`}
                            onClick={() => { setRecordingPayoutId(request.id); setPaymentReference(''); setPaymentProof(null); }}
                          >
                            <Upload size={16} />
                          </button>
                        ) : null}
                        {canEdit && request.status === 'payment_recorded' ? (
                          <button
                            className="icon-button table-action"
                            type="button"
                            title="Confirmar pagamento"
                            aria-label={`Confirmar pagamento de ${request.professional_name}`}
                            onClick={() => finalizeMutation.mutate(request.id)}
                            disabled={finalizeMutation.isPending}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        ) : null}
                        {canEdit && request.status === 'pending_approval' ? (
                          <button
                            className="icon-button table-action"
                            type="button"
                            title="Rejeitar"
                            aria-label={`Rejeitar resgate de ${request.professional_name}`}
                            onClick={() => runReject(request)}
                            disabled={rejectMutation.isPending}
                          >
                            <X size={16} />
                          </button>
                        ) : null}
                        {canEdit && request.status === 'payment_recorded' ? (
                          <button
                            className="icon-button table-action"
                            type="button"
                            title="Registrar falha"
                            aria-label={`Registrar falha do pagamento de ${request.professional_name}`}
                            onClick={() => { void runFailure(request).catch(() => undefined); }}
                            disabled={failMutation.isPending}
                          >
                            <X size={16} />
                          </button>
                        ) : null}
                        {canEdit && request.status === 'paid' ? (
                          <button
                            className="icon-button table-action"
                            type="button"
                            title="Reverter repasse"
                            aria-label={`Reverter repasse de ${request.professional_name}`}
                            onClick={() => { void runReversal(request).catch(() => undefined); }}
                            disabled={reverseMutation.isPending}
                          >
                            <RefreshCw size={16} />
                          </button>
                        ) : null}
                        {request.rejection_reason ? <span title={request.rejection_reason}>Rejeitado</span> : null}
                        {request.failure_reason ? <span title={request.failure_reason}>Falha</span> : null}
                        {recordingPayoutId === request.id ? (
                          <div className="staff-form" style={{ minWidth: '16rem', marginTop: '0.5rem' }}>
                            <label>
                              <span>Referência bancária</span>
                              <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} maxLength={128} />
                            </label>
                            <label>
                              <span>Comprovante</span>
                              <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)} />
                            </label>
                            <div className="header-actions">
                              <button className="button" type="button" onClick={() => { void recordManualPayment(request).catch(() => undefined); }} disabled={recordMutation.isPending}>
                                Registrar
                              </button>
                              <button className="button secondary" type="button" onClick={() => setRecordingPayoutId(null)}>Cancelar</button>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Lista de transações (§17.3)
// -----------------------------------------------------------------------------
const TX_STATUS_OPTIONS: { value: TransactionStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'confirmed', label: 'Autorizada' },
  { value: 'settled', label: 'Liquidada' },
  { value: 'refunded', label: 'Estornada' },
  { value: 'chargeback', label: 'Chargeback' },
  { value: 'failed', label: 'Falhou' },
];

const SETTLE_STATUS_OPTIONS: { value: SettlementStatus | ''; label: string }[] = [
  { value: '', label: 'Toda liquidação' },
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'settled', label: 'Liquidada' },
  { value: 'refunded', label: 'Estornada' },
  { value: 'chargeback', label: 'Chargeback' },
];

const PAGE_SIZE = 50;

export function TransactionsPanel() {
  const [status, setStatus] = useState<TransactionStatus | ''>('');
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus | ''>('');
  const [page, setPage] = useState(0);

  const filters = useMemo(
    () => ({
      status: status || null,
      settlementStatus: settlementStatus || null,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [status, settlementStatus, page],
  );

  const query = usePaymentTransactions(filters, true);
  const data = query.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <section className="staff-list-section" aria-labelledby="transactions-title">
      <div className="section-heading">
        <div>
          <h2 id="transactions-title">Transações</h2>
          <p>Cobranças, liquidações, estornos e chargebacks para auditoria e suporte.</p>
        </div>
        <div className="header-actions">
          <select
            value={status}
            onChange={(event) => { setStatus(event.target.value as TransactionStatus | ''); setPage(0); }}
            aria-label="Filtrar por status"
          >
            {TX_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select
            value={settlementStatus}
            onChange={(event) => { setSettlementStatus(event.target.value as SettlementStatus | ''); setPage(0); }}
            aria-label="Filtrar por liquidação"
          >
            {SETTLE_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <button className="button secondary" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {query.isError ? (
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} />
          Não foi possível carregar as transações.
        </div>
      ) : query.isLoading ? (
        <div className="skeleton staff-skeleton" />
      ) : items.length === 0 ? (
        <div className="access-panel inline-access" role="status">
          <div className="status-icon"><ReceiptText size={24} /></div>
          <div>
            <h2>Nenhuma transação</h2>
            <p>Assim que as cobranças começarem, elas aparecem aqui com valor bruto, taxa, comissão e líquido.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Oferta</th>
                  <th>Profissional</th>
                  <th>Comprador</th>
                  <th>Bruto</th>
                  <th>Taxa Asaas</th>
                  <th>Comissão</th>
                  <th>Líquido prof.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.created_at ? formatDateTime(new Date(tx.created_at)) : '—'}</td>
                    <td>
                      <strong>{tx.offering_name}</strong>
                      <span>{tx.billing_type === 'recurring' ? 'Assinatura' : 'Única'}</span>
                    </td>
                    <td>{tx.professional_name}</td>
                    <td>{tx.buyer_name}</td>
                    <td>{formatCurrencyExact(tx.gross_value)}</td>
                    <td>{tx.asaas_fee != null ? formatCurrencyExact(tx.asaas_fee) : '—'}</td>
                    <td>{tx.platform_commission != null ? formatCurrencyExact(tx.platform_commission) : '—'}</td>
                    <td>{tx.professional_net != null ? formatCurrencyExact(tx.professional_net) : '—'}</td>
                    <td><span className={`role-badge role-${tx.status}`}>{transactionStatusLabel(tx.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="header-actions" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
            <span>{total} transação(ões) · página {page + 1} de {maxPage + 1}</span>
            <button className="button secondary" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Anterior</button>
            <button className="button secondary" type="button" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>Próxima</button>
          </div>
        </>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Integração Asaas — configuração de chaves (WS7)
// -----------------------------------------------------------------------------
function AsaasEnvironmentForm({ environment, canEdit }: { environment: AsaasEnvironment; canEdit: boolean }) {
  const [apiKey, setApiKey] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const mutation = useSetAsaasCredentials();

  async function save() {
    if (!apiKey.trim() && !webhookToken.trim()) return;
    await mutation.mutateAsync({
      environment,
      apiKey: apiKey.trim() || null,
      webhookToken: webhookToken.trim() || null,
    });
    setApiKey('');
    setWebhookToken('');
  }

  if (!canEdit) return null;

  return (
    <form
      className="staff-form"
      style={{ marginTop: '0.75rem' }}
      onSubmit={(event) => { event.preventDefault(); void save(); }}
    >
      <label>
        <span>Nova API key ({environment === 'production' ? 'Produção' : 'Sandbox'})</span>
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="aact_..."
        />
        <small>Fica só no servidor; nunca é exibida depois de salva.</small>
      </label>
      <label>
        <span>Novo token de webhook</span>
        <input
          type="password"
          autoComplete="off"
          value={webhookToken}
          onChange={(event) => setWebhookToken(event.target.value)}
          placeholder="whsec_..."
        />
      </label>
      <div className="header-actions">
        <button
          className="button"
          type="submit"
          disabled={mutation.isPending || (!apiKey.trim() && !webhookToken.trim())}
        >
          <Save size={16} />
          Salvar {environment === 'production' ? 'produção' : 'sandbox'}
        </button>
      </div>
      {mutation.isError ? (
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} />
          Não foi possível salvar as credenciais.
        </div>
      ) : null}
    </form>
  );
}

export function AsaasIntegrationPanel({ canEdit }: { canEdit: boolean }) {
  const query = useAsaasIntegrationStatus(true);
  const environments = query.data ?? [];

  return (
    <section className="staff-list-section" aria-labelledby="asaas-integration-title">
      <div className="section-heading">
        <div>
          <h2 id="asaas-integration-title">Integração Asaas</h2>
          <p>
            As chaves têm prioridade por variável de ambiente (Supabase secret). Configure aqui apenas se precisar
            operar sem redeploy. O valor nunca é exibido — só o status e os últimos dígitos.
          </p>
        </div>
        <button className="button secondary" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} />
          Atualizar
        </button>
      </div>

      {query.isError ? (
        <div className="inline-alert danger" role="alert">
          <AlertTriangle size={18} />
          Não foi possível carregar o status da integração.
        </div>
      ) : query.isLoading ? (
        <div className="skeleton staff-skeleton" />
      ) : (
        <div className="table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Ambiente</th>
                <th>API key</th>
                <th>Token webhook</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {environments.map((env) => (
                <tr key={env.environment}>
                  <td>
                    <strong>{env.environment === 'production' ? 'Produção' : 'Sandbox'}</strong>
                    <span><KeyRound size={12} /> {env.environment}</span>
                  </td>
                  <td>
                    {env.api_key_configured
                      ? <span className="role-badge role-super_admin">Configurada •••• {env.api_key_last4 ?? ''}</span>
                      : <span className="role-badge role-support">Não configurada</span>}
                  </td>
                  <td>
                    {env.webhook_token_configured
                      ? <span className="role-badge role-super_admin">Configurado</span>
                      : <span className="role-badge role-support">Não configurado</span>}
                  </td>
                  <td>{env.updated_at ? formatDateTime(new Date(env.updated_at)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AsaasEnvironmentForm environment="production" canEdit={canEdit} />
      <AsaasEnvironmentForm environment="sandbox" canEdit={canEdit} />
    </section>
  );
}

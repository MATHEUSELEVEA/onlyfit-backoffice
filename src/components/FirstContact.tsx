import { AlertTriangle, CheckCircle2, Clock, MessageSquareOff, RefreshCw, Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { formatDateTime, formatNumber } from '../lib/format';
import { deadlineErrorMessage, waitingLabel } from '../lib/firstContact';
import {
  useContractsWithoutFirstContact,
  useFirstContactSettings,
  useSetFirstContactDeadlines,
} from '../hooks/useFirstContact';
import { useCurrentStaffRole } from '../hooks/useStaffManagement';

type Feedback = { type: 'success' | 'error'; text: string };

const PAGE_SIZE = 50;

/**
 * G11 §2.3 — a fila de escalonamento. Passado o prazo sem o profissional falar
 * com quem contratou, o staff é avisado aqui. Não há penalidade automática à
 * oferta: quem decide o que fazer é quem opera.
 */
export function FirstContactPage() {
  const roleQuery = useCurrentStaffRole();
  const role = roleQuery.data;
  const canEdit = role === 'super_admin' || role === 'admin';

  const settingsQuery = useFirstContactSettings(true);
  const saveMutation = useSetFirstContactDeadlines();

  const [page, setPage] = useState(0);
  // `null` = ainda não editado nesta sessão: o valor exibido é o do banco.
  const [reminderDraft, setReminderDraft] = useState<string | null>(null);
  const [alertDraft, setAlertDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const listQuery = useContractsWithoutFirstContact(PAGE_SIZE, page * PAGE_SIZE, true);
  const settings = settingsQuery.data;
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  const reminderHours = reminderDraft ?? String(settings?.reminder_hours ?? '');
  const alertHours = alertDraft ?? String(settings?.alert_hours ?? '');

  const submitDeadlines = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const reminder = Number(reminderHours);
    const alert = Number(alertHours);
    if (!Number.isInteger(reminder) || !Number.isInteger(alert)) {
      setFeedback({ type: 'error', text: 'Os prazos são em horas inteiras.' });
      return;
    }
    saveMutation.mutate(
      { reminderHours: reminder, alertHours: alert },
      {
        onSuccess: (result) => {
          // Volta a espelhar o banco: o rascunho cumpriu o papel.
          setReminderDraft(null);
          setAlertDraft(null);
          setFeedback({
            type: 'success',
            text: `Lembrete em ${formatNumber(result.reminder_hours)} h e alerta ao cliente em ${formatNumber(result.alert_hours)} h.`,
          });
        },
        onError: (error) => {
          const code =
            error && typeof error === 'object' && 'message' in error
              ? String((error as { message: unknown }).message)
              : 'erro';
          setFeedback({ type: 'error', text: deadlineErrorMessage(code) });
        },
      },
    );
  };

  if (settingsQuery.isLoading) return <div className="skeleton staff-skeleton" />;
  if (settingsQuery.isError) {
    return (
      <div className="inline-alert danger" role="alert">
        <AlertTriangle size={18} />
        Não foi possível carregar os prazos de primeiro contato. Verifique se a migration do G11 foi aplicada.
      </div>
    );
  }

  return (
    <>
      <div className="reports-grid">
        <article className="report-metric">
          <div><span>Sem contato</span><MessageSquareOff size={18} /></div>
          <strong>{formatNumber(total)}</strong>
          <p>Contratos que passaram do prazo</p>
        </article>
        <article className="report-metric">
          <div><span>Lembrete</span><Clock size={18} /></div>
          <strong>{formatNumber(settings?.reminder_hours ?? 0)} h</strong>
          <p>Quando o profissional é lembrado</p>
        </article>
        <article className="report-metric">
          <div><span>Alerta</span><AlertTriangle size={18} /></div>
          <strong>{formatNumber(settings?.alert_hours ?? 0)} h</strong>
          <p>Quando o cliente passa a ver o aviso</p>
        </article>
      </div>

      {feedback && (
        <div className={`inline-alert ${feedback.type === 'error' ? 'danger' : ''}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {feedback.text}
        </div>
      )}

      {canEdit && (
        <section className="staff-create-panel" aria-labelledby="first-contact-deadlines-title">
          <div className="section-heading">
            <div>
              <h2 id="first-contact-deadlines-title">Prazos de primeiro contato</h2>
              <p>Contados da confirmação da contratação. O alerta não pode vir antes do lembrete.</p>
            </div>
          </div>
          <form className="invite-add-form" onSubmit={submitDeadlines}>
            <label className="user-field">
              <span>Lembrete ao profissional (horas)</span>
              <input
                type="number"
                min={1}
                max={720}
                value={reminderHours}
                onChange={(event) => setReminderDraft(event.target.value)}
              />
            </label>
            <label className="user-field">
              <span>Alerta ao cliente (horas)</span>
              <input
                type="number"
                min={1}
                max={720}
                value={alertHours}
                onChange={(event) => setAlertDraft(event.target.value)}
              />
            </label>
            <button className="button primary" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
              Salvar prazos
            </button>
          </form>
        </section>
      )}

      <section className="staff-list-section" aria-labelledby="first-contact-list-title">
        <div className="section-heading">
          <div>
            <h2 id="first-contact-list-title">Contratos sem primeiro contato</h2>
            <p>{formatNumber(total)} cliente(s) esperando além do prazo</p>
          </div>
          <div className="header-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => listQuery.refetch()}
              disabled={listQuery.isFetching}
            >
              <RefreshCw className={listQuery.isFetching ? 'spin' : ''} size={16} />
              Atualizar
            </button>
          </div>
        </div>

        {listQuery.isError ? (
          <div className="inline-alert danger" role="alert">
            <AlertTriangle size={18} />
            Não foi possível carregar a fila de contratos sem primeiro contato.
          </div>
        ) : listQuery.isLoading ? (
          <div className="skeleton staff-skeleton" />
        ) : items.length === 0 ? (
          <div className="access-panel inline-access" role="status">
            <div className="status-icon"><CheckCircle2 size={24} /></div>
            <div>
              <h2>Ninguém esperando</h2>
              <p>Todo cliente que contratou já recebeu a primeira mensagem do profissional.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Profissional</th>
                    <th>Oferta</th>
                    <th>Esperando</th>
                    <th>Contratou em</th>
                    <th>Boas-vindas</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.member_name}</strong></td>
                      <td>{item.professional_name}</td>
                      <td>{item.offering_name}</td>
                      <td><span className="role-badge">{waitingLabel(item.hours_waiting)}</span></td>
                      <td>{item.started_at ? formatDateTime(new Date(item.started_at)) : '—'}</td>
                      <td>
                        {item.welcome_message_sent_at
                          ? 'Enviada'
                          : item.welcome_message_error
                            ? `Falhou · ${item.welcome_message_error}`
                            : 'Não enviada'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {maxPage > 0 && (
              <div className="header-actions invite-pagination">
                <span>página {page + 1} de {maxPage + 1}</span>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Anterior
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  disabled={page >= maxPage}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

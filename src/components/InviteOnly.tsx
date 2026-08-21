import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DoorOpen,
  Mail,
  MailCheck,
  RefreshCw,
  Send,
  Ticket,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { formatDateTime, formatNumber } from '../lib/format';
import {
  invitedSourceLabel,
  parseEmailList,
  type WaitlistEntry,
  type WaitlistStatus,
} from '../lib/inviteOnly';
import {
  useAddInvitedEmails,
  useInviteSettings,
  useInvitedEmails,
  useReleaseWaitlistAccess,
  useRemoveInvitedEmail,
  useSendInviteEmails,
  useSetInviteOnlyEnabled,
  useWaitlist,
} from '../hooks/useInviteOnly';
import { useCurrentStaffRole } from '../hooks/useStaffManagement';

type Feedback = { type: 'success' | 'error'; text: string };
type TabId = 'invites' | 'waitlist';

const PAGE_SIZE = 50;

function entryName(entry: WaitlistEntry): string {
  return entry.full_name || entry.username || 'Sem nome';
}

function InviteOnlySwitch({
  enabled,
  disabled,
  pending,
  onChange,
}: {
  enabled: boolean;
  disabled: boolean;
  pending: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className={`invite-switch-card ${enabled ? 'is-on' : ''}`}>
      <div className="invite-switch-copy">
        <span className="section-label">Chave de acesso</span>
        <h2>{enabled ? 'Cadastro por convite' : 'Cadastro aberto'}</h2>
        <p>
          {enabled
            ? 'Só entra quem tem o e-mail na lista de convidados. Quem não tem conclui o cadastro normalmente, entra na fila de espera e vê a tela de espera a cada login.'
            : 'Qualquer pessoa que confirmar o e-mail entra na plataforma. A lista de convidados fica guardada e volta a valer quando a chave for ligada.'}
        </p>
      </div>

      <label className={`invite-switch ${enabled ? 'checked' : ''}`}>
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          disabled={disabled || pending}
          aria-label="Exigir convite para entrar na plataforma"
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="invite-switch-track" aria-hidden="true">
          <span className="invite-switch-thumb">
            {pending ? <RefreshCw className="spin" size={12} /> : null}
          </span>
        </span>
        <strong>{enabled ? 'Ligada' : 'Desligada'}</strong>
      </label>
    </div>
  );
}

function InvitesTab({ canEdit }: { canEdit: boolean }) {
  const settingsQuery = useInviteSettings(true);
  const toggleMutation = useSetInviteOnlyEnabled();
  const addMutation = useAddInvitedEmails();
  const removeMutation = useRemoveInvitedEmail();
  const sendInviteMutation = useSendInviteEmails();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [emailsInput, setEmailsInput] = useState('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const listQuery = useInvitedEmails(search, PAGE_SIZE, page * PAGE_SIZE, true);
  const settings = settingsQuery.data;
  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const parsedEmails = useMemo(() => parseEmailList(emailsInput), [emailsInput]);

  const toggle = (next: boolean) => {
    setFeedback(null);
    toggleMutation.mutate(next, {
      onSuccess: (result) =>
        setFeedback({
          type: 'success',
          text: result.invite_only_enabled
            ? 'Acesso por convite ligado. Novos cadastros fora da lista vão para a fila de espera.'
            : 'Acesso por convite desligado. O cadastro está aberto para todos.',
        }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'Não foi possível alterar a chave.',
        }),
    });
  };

  const submitEmails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    if (parsedEmails.length === 0) {
      setFeedback({ type: 'error', text: 'Informe pelo menos um e-mail.' });
      return;
    }
    addMutation.mutate(
      { emails: parsedEmails, note },
      {
        onSuccess: (result) => {
          const parts: string[] = [];
          if (result.added.length) parts.push(`${formatNumber(result.added.length)} convidado(s)`);
          if (result.skipped.length) parts.push(`${formatNumber(result.skipped.length)} já estava(m) na lista`);
          if (result.invalid.length) parts.push(`${formatNumber(result.invalid.length)} inválido(s)`);

          if (result.added.length > 0) {
            setEmailsInput('');
            setNote('');
            setPage(0);
            sendInviteMutation.mutate(result.added, {
              onSuccess: (sendResult) => {
                if (sendResult.sent.length) parts.push('e-mail de convite enviado');
                else if (sendResult.failed.length) parts.push('o e-mail de convite falhou ao enviar, use "Reenviar convite"');
                setFeedback({ type: 'success', text: parts.join(' · ') });
              },
              onError: () => {
                parts.push('o e-mail de convite falhou ao enviar, use "Reenviar convite"');
                setFeedback({ type: 'success', text: parts.join(' · ') });
              },
            });
          } else {
            setFeedback({
              type: 'error',
              text: parts.length ? parts.join(' · ') : 'Nada a adicionar.',
            });
          }
        },
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'Não foi possível adicionar os e-mails.',
          }),
      },
    );
  };

  const remove = (email: string) => {
    setFeedback(null);
    removeMutation.mutate(email, {
      onSuccess: () => setFeedback({ type: 'success', text: `${email} saiu da lista de convidados.` }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'Não foi possível remover o e-mail.',
        }),
    });
  };

  const resendInvite = (email: string) => {
    setFeedback(null);
    setResendingEmail(email);
    sendInviteMutation.mutate([email], {
      onSuccess: (result) => {
        setResendingEmail(null);
        setFeedback({
          type: result.sent.length > 0 ? 'success' : 'error',
          text: result.sent.length > 0
            ? `Convite reenviado para ${email}.`
            : `Não foi possível reenviar o convite para ${email}.`,
        });
      },
      onError: (error) => {
        setResendingEmail(null);
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'Não foi possível reenviar o convite.',
        });
      },
    });
  };

  if (settingsQuery.isLoading) return <div className="skeleton staff-skeleton" />;
  if (settingsQuery.isError) {
    return (
      <div className="inline-alert danger" role="alert">
        <AlertTriangle size={18} />
        Não foi possível carregar a configuração de convites. Verifique se a migration de acesso por convite foi aplicada.
      </div>
    );
  }

  return (
    <>
      <InviteOnlySwitch
        enabled={settings?.invite_only_enabled ?? false}
        disabled={!canEdit}
        pending={toggleMutation.isPending}
        onChange={toggle}
      />

      <div className="reports-grid">
        <article className="report-metric">
          <div><span>Convidados</span><Ticket size={18} /></div>
          <strong>{formatNumber(settings?.invited_count ?? 0)}</strong>
          <p>E-mails autorizados a entrar</p>
        </article>
        <article className="report-metric">
          <div><span>Na fila</span><Clock size={18} /></div>
          <strong>{formatNumber(settings?.waiting_count ?? 0)}</strong>
          <p>Aguardando liberação de acesso</p>
        </article>
        <article className="report-metric">
          <div><span>Liberados</span><UserCheck size={18} /></div>
          <strong>{formatNumber(settings?.released_count ?? 0)}</strong>
          <p>Saíram da fila e já podem entrar</p>
        </article>
        <article className="report-metric">
          <div><span>E-mail pendente</span><Mail size={18} /></div>
          <strong>{formatNumber(settings?.pending_welcome_count ?? 0)}</strong>
          <p>Liberados sem aviso de boas-vindas</p>
        </article>
      </div>

      {feedback && (
        <div className={`inline-alert ${feedback.type === 'error' ? 'danger' : ''}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {feedback.text}
        </div>
      )}

      {canEdit && (
        <section className="staff-create-panel" aria-labelledby="invite-add-title">
          <div className="section-heading">
            <div>
              <h2 id="invite-add-title">Convidar e-mails</h2>
              <p>Cole um por linha ou separados por vírgula. Quem já está na fila é liberado junto.</p>
            </div>
          </div>
          <form className="invite-add-form" onSubmit={submitEmails}>
            <label className="user-field">
              <span>E-mails</span>
              <textarea
                rows={4}
                value={emailsInput}
                placeholder={'pessoa@exemplo.com\noutra@exemplo.com'}
                onChange={(event) => setEmailsInput(event.target.value)}
              />
              <small>
                {parsedEmails.length > 0
                  ? `${formatNumber(parsedEmails.length)} e-mail(s) reconhecido(s)`
                  : 'Nenhum e-mail reconhecido ainda'}
              </small>
            </label>
            <label className="user-field">
              <span>Observação</span>
              <input
                value={note}
                maxLength={500}
                placeholder="Ex.: turma beta de agosto"
                onChange={(event) => setNote(event.target.value)}
              />
              <small>Opcional. Fica registrado junto com o convite.</small>
            </label>
            <button
              className="button primary"
              type="submit"
              disabled={addMutation.isPending || parsedEmails.length === 0}
            >
              {addMutation.isPending ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}
              Adicionar à lista
            </button>
          </form>
        </section>
      )}

      <section className="staff-list-section" aria-labelledby="invite-list-title">
        <div className="section-heading">
          <div>
            <h2 id="invite-list-title">Lista de convidados</h2>
            <p>{formatNumber(total)} e-mail(s) autorizado(s)</p>
          </div>
          <div className="header-actions">
            <input
              value={search}
              placeholder="Buscar e-mail"
              aria-label="Buscar e-mail convidado"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
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
            Não foi possível carregar a lista de convidados.
          </div>
        ) : listQuery.isLoading ? (
          <div className="skeleton staff-skeleton" />
        ) : items.length === 0 ? (
          <div className="access-panel inline-access" role="status">
            <div className="status-icon"><Ticket size={24} /></div>
            <div>
              <h2>Nenhum e-mail convidado</h2>
              <p>{search ? 'Nenhum resultado para esta busca.' : 'Adicione e-mails para liberar o acesso por convite.'}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Origem</th>
                    <th>Conta</th>
                    <th>Convite</th>
                    <th>Convidado em</th>
                    <th><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isResending = resendingEmail === item.email;
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.email}</strong>
                          <span>{item.note || 'Sem observação'}</span>
                        </td>
                        <td><span className="role-badge">{invitedSourceLabel(item.source)}</span></td>
                        <td>{item.has_account ? 'Já cadastrada' : 'Ainda não cadastrou'}</td>
                        <td>
                          {item.has_account
                            ? '—'
                            : item.invite_email_sent_at
                              ? `Enviado em ${formatDateTime(new Date(item.invite_email_sent_at))}`
                              : 'Pendente'}
                        </td>
                        <td>{item.created_at ? formatDateTime(new Date(item.created_at)) : '—'}</td>
                        <td className="staff-actions-cell">
                          {canEdit && !item.has_account && (
                            <button
                              className="icon-button table-action"
                              type="button"
                              title={`Reenviar convite para ${item.email}`}
                              aria-label={`Reenviar convite para ${item.email}`}
                              disabled={isResending}
                              onClick={() => resendInvite(item.email)}
                            >
                              {isResending ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}
                            </button>
                          )}
                          {canEdit && (
                            <button
                              className="icon-button table-action"
                              type="button"
                              title={`Remover ${item.email} da lista`}
                              aria-label={`Remover ${item.email} da lista`}
                              disabled={removeMutation.isPending}
                              onClick={() => remove(item.email)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {maxPage > 0 && (
              <div className="header-actions invite-pagination">
                <span>página {page + 1} de {maxPage + 1}</span>
                <button className="button secondary" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  Anterior
                </button>
                <button className="button secondary" type="button" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>
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

function WaitlistTab({ canEdit }: { canEdit: boolean }) {
  const [status, setStatus] = useState<WaitlistStatus>('waiting');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const query = useWaitlist(status, search, PAGE_SIZE, page * PAGE_SIZE, true);
  const releaseMutation = useReleaseWaitlistAccess();

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  const release = (entry: WaitlistEntry) => {
    setFeedback(null);
    setReleasingId(entry.user_id);
    releaseMutation.mutate(entry.user_id, {
      onSuccess: (result) => {
        setReleasingId(null);
        setFeedback({
          type: result.emailSent ? 'success' : 'error',
          text: result.emailSent
            ? `Acesso liberado. ${entryName(entry)} recebeu o e-mail de boas-vindas em ${entry.email}.`
            : `Acesso liberado, mas o e-mail para ${entry.email} não saiu. Tente reenviar em instantes.`,
        });
      },
      onError: (error) => {
        setReleasingId(null);
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'Não foi possível liberar o acesso.',
        });
      },
    });
  };

  return (
    <>
      <section className="staff-list-section" aria-labelledby="waitlist-title">
        <div className="section-heading">
          <div>
            <h2 id="waitlist-title">Fila de espera</h2>
            <p>
              {formatNumber(query.data?.waitingCount ?? 0)} aguardando ·{' '}
              {formatNumber(query.data?.releasedCount ?? 0)} liberado(s)
            </p>
          </div>
          <div className="header-actions">
            <select
              value={status}
              aria-label="Filtrar por situação"
              onChange={(event) => {
                setStatus(event.target.value as WaitlistStatus);
                setPage(0);
              }}
            >
              <option value="waiting">Aguardando</option>
              <option value="released">Liberados</option>
            </select>
            <input
              value={search}
              placeholder="Buscar nome ou e-mail"
              aria-label="Buscar na fila de espera"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
            <button
              className="button secondary"
              type="button"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} />
              Atualizar
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`inline-alert ${feedback.type === 'error' ? 'danger' : ''}`} role="status">
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {feedback.text}
          </div>
        )}

        {query.isError ? (
          <div className="inline-alert danger" role="alert">
            <AlertTriangle size={18} />
            Não foi possível carregar a fila de espera.
          </div>
        ) : query.isLoading ? (
          <div className="skeleton staff-skeleton" />
        ) : items.length === 0 ? (
          <div className="access-panel inline-access" role="status">
            <div className="status-icon"><Users size={24} /></div>
            <div>
              <h2>{status === 'waiting' ? 'Ninguém na fila' : 'Ninguém liberado ainda'}</h2>
              <p>
                {status === 'waiting'
                  ? 'Com a chave ligada, quem se cadastrar fora da lista de convidados aparece aqui.'
                  : 'Assim que você liberar alguém da fila, o registro aparece nesta aba.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th>Cadastro</th>
                    <th>Entrou na fila</th>
                    <th>Tentativas</th>
                    <th>Situação</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => {
                    const isReleasing = releasingId === entry.user_id;
                    const needsEmail = entry.status === 'released' && !entry.welcome_email_sent_at;
                    return (
                      <tr key={entry.user_id}>
                        <td>
                          <strong>{entryName(entry)}</strong>
                          <span>{entry.email}</span>
                        </td>
                        <td>
                          {entry.email_confirmed ? 'E-mail confirmado' : 'E-mail não confirmado'}
                          <br />
                          {entry.onboarding_completed ? 'Onboarding concluído' : 'Onboarding incompleto'}
                        </td>
                        <td>{entry.created_at ? formatDateTime(new Date(entry.created_at)) : '—'}</td>
                        <td>{formatNumber(entry.attempts)}</td>
                        <td>
                          {entry.status === 'waiting' ? (
                            <span className="role-badge">Aguardando</span>
                          ) : (
                            <>
                              <span className="role-badge role-admin">Liberado</span>
                              <span>
                                {entry.welcome_email_sent_at
                                  ? `Avisado em ${formatDateTime(new Date(entry.welcome_email_sent_at))}`
                                  : 'E-mail pendente'}
                              </span>
                            </>
                          )}
                        </td>
                        <td>
                          {entry.status === 'waiting' ? (
                            <button
                              className="button primary compact"
                              type="button"
                              disabled={!canEdit || releaseMutation.isPending}
                              onClick={() => release(entry)}
                            >
                              {isReleasing ? <RefreshCw className="spin" size={14} /> : <DoorOpen size={14} />}
                              Liberar acesso
                            </button>
                          ) : (
                            <button
                              className="button secondary compact"
                              type="button"
                              disabled={!canEdit || releaseMutation.isPending}
                              title={needsEmail ? 'O e-mail de boas-vindas ainda não foi enviado' : undefined}
                              onClick={() => release(entry)}
                            >
                              {isReleasing ? <RefreshCw className="spin" size={14} /> : <MailCheck size={14} />}
                              {needsEmail ? 'Enviar e-mail' : 'Reenviar e-mail'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {maxPage > 0 && (
              <div className="header-actions invite-pagination">
                <span>{formatNumber(total)} registro(s) · página {page + 1} de {maxPage + 1}</span>
                <button className="button secondary" type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  Anterior
                </button>
                <button className="button secondary" type="button" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>
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

export function InviteOnlyPage() {
  const { data: currentRole } = useCurrentStaffRole();
  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const [tab, setTab] = useState<TabId>('invites');
  const { data: settings } = useInviteSettings(true);
  const waitingCount = settings?.waiting_count ?? 0;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Acesso</p>
          <h1>Invite Only</h1>
          <span>
            Controle se a plataforma aceita qualquer cadastro ou só e-mails convidados, e libere quem está na fila de espera.
          </span>
        </div>
      </header>

      <section className="content invite-page">
        <div className="finance-tabs" role="tablist" aria-label="Seções do acesso por convite">
          <button type="button" role="tab" aria-selected={tab === 'invites'} onClick={() => setTab('invites')}>
            Convites
          </button>
          <button type="button" role="tab" aria-selected={tab === 'waitlist'} onClick={() => setTab('waitlist')}>
            Fila de espera{waitingCount > 0 ? ` (${formatNumber(waitingCount)})` : ''}
          </button>
        </div>

        {!canEdit && (
          <div className="inline-alert soft" role="status">
            <AlertTriangle size={18} />
            Seu papel interno permite acompanhar, mas não alterar a chave nem liberar acessos.
          </div>
        )}

        {tab === 'invites' ? <InvitesTab canEdit={canEdit} /> : <WaitlistTab canEdit={canEdit} />}
      </section>
    </>
  );
}

import { CheckCircle2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useProfessionalCredentialReviews, useReviewProfessionalCredential } from '../hooks/useProfessionalCredentials';
import type { CredentialStatus, ProfessionalCredentialReview } from '../lib/professionalCredentials';
import { formatDateTime } from '../lib/format';

const tabs: Array<{ value: CredentialStatus; label: string }> = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
];

export function ProfessionalCredentialsPage() {
  const [status, setStatus] = useState<CredentialStatus>('pending');
  const [rejecting, setRejecting] = useState<ProfessionalCredentialReview | null>(null);
  const [reason, setReason] = useState('');
  const query = useProfessionalCredentialReviews(status);
  const review = useReviewProfessionalCredential();

  async function reject() {
    if (!rejecting || reason.trim().length < 3) return;
    await review.mutateAsync({ id: rejecting.id, action: 'reject', reason: reason.trim() });
    setRejecting(null);
    setReason('');
  }

  return <>
      <header className="page-header">
        <div>
          <p className="section-label">Operação</p>
          <h1>Registros profissionais</h1>
        </div>
        <button className="button secondary" type="button" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} /> Atualizar
        </button>
      </header>

      <section className="content">
        <div className="beta-segments" role="tablist" aria-label="Status do registro">
          {tabs.map((tab) => (
            <button className={status === tab.value ? 'active' : ''} key={tab.value} type="button" role="tab" aria-selected={status === tab.value} onClick={() => setStatus(tab.value)}>
              {tab.label}
            </button>
          ))}
        </div>

        {query.isLoading ? <div className="beta-empty"><RefreshCw className="spin" size={24} /></div> : null}
        {query.isError ? <p className="form-error" role="alert">Não foi possível carregar os registros.</p> : null}
        {review.isError ? <p className="form-error" role="alert">Não foi possível concluir a análise do registro.</p> : null}
        {!query.isLoading && query.data?.items.length === 0 ? (
          <div className="beta-empty"><ShieldCheck size={28} /><strong>Nenhum registro {status === 'pending' ? 'aguardando validação' : status === 'approved' ? 'aprovado' : 'rejeitado'}</strong></div>
        ) : null}

        {query.data?.items.length ? (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Profissional</th><th>Especialidade</th><th>Conselho</th><th>Registro</th><th>Enviado</th>{status === 'rejected' ? <th>Motivo</th> : null}{status === 'pending' ? <th><span className="sr-only">Ações</span></th> : null}</tr></thead>
              <tbody>{query.data.items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.fullName}</strong><span>{item.username ? `@${item.username}` : item.profileId.slice(0, 8)}</span></td>
                  <td>{item.specialty}</td>
                  <td><span className="role-badge">{item.council} · {item.jurisdiction}</span></td>
                  <td><strong>{item.registration}</strong></td>
                  <td>{item.createdAt ? formatDateTime(new Date(item.createdAt)) : '—'}</td>
                  {status === 'rejected' ? <td>{item.rejectionReason ?? '—'}</td> : null}
                  {status === 'pending' ? <td className="staff-actions-cell">
                    <button className="icon-button table-action" type="button" title="Aprovar" aria-label={`Aprovar registro de ${item.fullName}`} disabled={review.isPending} onClick={() => review.mutate({ id: item.id, action: 'approve' })}><CheckCircle2 size={16} /></button>
                    <button className="icon-button table-action" type="button" title="Rejeitar" aria-label={`Rejeitar registro de ${item.fullName}`} disabled={review.isPending} onClick={() => setRejecting(item)}><X size={16} /></button>
                  </td> : null}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : null}
      </section>

      {rejecting ? <section className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="reject-credential-title">
          <header className="user-dialog-head"><div><h2 id="reject-credential-title">Rejeitar registro</h2><p>{rejecting.council} · {rejecting.jurisdiction} · {rejecting.registration}</p></div></header>
          <div className="user-dialog-body"><label className="user-dialog-field" htmlFor="credential-rejection"><span>Motivo</span>
          <textarea id="credential-rejection" rows={4} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} autoFocus /></label></div>
          <footer className="user-dialog-actions">
            <button className="button secondary" type="button" onClick={() => { setRejecting(null); setReason(''); }}>Cancelar</button>
            <button className="button danger" type="button" disabled={reason.trim().length < 3 || review.isPending} onClick={() => void reject()}>Rejeitar</button>
          </footer>
        </section> : null}
    </>;
}

import { FormEvent, useState } from 'react';
import { ExternalLink, FileText, RefreshCw, Upload } from 'lucide-react';
import { useLegalDocuments, usePublishLegalDocument, useSetLegalDocumentActive } from '../hooks/useLegalDocuments';
import type { LegalDocumentKind } from '../lib/legalDocuments';
import { formatDateTime, formatNumber } from '../lib/format';

export function LegalDocumentsPage() {
  const query = useLegalDocuments();
  const publish = usePublishLegalDocument();
  const toggle = useSetLegalDocumentActive();
  const [key, setKey] = useState('service_terms');
  const [version, setVersion] = useState('');
  const [kind, setKind] = useState<LegalDocumentKind>('acceptance');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceText, setAcceptanceText] = useState('');
  const [actionLabel, setActionLabel] = useState('Registrar aceite');
  const [required, setRequired] = useState(true);
  const [activate, setActivate] = useState(true);
  const [sortOrder, setSortOrder] = useState(40);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!file) return;
    try {
      await publish.mutateAsync({ key, version, kind, title, description, acceptanceText, actionLabel, isRequired: required, sortOrder, activate, file });
      setFile(null);
      setMessage('Documento publicado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível publicar.');
    }
  }

  return <>
    <header className="page-header">
      <div><p className="section-label">Governança</p><h1>Documentos legais</h1></div>
      <button className="button secondary" type="button" onClick={() => void query.refetch()} disabled={query.isFetching}>
        <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} /> Atualizar
      </button>
    </header>
    <section className="content legal-documents-layout">
      <form className="staff-create-panel legal-document-form" onSubmit={submit}>
        <div className="staff-create-copy"><Upload size={22} /><div><h2>Publicar versão</h2></div></div>
        <div className="staff-form">
          <label><span>Chave</span><input value={key} onChange={(event) => setKey(event.target.value)} required pattern="[a-z][a-z0-9_]{2,79}" /></label>
          <label><span>Versão</span><input value={version} onChange={(event) => setVersion(event.target.value)} required maxLength={40} /></label>
          <label><span>Tipo</span><select value={kind} onChange={(event) => setKind(event.target.value as LegalDocumentKind)}><option value="acceptance">Aceite</option><option value="notice">Ciência</option><option value="declaration">Declaração</option></select></label>
          <label><span>Ordem</span><input type="number" min={0} max={10000} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} /></label>
          <label className="legal-field-wide"><span>Título</span><input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} /></label>
          <label className="legal-field-wide"><span>Descrição</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={1000} /></label>
          <label className="legal-field-wide"><span>Texto do aceite</span><textarea rows={3} value={acceptanceText} onChange={(event) => setAcceptanceText(event.target.value)} required maxLength={1000} /></label>
          <label><span>Rótulo da ação</span><input value={actionLabel} onChange={(event) => setActionLabel(event.target.value)} required maxLength={80} /></label>
          <label><span>PDF</span><input type="file" accept="application/pdf,.pdf" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          <label className="legal-check"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /><span>Obrigatório</span></label>
          <label className="legal-check"><input type="checkbox" checked={activate} onChange={(event) => setActivate(event.target.checked)} /><span>Ativar ao publicar</span></label>
          {message ? <p className={publish.isError ? 'form-error legal-field-wide' : 'legal-field-wide'} role="status">{message}</p> : null}
          <button className="button primary legal-field-wide" type="submit" disabled={publish.isPending || !file}>{publish.isPending ? <RefreshCw className="spin" size={16} /> : <Upload size={16} />} Publicar PDF</button>
        </div>
      </form>

      <section className="staff-list-section" aria-labelledby="legal-version-title">
        <div className="staff-create-copy"><FileText size={22} /><div><h2 id="legal-version-title">Versões e cobertura</h2><p>{formatNumber(query.data?.length ?? 0)} versões publicadas</p></div></div>
        {query.isLoading ? <div className="skeleton staff-skeleton" /> : null}
        {query.isError ? <p className="form-error" role="alert">Não foi possível carregar os documentos.</p> : null}
        {query.data?.length ? <div className="table-wrapper"><table className="staff-table"><thead><tr><th>Documento</th><th>Versão</th><th>Cobertura</th><th>Publicação</th><th>Estado</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>
          {query.data.map((item) => <tr key={`${item.key}:${item.version}`}><td><strong>{item.title}</strong><span>{item.key}</span></td><td>{item.version}</td><td><strong>{formatNumber(item.acceptedCount)} aceites</strong><span>{formatNumber(item.pendingCount)} pendentes de {formatNumber(item.eligibleCount)}</span></td><td>{item.publishedAt ? formatDateTime(new Date(item.publishedAt)) : '—'}</td><td><span className={`role-badge ${item.isActive ? 'role-admin' : ''}`}>{item.isActive ? 'Ativo' : item.isCurrent ? 'Inativo' : 'Histórico'}</span></td><td className="staff-actions-cell"><a className="icon-button table-action" href={item.pdfUrl} target="_blank" rel="noreferrer" title="Abrir PDF"><ExternalLink size={16} /></a>{item.isCurrent ? <button className="button secondary" type="button" disabled={toggle.isPending} onClick={() => toggle.mutate({ key: item.key, active: !item.isActive })}>{item.isActive ? 'Desativar' : 'Ativar'}</button> : null}</td></tr>)}
        </tbody></table></div> : null}
      </section>
    </section>
  </>;
}

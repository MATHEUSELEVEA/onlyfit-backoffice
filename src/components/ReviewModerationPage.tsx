import { AlertTriangle, Check, ChevronLeft, ChevronRight, EyeOff, RefreshCw, Shield, Star } from 'lucide-react';
import { useState } from 'react';
import { useCurrentStaffRole } from '../hooks/useStaffManagement';
import { useResolveReviewReport, useReviewReports } from '../hooks/useReviewModeration';
import type { ReviewReport, ReviewReportStatus } from '../lib/reviewModeration';

const pageSize = 50;
const filters: Array<{ value: ReviewReportStatus; label: string }> = [
  { value: 'pending', label: 'Pendentes' },
  { value: 'kept', label: 'Mantidas' },
  { value: 'hidden', label: 'Ocultadas' },
];
const reasonLabels: Record<ReviewReport['reason'], string> = {
  spam: 'Spam', abuse: 'Abuso', fraud: 'Fraude', privacy: 'Privacidade', other: 'Outro',
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function ReviewModerationPage() {
  const [status, setStatus] = useState<ReviewReportStatus>('pending');
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const reports = useReviewReports(status, pageSize, page * pageSize);
  const resolve = useResolveReviewReport();
  const { data: role } = useCurrentStaffRole();
  const canResolve = role === 'super_admin' || role === 'admin';

  const selectStatus = (value: ReviewReportStatus) => {
    setStatus(value);
    setPage(0);
    setMessage(null);
  };

  const moderate = (report: ReviewReport, action: 'keep' | 'hide') => {
    setMessage(null);
    resolve.mutate({ reportId: report.id, action }, {
      onSuccess: () => setMessage(action === 'hide' ? 'Avaliação ocultada.' : 'Avaliação mantida.'),
      onError: () => setMessage('Não foi possível concluir a moderação.'),
    });
  };

  return <>
    <header className="page-header">
      <div>
        <p className="section-label">Confiança e segurança</p>
        <h1>Moderação de avaliações</h1>
        <span>Denúncias de compradores sobre avaliações do mercado.</span>
      </div>
      <button className="button secondary" type="button" onClick={() => reports.refetch()} disabled={reports.isFetching}>
        <RefreshCw className={reports.isFetching ? 'spin' : ''} size={16} /> Atualizar
      </button>
    </header>

    <section className="content review-moderation-page">
      <div className="beta-segments" role="tablist" aria-label="Filtrar denúncias">
        {filters.map((filter) => <button key={filter.value} type="button" role="tab" aria-selected={status === filter.value}
          className={status === filter.value ? 'active' : ''} onClick={() => selectStatus(filter.value)}>{filter.label}</button>)}
      </div>

      {message && <div className={`inline-alert ${message.startsWith('Não') ? 'danger' : ''}`} role="status">{message}</div>}
      {reports.isLoading ? <div className="beta-empty"><RefreshCw className="spin" size={22} /> Carregando denúncias…</div>
        : reports.isError ? <div className="inline-alert danger"><AlertTriangle size={18} /> Não foi possível carregar as denúncias.</div>
          : reports.data?.items.length === 0 ? <div className="beta-empty"><Shield size={30} /><strong>Fila vazia</strong></div>
            : <div className="review-report-list">{reports.data?.items.map((report) => <article className="review-report-card" key={report.id}>
              <div className="review-report-head">
                <div><span>{reasonLabels[report.reason]} · {dateLabel(report.created_at)}</span><h2>{report.offering_name}</h2></div>
                <span className={`review-status ${report.status}`}>{filters.find((item) => item.value === report.status)?.label}</span>
              </div>
              <div className="review-stars" aria-label={`${report.review.rating} de 5 estrelas`}>
                {[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} className={value <= report.review.rating ? 'filled' : ''} />)}
              </div>
              <p className="review-copy">{report.review.comment || 'Avaliação sem comentário.'}</p>
              {report.review.seller_reply && <blockquote><strong>Resposta do vendedor</strong>{report.review.seller_reply}</blockquote>}
              <dl className="review-report-details">
                <div><dt>Denunciante</dt><dd>{report.reporter.name || report.reporter.id}</dd></div>
                <div><dt>Detalhes</dt><dd>{report.details || 'Sem detalhes adicionais.'}</dd></div>
              </dl>
              {status === 'pending' && canResolve && <div className="review-report-actions">
                <button className="button secondary" type="button" disabled={resolve.isPending} onClick={() => moderate(report, 'keep')}><Check size={16} /> Manter</button>
                <button className="button danger" type="button" disabled={resolve.isPending} onClick={() => moderate(report, 'hide')}><EyeOff size={16} /> Ocultar</button>
              </div>}
            </article>)}</div>}

      {reports.data && reports.data.total > pageSize && <div className="beta-pagination">
        <button className="button secondary" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /> Anterior</button>
        <span>Página {page + 1} de {Math.ceil(reports.data.total / pageSize)}</span>
        <button className="button secondary" type="button" disabled={(page + 1) * pageSize >= reports.data.total} onClick={() => setPage((value) => value + 1)}>Próxima <ChevronRight size={16} /></button>
      </div>}
    </section>
  </>;
}

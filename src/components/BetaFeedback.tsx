import { AlertTriangle, ArrowLeft, ArrowRight, Check, Image, MessageSquareText, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useBetaFeedback, useFeedbackScreenshot, useUpdateBetaFeedback } from '../hooks/useBetaFeedback';
import type { BetaFeedbackItem, BetaFeedbackStatus } from '../lib/betaFeedback';

const pageSize = 50;
const statuses: Array<{ value: BetaFeedbackStatus | null; label: string }> = [
  { value: null, label: 'Todos' },
  { value: 'new', label: 'Novos' },
  { value: 'in_review', label: 'Em análise' },
  { value: 'resolved', label: 'Resolvidos' },
  { value: 'discarded', label: 'Descartados' },
];

const statusLabel: Record<BetaFeedbackStatus, string> = {
  new: 'Novo',
  in_review: 'Em análise',
  resolved: 'Resolvido',
  discarded: 'Descartado',
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function reporterName(item: BetaFeedbackItem) {
  return item.full_name || (item.username ? `@${item.username}` : 'Usuário beta');
}

export function BetaFeedbackPage() {
  const [status, setStatus] = useState<BetaFeedbackStatus | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<BetaFeedbackItem | null>(null);
  const query = useBetaFeedback(status, pageSize, page * pageSize);
  const data = query.data;

  const selectStatus = (value: BetaFeedbackStatus | null) => {
    setStatus(value);
    setPage(0);
  };

  return (
    <>
      <header className="page-header beta-feedback-header">
        <div>
          <p className="section-label">Programa fechado</p>
          <h1>Feedback Beta</h1>
          <span>Relatos enviados por familiares e amigos durante os testes.</span>
        </div>
        <button className="button secondary" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} /> Atualizar
        </button>
      </header>

      <section className="content beta-feedback-content">
        <div className="beta-metrics" aria-label="Resumo dos relatos">
          {(['new', 'in_review', 'resolved', 'discarded'] as BetaFeedbackStatus[]).map((value) => (
            <button key={value} type="button" className={`beta-metric ${status === value ? 'active' : ''}`} onClick={() => selectStatus(value)}>
              <span>{statusLabel[value]}</span>
              <strong>{data?.counts[value] ?? '—'}</strong>
            </button>
          ))}
        </div>

        <div className="beta-toolbar">
          <div className="beta-segments" role="tablist" aria-label="Filtrar feedback">
            {statuses.map((option) => (
              <button
                key={option.label}
                type="button"
                role="tab"
                aria-selected={status === option.value}
                className={status === option.value ? 'active' : ''}
                onClick={() => selectStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span>{data ? `${data.total} relato${data.total === 1 ? '' : 's'}` : ''}</span>
        </div>

        {query.isLoading ? (
          <div className="beta-empty"><RefreshCw className="spin" size={22} /> Carregando relatos…</div>
        ) : query.isError ? (
          <div className="inline-alert danger"><AlertTriangle size={18} /> Não foi possível carregar os relatos.</div>
        ) : data?.items.length === 0 ? (
          <div className="beta-empty">
            <MessageSquareText size={30} />
            <strong>Nada por aqui</strong>
            <span>Nenhum relato corresponde a este filtro.</span>
          </div>
        ) : (
          <div className="beta-list">
            {data?.items.map((item) => (
              <button key={item.id} type="button" className="beta-row" onClick={() => setSelected(item)}>
                <span className={`beta-status-dot ${item.status}`} aria-label={statusLabel[item.status]} />
                <span className="beta-row-copy">
                  <span className="beta-row-meta">
                    <strong>{reporterName(item)}</strong>
                    <span>{dateLabel(item.created_at)}</span>
                  </span>
                  <span className="beta-description">{item.description}</span>
                  <span className="beta-context">
                    {item.screenshot_path && <><Image size={13} /> Captura</>}
                    {item.platform} {item.app_version ? `· v${item.app_version} (${item.build_number ?? '—'})` : ''}
                    {item.route ? `· ${item.route}` : ''}
                  </span>
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
        )}

        {data && data.total > pageSize && (
          <div className="beta-pagination">
            <button className="button secondary" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              <ArrowLeft size={16} /> Anterior
            </button>
            <span>Página {page + 1} de {Math.ceil(data.total / pageSize)}</span>
            <button className="button secondary" type="button" disabled={(page + 1) * pageSize >= data.total} onClick={() => setPage((value) => value + 1)}>
              Próxima <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>

      {selected && <FeedbackDetail item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function FeedbackDetail({ item, onClose }: { item: BetaFeedbackItem; onClose: () => void }) {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.internal_notes ?? '');
  const [saved, setSaved] = useState(false);
  const screenshot = useFeedbackScreenshot(item.screenshot_path, true);
  const update = useUpdateBetaFeedback();

  const save = () => {
    setSaved(false);
    update.mutate({ id: item.id, status, internalNotes: notes }, { onSuccess: () => setSaved(true) });
  };

  return (
    <div className="beta-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="beta-drawer" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="beta-drawer-top">
          <div>
            <span>{reporterName(item)} · {dateLabel(item.created_at)}</span>
            <h2 id="feedback-title">Detalhes do relato</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>

        <div className="beta-drawer-scroll">
          {item.screenshot_path && (
            <div className="beta-screenshot">
              {screenshot.isLoading && <RefreshCw className="spin" size={22} />}
              {screenshot.isError && <span>Não foi possível abrir a captura.</span>}
              {screenshot.data && <img src={screenshot.data} alt="Captura enviada com o relato" />}
            </div>
          )}

          <section className="beta-detail-section">
            <span className="beta-detail-label">Relato</span>
            <p>{item.description}</p>
          </section>

          <dl className="beta-details-grid">
            <div><dt>Tela</dt><dd>{item.route || '—'}</dd></div>
            <div><dt>Versão</dt><dd>{item.app_version ? `${item.app_version} (${item.build_number ?? '—'})` : '—'}</dd></div>
            <div><dt>Plataforma</dt><dd>{item.platform} · {item.os_version || '—'}</dd></div>
            <div><dt>Viewport</dt><dd>{item.viewport_width && item.viewport_height ? `${item.viewport_width} × ${item.viewport_height}` : '—'}</dd></div>
          </dl>

          <label className="beta-field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as BetaFeedbackStatus)}>
              {statuses.filter((option) => option.value).map((option) => <option key={option.label} value={option.value!}>{option.label}</option>)}
            </select>
          </label>

          <label className="beta-field">
            <span>Notas internas</span>
            <textarea value={notes} maxLength={4000} rows={5} placeholder="Contexto da triagem…" onChange={(event) => setNotes(event.target.value)} />
          </label>

          {update.isError && <div className="inline-alert danger"><AlertTriangle size={18} /> Não foi possível salvar a triagem.</div>}
          {saved && <div className="inline-alert"><Check size={18} /> Triagem atualizada.</div>}
        </div>

        <div className="beta-drawer-footer">
          <button className="button primary" type="button" onClick={save} disabled={update.isPending}>
            {update.isPending ? <RefreshCw className="spin" size={16} /> : <Check size={16} />} Salvar triagem
          </button>
        </div>
      </aside>
    </div>
  );
}

import {
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Mail,
  RefreshCw,
  Send,
  Underline,
  X,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from 'react';
import { useSendOutboundEmail, useSentEmails } from '../hooks/useOutboundEmail';
import { isOnlyFitSender, isValidEmail, splitEmailList, type SentEmail } from '../lib/outboundEmail';

const EMPTY_HTML = '';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function dateLabel(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function recipientSummary(email: SentEmail): string {
  const first = email.to_emails[0] ?? '—';
  const extras = email.to_emails.length + email.cc_emails.length + email.bcc_emails.length - 1;
  return extras > 0 ? `${first} +${extras}` : first;
}

function ToolbarButton({
  label,
  children,
  command,
  onCommand,
}: {
  label: string;
  children: React.ReactNode;
  command: string;
  onCommand: (command: string) => void;
}) {
  return (
    <button
      className="email-tool-button"
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onCommand(command)}
    >
      {children}
    </button>
  );
}

function EmailPreview({ email, onClose }: { email: SentEmail; onClose: () => void }) {
  return (
    <aside className="email-history-detail" aria-labelledby="email-history-detail-title">
      <div className="email-history-detail-head">
        <div>
          <span>{dateLabel(email.sent_at ?? email.created_at)}</span>
          <h2 id="email-history-detail-title">{email.subject}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes"><X size={19} /></button>
      </div>
      <dl className="email-history-meta">
        <div><dt>De</dt><dd>{email.sender_name} &lt;{email.sender_email}&gt;</dd></div>
        <div><dt>Para</dt><dd>{email.to_emails.join(', ')}</dd></div>
        {email.cc_emails.length > 0 && <div><dt>Cc</dt><dd>{email.cc_emails.join(', ')}</dd></div>}
        {email.bcc_emails.length > 0 && <div><dt>Cco</dt><dd>{email.bcc_emails.join(', ')}</dd></div>}
        <div><dt>Resend ID</dt><dd>{email.resend_email_id ?? '—'}</dd></div>
      </dl>
      {email.status === 'failed' && email.error_message && (
        <div className="inline-alert danger" role="alert"><AlertTriangle size={18} /> {email.error_message}</div>
      )}
      <iframe
        className="email-history-frame"
        title={`Conteúdo de ${email.subject}`}
        sandbox=""
        srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{box-sizing:border-box;margin:0;padding:24px;color:#202124;background:#fff;font:16px/1.55 Arial,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}a{color:#567000}</style></head><body>${email.html_content}</body></html>`}
      />
    </aside>
  );
}

function EmailHistory() {
  const pageSize = 20;
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<SentEmail | null>(null);
  const query = useSentEmails(pageSize, page * pageSize, true);
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <div className={`email-history-layout ${selected ? 'has-detail' : ''}`}>
      <section className="email-history-list" aria-labelledby="email-history-title">
        <div className="email-history-list-head">
          <div>
            <h2 id="email-history-title">Envios recentes</h2>
            <span>{total} {total === 1 ? 'mensagem' : 'mensagens'}</span>
          </div>
          <button className="button secondary" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} /> Atualizar
          </button>
        </div>

        {query.isLoading ? (
          <div className="skeleton email-history-skeleton" />
        ) : query.isError ? (
          <div className="inline-alert danger" role="alert"><AlertTriangle size={18} /> Não foi possível carregar o histórico.</div>
        ) : items.length === 0 ? (
          <div className="email-empty-state"><Mail size={28} /><strong>Nenhum envio ainda</strong><span>As mensagens enviadas aparecerão aqui.</span></div>
        ) : (
          <div className="email-history-rows">
            {items.map((email) => (
              <button
                className={`email-history-row ${selected?.id === email.id ? 'selected' : ''}`}
                type="button"
                key={email.id}
                onClick={() => setSelected(email)}
              >
                <span className={`email-status-dot status-${email.status}`} aria-hidden="true" />
                <span className="email-history-main"><strong>{email.subject}</strong><span>{recipientSummary(email)}</span></span>
                <span className="email-history-time"><span>{email.status === 'sent' ? 'Enviado' : email.status === 'failed' ? 'Falhou' : 'Processando'}</span>{dateLabel(email.sent_at ?? email.created_at)}</span>
              </button>
            ))}
          </div>
        )}

        {total > pageSize && (
          <div className="email-pagination">
            <span>Página {page + 1} de {maxPage + 1}</span>
            <div>
              <button className="icon-button" type="button" aria-label="Página anterior" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}><ChevronLeft size={18} /></button>
              <button className="icon-button" type="button" aria-label="Próxima página" onClick={() => setPage((value) => Math.min(maxPage, value + 1))} disabled={page >= maxPage}><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </section>
      {selected && <EmailPreview email={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EmailComposer({ onSent }: { onSent: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [senderName, setSenderName] = useState('OnlyFit');
  const [from, setFrom] = useState('');
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState(EMPTY_HTML);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const sendMutation = useSendOutboundEmail();

  const recipients = useMemo(() => ({
    to: splitEmailList(toInput),
    cc: splitEmailList(ccInput),
    bcc: splitEmailList(bccInput),
  }), [toInput, ccInput, bccInput]);
  const invalidRecipients = [...recipients.to, ...recipients.cc, ...recipients.bcc].filter((email) => !isValidEmail(email));
  const plainBody = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  const canSend = isOnlyFitSender(from)
    && senderName.trim().length > 0
    && recipients.to.length > 0
    && invalidRecipients.length === 0
    && recipients.to.length + recipients.cc.length + recipients.bcc.length <= 50
    && subject.trim().length > 0
    && plainBody.length > 0
    && !sendMutation.isPending;

  const syncHtml = () => setHtml(editorRef.current?.innerHTML ?? EMPTY_HTML);

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncHtml();
  };

  const addImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setFeedback(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setFeedback({ type: 'error', text: 'Use uma imagem PNG, JPG, GIF ou WebP de até 4 MB.' });
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const image = document.createElement('img');
    image.src = dataUrl;
    image.alt = file.name.replace(/\.[^.]+$/, '');
    image.style.maxWidth = '100%';
    image.style.height = 'auto';
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.append(image, document.createElement('p'));
    syncHtml();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    if (!canSend) {
      setFeedback({ type: 'error', text: 'Revise os campos obrigatórios e os endereços informados.' });
      return;
    }
    const recipientCount = recipients.to.length + recipients.cc.length + recipients.bcc.length;
    if (!window.confirm(`Enviar “${subject.trim()}” para ${recipientCount} ${recipientCount === 1 ? 'destinatário' : 'destinatários'}?`)) return;
    try {
      await sendMutation.mutateAsync({
        from: from.trim().toLowerCase(),
        senderName: senderName.trim(),
        ...recipients,
        subject: subject.trim(),
        html,
        idempotencyKey: crypto.randomUUID(),
      });
      setFeedback({ type: 'success', text: 'E-mail aceito para envio pelo Resend.' });
      setToInput('');
      setCcInput('');
      setBccInput('');
      setSubject('');
      setHtml(EMPTY_HTML);
      if (editorRef.current) editorRef.current.innerHTML = EMPTY_HTML;
      window.setTimeout(onSent, 700);
    } catch {
      setFeedback({ type: 'error', text: 'Não foi possível enviar. Confira os dados e tente novamente.' });
    }
  };

  return (
    <form className="email-composer" onSubmit={submit}>
      <section className="email-address-panel" aria-label="Informações do envio">
        <div className="email-field-grid sender-grid">
          <label className="email-field"><span>Nome do remetente</span><input value={senderName} maxLength={80} onChange={(event) => setSenderName(event.target.value)} required /></label>
          <label className="email-field"><span>E-mail de origem</span><input value={from} type="email" inputMode="email" placeholder="nome@onlyfitapp.com" onChange={(event) => setFrom(event.target.value)} required aria-invalid={from.length > 0 && !isOnlyFitSender(from)} /></label>
        </div>
        {from.length > 0 && !isOnlyFitSender(from) && <p className="email-field-error" role="alert">O remetente deve terminar em @onlyfitapp.com.</p>}
        <label className="email-field"><span>Para</span><textarea rows={2} value={toInput} placeholder="email@exemplo.com" onChange={(event) => setToInput(event.target.value)} required /></label>
        <div className="email-field-grid">
          <label className="email-field"><span>Cc</span><textarea rows={2} value={ccInput} placeholder="Cópia" onChange={(event) => setCcInput(event.target.value)} /></label>
          <label className="email-field"><span>Cco</span><textarea rows={2} value={bccInput} placeholder="Cópia oculta" onChange={(event) => setBccInput(event.target.value)} /></label>
        </div>
        {invalidRecipients.length > 0 && <p className="email-field-error" role="alert">Endereço inválido: {invalidRecipients[0]}</p>}
        <label className="email-field subject-field"><span>Assunto</span><input value={subject} maxLength={200} placeholder="Título do e-mail" onChange={(event) => setSubject(event.target.value)} required /></label>
      </section>

      <section className="email-editor-panel" aria-label="Mensagem">
        <div className="email-editor-toolbar" role="toolbar" aria-label="Formatação do texto">
          <select aria-label="Estilo do texto" defaultValue="p" onChange={(event) => runCommand('formatBlock', event.target.value)}>
            <option value="p">Texto</option><option value="h1">Título</option><option value="h2">Subtítulo</option>
          </select>
          <span className="email-tool-divider" />
          <button className="email-tool-button image-button" type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus size={18} /> Imagem</button>
          <input className="sr-only" ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={addImage} tabIndex={-1} />
          <span className="email-tool-divider" />
          <ToolbarButton label="Negrito" command="bold" onCommand={runCommand}><Bold size={17} /></ToolbarButton>
          <ToolbarButton label="Itálico" command="italic" onCommand={runCommand}><Italic size={17} /></ToolbarButton>
          <ToolbarButton label="Sublinhado" command="underline" onCommand={runCommand}><Underline size={17} /></ToolbarButton>
          <span className="email-tool-divider" />
          <ToolbarButton label="Lista com marcadores" command="insertUnorderedList" onCommand={runCommand}><List size={18} /></ToolbarButton>
          <ToolbarButton label="Lista numerada" command="insertOrderedList" onCommand={runCommand}><ListOrdered size={18} /></ToolbarButton>
          <span className="email-tool-divider" />
          <ToolbarButton label="Alinhar à esquerda" command="justifyLeft" onCommand={runCommand}><AlignLeft size={18} /></ToolbarButton>
          <ToolbarButton label="Centralizar" command="justifyCenter" onCommand={runCommand}><AlignCenter size={18} /></ToolbarButton>
          <ToolbarButton label="Alinhar à direita" command="justifyRight" onCommand={runCommand}><AlignRight size={18} /></ToolbarButton>
        </div>
        <div
          className="email-editor"
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Corpo do e-mail"
          aria-multiline="true"
          data-placeholder="Escreva sua mensagem…"
          onInput={syncHtml}
          dangerouslySetInnerHTML={{ __html: EMPTY_HTML }}
        />
      </section>

      <div className="email-send-bar">
        <div aria-live="polite">
          {feedback ? (
            <div className={`inline-alert ${feedback.type === 'error' ? 'danger' : ''}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
              {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />} {feedback.text}
            </div>
          ) : (
            <span className="email-recipient-count"><Mail size={16} /> {recipients.to.length + recipients.cc.length + recipients.bcc.length} destinatário(s)</span>
          )}
        </div>
        <button className="button primary email-send-button" type="submit" disabled={!canSend}>
          {sendMutation.isPending ? <RefreshCw className="spin" size={17} /> : <Send size={17} />}
          {sendMutation.isPending ? 'Enviando…' : 'Enviar e-mail'}
        </button>
      </div>
    </form>
  );
}

export function EmailCenterPage() {
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  return (
    <>
      <header className="page-header">
        <div><p className="section-label">Comunicação</p><h1>E-mails</h1><span>Componha mensagens da OnlyFit e consulte os envios realizados.</span></div>
      </header>
      <section className="content email-center-page">
        <div className="finance-tabs" role="tablist" aria-label="E-mails">
          <button type="button" role="tab" aria-selected={tab === 'compose'} onClick={() => setTab('compose')}><Send size={15} /> Novo e-mail</button>
          <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}><Clock3 size={15} /> Histórico</button>
        </div>
        {tab === 'compose' ? <EmailComposer onSent={() => setTab('history')} /> : <EmailHistory />}
      </section>
    </>
  );
}

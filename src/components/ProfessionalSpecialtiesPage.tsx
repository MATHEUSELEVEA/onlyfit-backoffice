import { ArrowDown, ArrowUp, Check, Pencil, Plus, RefreshCw, Save, ShieldCheck, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import {
  useCreateProfessionalSpecialty,
  useProfessionalSpecialties,
  useReorderProfessionalSpecialties,
  useSetProfessionalSpecialtyActive,
  useUpdateProfessionalSpecialty,
} from '../hooks/useProfessionalSpecialties';
import { useCurrentStaffRole } from '../hooks/useStaffManagement';
import type { ProfessionalSpecialty } from '../lib/professionalSpecialties';

type Draft = { key: string | null; label: string; council: string; regulated: boolean };

const emptyDraft: Draft = { key: null, label: '', council: '', regulated: true };

function errorMessage(error: unknown): string {
  const code = (error as { message?: string })?.message ?? '';
  if (code.includes('specialty_already_exists')) return 'Já existe uma especialidade com esse nome.';
  if (code.includes('invalid_specialty_label')) return 'O nome precisa ter de 2 a 60 caracteres.';
  if (code.includes('invalid_specialty_council')) return 'A sigla do conselho precisa ter de 2 a 20 caracteres.';
  if (code.includes('invalid_specialty_key')) return 'Esse nome não gera uma chave válida.';
  if (code.includes('forbidden')) return 'Seu perfil não tem permissão para governar especialidades.';
  return 'Não foi possível concluir a operação.';
}

/**
 * G20 — governo da taxonomia de especialidades profissionais.
 *
 * A lista era constante replicada no app Flutter, aqui e num `CASE` do banco.
 * Desativar não derruba o selo de quem já foi validado (regra 10): a coluna
 * "validados" mostra exatamente quantos profissionais seguem exibindo a
 * credencial daquela especialidade.
 */
export function ProfessionalSpecialtiesPage() {
  const query = useProfessionalSpecialties();
  const role = useCurrentStaffRole();
  const canGovern = role.data === 'admin' || role.data === 'super_admin';

  const [draft, setDraft] = useState<Draft | null>(null);
  const create = useCreateProfessionalSpecialty();
  const update = useUpdateProfessionalSpecialty();
  const setActive = useSetProfessionalSpecialtyActive();
  const reorder = useReorderProfessionalSpecialties();

  const items = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key)),
    [query.data],
  );
  const activeCount = items.filter((item) => item.active).length;
  const validated = items.reduce((total, item) => total + item.approvedCredentials, 0);
  const pending = items.reduce((total, item) => total + item.pendingCredentials, 0);
  const busy = create.isPending || update.isPending || setActive.isPending || reorder.isPending;
  const failure = create.error ?? update.error ?? setActive.error ?? reorder.error;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const payload = { label: draft.label.trim(), council: draft.council.trim(), regulated: draft.regulated };
    if (!payload.label || !payload.council) return;
    if (draft.key) {
      await update.mutateAsync({ key: draft.key, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    setDraft(null);
  }

  function move(item: ProfessionalSpecialty, direction: -1 | 1) {
    const order = items.map((entry) => entry.key);
    const from = order.indexOf(item.key);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return;
    order.splice(to, 0, ...order.splice(from, 1));
    void reorder.mutateAsync(order);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Operação</p>
          <h1>Especialidades profissionais</h1>
        </div>
        <div className="specialty-row-actions">
          {canGovern ? (
            <button className="button primary" type="button" onClick={() => setDraft(emptyDraft)} disabled={busy}>
              <Plus size={16} /> Nova especialidade
            </button>
          ) : null}
          <button
            className="button secondary"
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} /> Atualizar
          </button>
        </div>
      </header>

      <section className="content specialty-page">
        <div className="specialty-summary">
          <span>
            <strong>{items.length}</strong> cadastradas
          </span>
          <span>
            <strong>{activeCount}</strong> ativas
          </span>
          <span>
            <strong>{validated}</strong> profissionais validados
          </span>
          <span>
            <strong>{pending}</strong> registros em análise
          </span>
        </div>

        {failure ? (
          <p className="form-error" role="alert">
            {errorMessage(failure)}
          </p>
        ) : null}
        {query.isError ? (
          <p className="form-error" role="alert">
            Não foi possível carregar as especialidades.
          </p>
        ) : null}

        <div className={draft ? 'specialty-workspace has-editor' : 'specialty-workspace'}>
          <div className="specialty-list-panel">
            {query.isLoading ? (
              <div className="specialty-loading">
                <RefreshCw className="spin" size={22} />
              </div>
            ) : null}

            {!query.isLoading && items.length === 0 ? (
              <div className="specialty-empty">
                <ShieldCheck size={26} />
                <strong>Nenhuma especialidade cadastrada</strong>
              </div>
            ) : null}

            {items.length ? (
              <ul className="specialty-list">
                {items.map((item, index) => (
                  <li className="specialty-row" key={item.key}>
                    {canGovern ? (
                      <div className="specialty-order-actions">
                        <div>
                          <button
                            type="button"
                            title="Subir"
                            aria-label={`Subir ${item.label}`}
                            disabled={index === 0 || busy}
                            onClick={() => move(item, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            title="Descer"
                            aria-label={`Descer ${item.label}`}
                            disabled={index === items.length - 1 || busy}
                            onClick={() => move(item, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="specialty-row-main">
                      <div>
                        <strong>{item.label}</strong>
                        <code>{item.key}</code>
                      </div>
                      <span className="role-badge">{item.council}</span>
                      <span className={item.active ? 'specialty-status active' : 'specialty-status'}>
                        {item.active ? 'Ativa' : 'Inativa'}
                      </span>
                      <span className="specialty-muted">
                        {item.approvedCredentials} validados · {item.pendingCredentials} em análise ·{' '}
                        {item.declaredBy} declarados
                        {item.regulated ? ' · profissão regulada' : ''}
                      </span>
                    </div>

                    {canGovern ? (
                      <div className="specialty-row-actions">
                        <button
                          className="button secondary compact"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setDraft({
                              key: item.key,
                              label: item.label,
                              council: item.council,
                              regulated: item.regulated,
                            })
                          }
                        >
                          <Pencil size={14} /> Editar
                        </button>
                        <button
                          className={item.active ? 'button danger compact' : 'button primary compact'}
                          type="button"
                          disabled={busy}
                          onClick={() => void setActive.mutateAsync({ key: item.key, active: !item.active })}
                        >
                          {item.active ? <X size={14} /> : <Check size={14} />}
                          {item.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {draft ? (
            <form className="specialty-editor" onSubmit={submit}>
              <h2 className="specialty-section-heading">
                {draft.key ? 'Editar especialidade' : 'Nova especialidade'}
              </h2>

              <label className="specialty-field">
                <span>Nome</span>
                <input
                  value={draft.label}
                  maxLength={60}
                  autoFocus
                  onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                />
              </label>

              <label className="specialty-field">
                <span>Conselho</span>
                <input
                  value={draft.council}
                  maxLength={20}
                  onChange={(event) => setDraft({ ...draft, council: event.target.value.toUpperCase() })}
                />
              </label>

              <label className="specialty-choice-field">
                <input
                  type="checkbox"
                  checked={draft.regulated}
                  onChange={(event) => setDraft({ ...draft, regulated: event.target.checked })}
                />
                <span>Profissão regulada — exige registro de conselho para vender consultoria de saúde</span>
              </label>

              {draft.key ? (
                <p className="specialty-key-note">
                  A chave <code>{draft.key}</code> não muda: é ela que as credenciais já aprovadas guardam.
                </p>
              ) : (
                <p className="specialty-key-note">A especialidade nasce inativa e só aparece nos apps depois de ativada.</p>
              )}

              <div className="specialty-editor-actions">
                <button className="button secondary" type="button" onClick={() => setDraft(null)} disabled={busy}>
                  Cancelar
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={busy || !draft.label.trim() || !draft.council.trim()}
                >
                  <Save size={16} /> Salvar
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </>
  );
}

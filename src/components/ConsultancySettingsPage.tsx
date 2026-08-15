import { AlertTriangle, CheckCircle2, Handshake, RefreshCw, Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import {
  useConsultancyCourtesySettings,
  useSetConsultancyCourtesySettings,
} from '../hooks/useConsultancySettings';
import { useCurrentStaffRole } from '../hooks/useStaffManagement';
import { consultancySettingsErrorMessage } from '../lib/consultancySettings';

type FormState = {
  initialQuota: string;
  paidThreshold: string;
  rewardQuota: string;
};

type Feedback = { tone: 'success' | 'danger'; text: string } | null;

const emptyForm: FormState = { initialQuota: '', paidThreshold: '', rewardQuota: '' };

export function ConsultancySettingsPage() {
  const { data: role } = useCurrentStaffRole();
  const canEdit = role === 'super_admin' || role === 'admin';
  const query = useConsultancyCourtesySettings();
  const mutation = useSetConsultancyCourtesySettings();
  const [draft, setDraft] = useState<FormState | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const form = draft ?? (query.data
    ? {
        initialQuota: String(query.data.initialQuota),
        paidThreshold: String(query.data.paidThreshold),
        rewardQuota: String(query.data.rewardQuota),
      }
    : emptyForm);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const initialQuota = Number(form.initialQuota);
    const paidThreshold = Number(form.paidThreshold);
    const rewardQuota = Number(form.rewardQuota);
    if (
      !Number.isInteger(initialQuota)
      || !Number.isInteger(paidThreshold)
      || !Number.isInteger(rewardQuota)
      || initialQuota < 0
      || paidThreshold < 1
      || rewardQuota < 0
    ) {
      setFeedback({
        tone: 'danger',
        text: 'Use números inteiros; a faixa paga começa em um e as cotas podem ser zero.',
      });
      return;
    }

    mutation.mutate(
      { initialQuota, paidThreshold, rewardQuota },
      {
        onSuccess: (settings) => {
          setDraft(null);
          setFeedback({
            tone: 'success',
            text: `${settings.initialQuota} inicial(is) + ${settings.rewardQuota} a cada ${settings.paidThreshold} contrato(s) pago(s).`,
          });
        },
        onError: (error) => {
          setFeedback({ tone: 'danger', text: consultancySettingsErrorMessage(error) });
        },
      },
    );
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Serviços</p>
          <h1>Consultorias</h1>
          <span>Franquia global de contratos gratuitos para profissionais.</span>
        </div>
        <div className="header-actions">
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
      </header>

      <main className="content">
        {query.isLoading ? (
          <div className="skeleton staff-skeleton" />
        ) : query.isError ? (
          <div className="inline-alert danger" role="alert">
            <AlertTriangle size={18} />
            Não foi possível carregar a franquia de contratos gratuitos.
          </div>
        ) : (
          <section className="staff-create-panel" aria-labelledby="courtesy-contract-settings-title">
            <div className="section-heading">
              <div>
                <h2 id="courtesy-contract-settings-title">Contratos gratuitos</h2>
                <p>
                  O saldo considera todo o histórico pago e desconta cada cortesia aceita.
                  Estornos deixam de contar; contratos ativos não são revogados.
                </p>
              </div>
              <Handshake size={22} aria-hidden="true" />
            </div>

            {feedback && (
              <div className={`inline-alert ${feedback.tone === 'danger' ? 'danger' : ''}`} role="status">
                {feedback.tone === 'danger' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                {feedback.text}
              </div>
            )}

            <form className="consultancy-settings-form" onSubmit={submit}>
              <div className="user-field-grid">
                <label className="user-field">
                  <span>Gratuitos iniciais</span>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={form.initialQuota}
                    disabled={!canEdit}
                    onChange={(event) => setDraft({ ...form, initialQuota: event.target.value })}
                  />
                </label>
                <label className="user-field">
                  <span>Pagos por faixa</span>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={form.paidThreshold}
                    disabled={!canEdit}
                    onChange={(event) => setDraft({ ...form, paidThreshold: event.target.value })}
                  />
                </label>
                <label className="user-field">
                  <span>Gratuitos por faixa</span>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={form.rewardQuota}
                    disabled={!canEdit}
                    onChange={(event) => setDraft({ ...form, rewardQuota: event.target.value })}
                  />
                </label>
              </div>

              {canEdit && (
                <div className="header-actions">
                  <button className="button primary" type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
                    Salvar franquia
                  </button>
                </div>
              )}
            </form>
          </section>
        )}
      </main>
    </>
  );
}

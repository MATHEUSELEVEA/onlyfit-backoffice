import { RefreshCw, ShieldCheck } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type TotpEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function MfaGate({ onVerified, onSignOut }: {
  onVerified: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);

  const loadFactors = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel === 'aal2') {
        onVerified();
        return;
      }

      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const verified = data.totp.find((factor) => factor.status === 'verified');
      setFactorId(verified?.id ?? null);
    } catch {
      setError('Não foi possível validar o segundo fator.');
    } finally {
      setLoading(false);
    }
  }, [onVerified]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFactors(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFactors]);

  async function beginEnrollment() {
    setError('');
    setSubmitting(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      await Promise.all(
        (factors?.totp ?? [])
          .filter((factor) => factor.status !== 'verified')
          .map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
      );
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'OnlyFit Backoffice',
      });
      if (enrollError) throw enrollError;
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setFactorId(data.id);
    } catch {
      setError('Não foi possível iniciar a configuração do autenticador.');
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) return;
    setError('');
    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (verifyError) throw verifyError;
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      onVerified();
    } catch {
      setError('Código inválido ou expirado. Gere um novo código e tente novamente.');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel mfa-panel">
        <div className="status-icon"><ShieldCheck size={24} /></div>
        <div>
          <h1>Verificação em duas etapas</h1>
          <p>O backoffice protege dados financeiros e exige um código do aplicativo autenticador.</p>
        </div>

        {isLoading ? (
          <div className="mfa-loading"><RefreshCw className="spin" size={20} /> Validando proteção…</div>
        ) : factorId ? (
          <>
            {enrollment ? (
              <div className="mfa-enrollment">
                {enrollment.qrCode.startsWith('data:image/') ? (
                  <img src={enrollment.qrCode} alt="QR code para configurar o autenticador" />
                ) : null}
                <p>Leia o QR code no Google Authenticator, 1Password, Authy ou aplicativo equivalente.</p>
                <details>
                  <summary>Configurar manualmente</summary>
                  <code>{enrollment.secret}</code>
                </details>
              </div>
            ) : null}
            <form className="login-form" onSubmit={verify}>
              <label htmlFor="mfa-code">Código de 6 dígitos</label>
              <input
                id="mfa-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button
                className="button primary"
                type="submit"
                disabled={isSubmitting || code.length !== 6}
              >
                {isSubmitting ? <RefreshCw className="spin" size={16} /> : <ShieldCheck size={16} />}
                Verificar
              </button>
            </form>
          </>
        ) : (
          <div className="mfa-enrollment">
            <p>Esta conta ainda não possui um autenticador cadastrado.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button primary" type="button" onClick={beginEnrollment} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="spin" size={16} /> : <ShieldCheck size={16} />}
              Ativar autenticador
            </button>
          </div>
        )}

        <button className="button secondary" type="button" onClick={() => void onSignOut()}>
          Sair e usar outra conta
        </button>
      </section>
    </main>
  );
}

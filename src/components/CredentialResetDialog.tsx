import { AlertTriangle, KeyRound, RefreshCw, ShieldOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { credentialResetErrorMessage, type CredentialResetAction } from '../lib/credentialReset';
import { useResetUserCredentials } from '../hooks/useCredentialReset';

const COPY: Record<CredentialResetAction, { title: string; description: string; confirmLabel: string; icon: typeof KeyRound }> = {
  password: {
    title: 'Enviar link de redefinição de senha',
    description:
      'A pessoa recebe um e-mail para escolher uma nova senha. Ninguém do backoffice vê nem define essa senha por ela.',
    confirmLabel: 'Enviar link de redefinição',
    icon: KeyRound,
  },
  mfa: {
    title: 'Resetar autenticador (MFA)',
    description:
      'O autenticador atual é desativado. No próximo login, a pessoa precisa configurar um novo QR code do zero. Não existe forma de reexibir o QR/segredo antigo.',
    confirmLabel: 'Resetar autenticador',
    icon: ShieldOff,
  },
};

export function CredentialResetDialog({
  targetUserId,
  targetLabel,
  action,
  onCancel,
  onDone,
}: {
  targetUserId: string;
  targetLabel: string;
  action: CredentialResetAction;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const copy = COPY[action];
  const Icon = copy.icon;
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const resetMutation = useResetUserCredentials();

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !resetMutation.isPending) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, resetMutation.isPending]);

  const submit = () => {
    setError('');
    resetMutation.mutate(
      { userId: targetUserId, action, reason: reason.trim() || undefined },
      {
        onSuccess: (result) => {
          onDone(
            action === 'password'
              ? result.emailSent
                ? `Link de redefinição enviado para ${targetLabel}.`
                : `Reset iniciado para ${targetLabel}, mas o e-mail não saiu. Tente novamente em instantes.`
              : result.emailSent
                ? `Autenticador de ${targetLabel} foi resetado e a pessoa foi avisada por e-mail.`
                : `Autenticador de ${targetLabel} foi resetado (sem fator ativo para remover, ou aviso por e-mail não saiu).`,
          );
        },
        onError: (mutationError) =>
          setError(mutationError instanceof Error ? mutationError.message : credentialResetErrorMessage('unexpected_error')),
      },
    );
  };

  return (
    <>
      <button className="scrim" type="button" aria-label="Fechar" onClick={() => !resetMutation.isPending && onCancel()} />
      <div className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="credential-reset-title">
        <header className="user-dialog-head">
          <div className="status-icon danger"><Icon size={22} /></div>
          <div>
            <h2 id="credential-reset-title">{copy.title} de {targetLabel}?</h2>
            <p>{copy.description}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Fechar" onClick={onCancel} disabled={resetMutation.isPending}>
            <X size={18} />
          </button>
        </header>

        <section className="user-dialog-body">
          <label className="user-dialog-field">
            <span>Motivo (fica registrado na auditoria)</span>
            <input
              value={reason}
              maxLength={200}
              placeholder="ex.: solicitação da pessoa via suporte"
              onChange={(event) => setReason(event.target.value)}
            />
          </label>

          {error && <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />{error}</div>}
        </section>

        <footer className="user-dialog-actions">
          <button className="button secondary" type="button" onClick={onCancel} disabled={resetMutation.isPending}>
            Cancelar
          </button>
          <button
            ref={buttonRef}
            className="button danger"
            type="button"
            onClick={submit}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? <RefreshCw className="spin" size={16} /> : <Icon size={16} />}
            {copy.confirmLabel}
          </button>
        </footer>
      </div>
    </>
  );
}

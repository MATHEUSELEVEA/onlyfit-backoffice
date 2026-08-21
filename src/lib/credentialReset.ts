import { supabase } from './supabase';

export type CredentialResetAction = 'password' | 'mfa';

export type CredentialResetResult = {
  emailSent: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function readFunctionError(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    const body = await context.json().catch(() => null);
    const code = asRecord(body).error;
    if (typeof code === 'string') return credentialResetErrorMessage(code);
  }
  return error instanceof Error ? error.message : null;
}

export function credentialResetErrorMessage(code: string): string {
  switch (code) {
    case 'forbidden':
      return 'Seu papel interno não permite resetar esta conta.';
    case 'mfa_required':
      return 'Refaça o login com verificação em duas etapas para continuar.';
    case 'cannot_target_self':
      return 'Use o fluxo normal para redefinir a própria senha ou o próprio autenticador.';
    case 'user_not_found':
      return 'Esta conta não foi encontrada.';
    case 'generate_link_failed':
      return 'Não foi possível gerar o link de redefinição agora. Tente novamente em instantes.';
    case 'invalid_user':
    case 'invalid_action':
      return 'Requisição inválida.';
    default:
      return 'Não foi possível concluir a ação.';
  }
}

/**
 * Reset administrativo de senha (link por e-mail) ou de MFA (desativa o
 * autenticador) de outra conta, inclusive da equipe interna. A hierarquia e
 * a notificação por e-mail são garantidas pelo backend.
 */
export async function resetUserCredentials(
  userId: string,
  action: CredentialResetAction,
  reason?: string,
): Promise<CredentialResetResult> {
  const { data, error } = await supabase.functions.invoke('control-reset-user-credentials', {
    body: { user_id: userId, action, reason: reason || undefined },
  });

  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail ?? 'Não foi possível concluir a ação.');
  }

  const row = asRecord(data);
  if (row.error) throw new Error(credentialResetErrorMessage(String(row.error)));

  return { emailSent: row.email_sent === true };
}

import { supabase } from './supabase';

export type InviteSettings = {
  invite_only_enabled: boolean;
  updated_at: string | null;
  invited_count: number;
  waiting_count: number;
  released_count: number;
  pending_welcome_count: number;
};

export type InvitedEmail = {
  id: string;
  email: string;
  note: string | null;
  source: 'manual' | 'waitlist_release' | 'grandfathered';
  created_at: string;
  has_account: boolean;
  invite_email_sent_at: string | null;
};

export type WaitlistStatus = 'waiting' | 'released';

export type WaitlistEntry = {
  user_id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  status: WaitlistStatus;
  attempts: number;
  created_at: string;
  last_attempt_at: string;
  released_at: string | null;
  welcome_email_sent_at: string | null;
  onboarding_completed: boolean;
  email_confirmed: boolean;
};

export type AddInvitedEmailsResult = {
  added: string[];
  skipped: string[];
  invalid: string[];
};

export type ReleaseResult = {
  released: boolean;
  emailSent: boolean;
  error: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function intFrom(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function parseSettings(value: unknown): InviteSettings {
  const row = asRecord(value);
  return {
    invite_only_enabled: row.invite_only_enabled === true,
    updated_at: textOrNull(row.updated_at),
    invited_count: intFrom(row.invited_count),
    waiting_count: intFrom(row.waiting_count),
    released_count: intFrom(row.released_count),
    pending_welcome_count: intFrom(row.pending_welcome_count),
  };
}

function parseInvitedEmail(value: unknown): InvitedEmail {
  const row = asRecord(value);
  const source = row.source;
  return {
    id: String(row.id ?? ''),
    email: String(row.email ?? ''),
    note: textOrNull(row.note),
    source:
      source === 'waitlist_release' || source === 'grandfathered' ? source : 'manual',
    created_at: String(row.created_at ?? ''),
    has_account: row.has_account === true,
    invite_email_sent_at: textOrNull(row.invite_email_sent_at),
  };
}

function parseWaitlistEntry(value: unknown): WaitlistEntry {
  const row = asRecord(value);
  return {
    user_id: String(row.user_id ?? ''),
    email: String(row.email ?? ''),
    full_name: textOrNull(row.full_name),
    username: textOrNull(row.username),
    avatar_url: textOrNull(row.avatar_url),
    status: row.status === 'released' ? 'released' : 'waiting',
    attempts: intFrom(row.attempts),
    created_at: String(row.created_at ?? ''),
    last_attempt_at: String(row.last_attempt_at ?? row.created_at ?? ''),
    released_at: textOrNull(row.released_at),
    welcome_email_sent_at: textOrNull(row.welcome_email_sent_at),
    onboarding_completed: row.onboarding_completed === true,
    email_confirmed: row.email_confirmed === true,
  };
}

export async function getInviteSettings(): Promise<InviteSettings> {
  const { data, error } = await supabase.rpc('control_get_invite_settings');
  if (error) throw error;
  return parseSettings(data);
}

export async function setInviteOnlyEnabled(enabled: boolean): Promise<InviteSettings> {
  const { data, error } = await supabase.rpc('control_set_invite_only_enabled', { p_enabled: enabled });
  if (error) throw error;
  return parseSettings(data);
}

export async function listInvitedEmails(
  search: string,
  limit: number,
  offset: number,
): Promise<{ items: InvitedEmail[]; total: number }> {
  const { data, error } = await supabase.rpc('control_list_invited_emails', {
    p_search: search || null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const row = asRecord(data);
  const items = Array.isArray(row.items) ? row.items.map(parseInvitedEmail) : [];
  return { items, total: intFrom(row.total) };
}

export async function addInvitedEmails(emails: string[], note: string): Promise<AddInvitedEmailsResult> {
  const { data, error } = await supabase.rpc('control_add_invited_emails', {
    p_emails: emails,
    p_note: note || null,
  });
  if (error) throw error;
  const row = asRecord(data);
  return {
    added: stringList(row.added),
    skipped: stringList(row.skipped),
    invalid: stringList(row.invalid),
  };
}

export async function removeInvitedEmail(email: string): Promise<void> {
  const { error } = await supabase.rpc('control_remove_invited_email', { p_email: email });
  if (error) throw error;
}

export async function listWaitlist(
  status: WaitlistStatus,
  search: string,
  limit: number,
  offset: number,
): Promise<{ items: WaitlistEntry[]; total: number; waitingCount: number; releasedCount: number }> {
  const { data, error } = await supabase.rpc('control_list_access_waitlist', {
    p_status: status,
    p_search: search || null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const row = asRecord(data);
  return {
    items: Array.isArray(row.items) ? row.items.map(parseWaitlistEntry) : [],
    total: intFrom(row.total),
    waitingCount: intFrom(row.waiting_count),
    releasedCount: intFrom(row.released_count),
  };
}

/**
 * Libera o acesso e dispara o e-mail de boas-vindas. A liberação acontece no
 * banco antes do envio: se só o e-mail falhar, o acesso continua liberado e a
 * tela mostra o reenvio como pendência, em vez de fingir que nada aconteceu.
 */
export async function releaseWaitlistAccess(userId: string): Promise<ReleaseResult> {
  const { data, error } = await supabase.functions.invoke('invite-release-access', {
    body: { user_id: userId },
  });

  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail ?? 'Não foi possível liberar o acesso.');
  }

  const row = asRecord(data);
  return {
    released: row.released === true,
    emailSent: row.email_sent === true,
    error: textOrNull(row.error),
  };
}

async function readFunctionError(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    const body = await context.json().catch(() => null);
    const code = asRecord(body).error;
    if (typeof code === 'string') return releaseErrorMessage(code);
  }
  return error instanceof Error ? error.message : null;
}

export function releaseErrorMessage(code: string): string {
  switch (code) {
    case 'forbidden':
      return 'Seu papel interno não permite liberar acessos. Fale com um administrador.';
    case 'waitlist_entry_not_found':
      return 'Esta pessoa não está mais na fila de espera.';
    case 'email_not_configured':
      return 'Acesso liberado, mas o envio de e-mail não está configurado no ambiente.';
    case 'email_send_failed':
      return 'Acesso liberado, mas o e-mail de boas-vindas não saiu. Use "Reenviar e-mail".';
    case 'invalid_user_id':
      return 'Registro inválido na fila de espera.';
    default:
      return 'Não foi possível liberar o acesso.';
  }
}

export type SendInviteEmailsResult = {
  sent: string[];
  skipped: string[];
  failed: string[];
};

/**
 * Envia (ou reenvia) o e-mail de convite para quem está na allowlist e ainda
 * não tem conta. Quem já tem conta, ou não está mais na lista, volta em
 * `skipped` sem erro.
 */
export async function sendInviteEmails(emails: string[]): Promise<SendInviteEmailsResult> {
  const { data, error } = await supabase.functions.invoke('invite-send-email', {
    body: { emails },
  });

  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail ?? 'Não foi possível enviar o e-mail de convite.');
  }

  const row = asRecord(data);
  return {
    sent: stringList(row.sent),
    skipped: stringList(row.skipped),
    failed: stringList(row.failed),
  };
}

export function invitedSourceLabel(source: InvitedEmail['source']): string {
  switch (source) {
    case 'grandfathered':
      return 'Conta anterior';
    case 'waitlist_release':
      return 'Liberado da fila';
    default:
      return 'Convite manual';
  }
}

/** Aceita e-mails colados em lista, separados por vírgula, ponto e vírgula, espaço ou quebra de linha. */
export function parseEmailList(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

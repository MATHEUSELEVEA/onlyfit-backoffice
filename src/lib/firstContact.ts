import { supabase } from './supabase';

/**
 * G11 — contratos de consultoria sem primeiro contato.
 *
 * O relógio é do banco: a contratação abre a pendência, a primeira mensagem do
 * profissional a derruba, e o dispatcher marca o alerta quando o prazo vence.
 * O backoffice define os prazos e vê quem passou deles.
 */
export type FirstContactSettings = {
  reminder_hours: number;
  alert_hours: number;
  updated_at: string | null;
};

export type ContractWithoutFirstContact = {
  id: string;
  started_at: string;
  hours_waiting: number;
  first_contact_alert_at: string | null;
  first_contact_reminder_at: string | null;
  welcome_message_sent_at: string | null;
  welcome_message_error: string | null;
  price: number;
  offering_name: string;
  professional_id: string;
  professional_name: string;
  member_id: string;
  member_name: string;
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

function parseSettings(value: unknown): FirstContactSettings {
  const row = asRecord(value);
  return {
    reminder_hours: intFrom(row.first_contact_reminder_hours),
    alert_hours: intFrom(row.first_contact_alert_hours),
    updated_at: textOrNull(row.updated_at),
  };
}

function parseContract(value: unknown): ContractWithoutFirstContact {
  const row = asRecord(value);
  return {
    id: String(row.id ?? ''),
    started_at: String(row.started_at ?? ''),
    hours_waiting: intFrom(row.hours_waiting),
    first_contact_alert_at: textOrNull(row.first_contact_alert_at),
    first_contact_reminder_at: textOrNull(row.first_contact_reminder_at),
    welcome_message_sent_at: textOrNull(row.welcome_message_sent_at),
    welcome_message_error: textOrNull(row.welcome_message_error),
    price: intFrom(row.price),
    offering_name: String(row.offering_name ?? 'Consultoria'),
    professional_id: String(row.professional_id ?? ''),
    professional_name: String(row.professional_name ?? 'Profissional'),
    member_id: String(row.member_id ?? ''),
    member_name: String(row.member_name ?? 'Cliente'),
  };
}

export async function getFirstContactSettings(): Promise<FirstContactSettings> {
  const { data, error } = await supabase.rpc('control_get_service_settings');
  if (error) throw error;
  return parseSettings(data);
}

export async function setFirstContactDeadlines(
  reminderHours: number,
  alertHours: number,
): Promise<FirstContactSettings> {
  const { data, error } = await supabase.rpc('control_set_first_contact_deadlines', {
    p_reminder_hours: reminderHours,
    p_alert_hours: alertHours,
  });
  if (error) throw error;
  return parseSettings(data);
}

export async function listContractsWithoutFirstContact(
  limit: number,
  offset: number,
): Promise<{ items: ContractWithoutFirstContact[]; total: number; hasMore: boolean }> {
  const { data, error } = await supabase.rpc('control_list_contracts_without_first_contact', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const row = asRecord(data);
  return {
    items: Array.isArray(row.items) ? row.items.map(parseContract) : [],
    total: intFrom(row.total),
    hasMore: row.has_more === true,
  };
}

/** Os erros que as RPCs devolvem, em linguagem de quem opera. */
export function deadlineErrorMessage(code: string): string {
  switch (code) {
    case 'forbidden':
      return 'Seu papel interno não permite mudar os prazos.';
    case 'hours_out_of_range':
      return 'Os prazos vão de 1 a 720 horas.';
    case 'alert_before_reminder':
      return 'O alerta ao cliente não pode vir antes do lembrete ao profissional.';
    case 'invalid_hours':
      return 'Preencha os dois prazos.';
    default:
      return `Não foi possível salvar os prazos (${code}).`;
  }
}

export function waitingLabel(hours: number): string {
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
}

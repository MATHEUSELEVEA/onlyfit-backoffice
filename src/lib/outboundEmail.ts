import { supabase } from './supabase';

export type SentEmailStatus = 'processing' | 'sent' | 'failed';

export type SentEmail = {
  id: string;
  resend_email_id: string | null;
  sender_email: string;
  sender_name: string;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  subject: string;
  html_content: string;
  text_content: string;
  image_urls: string[];
  status: SentEmailStatus;
  error_message: string | null;
  sent_by: string;
  created_at: string;
  sent_at: string | null;
};

export type SendEmailInput = {
  from: string;
  senderName: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  idempotencyKey: string;
};

export type SentEmailPage = {
  items: SentEmail[];
  total: number;
};

export function splitEmailList(value: string): string[] {
  return [...new Set(value.split(/[;,\n]/).map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());
}

export function isOnlyFitSender(value: string): boolean {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@onlyfitapp\.com$/i.test(value.trim());
}

export async function sendOutboundEmail(input: SendEmailInput): Promise<{ id: string; resendEmailId: string }> {
  const { data, error } = await supabase.functions.invoke('control-send-email', { body: input });
  if (error) throw error;
  const response = data as { id?: unknown; resendEmailId?: unknown; error?: unknown } | null;
  if (!response || typeof response.id !== 'string' || typeof response.resendEmailId !== 'string') {
    throw new Error(typeof response?.error === 'string' ? response.error : 'invalid_send_response');
  }
  return { id: response.id, resendEmailId: response.resendEmailId };
}

export async function listSentEmails(limit: number, offset: number): Promise<SentEmailPage> {
  const { data, error, count } = await supabase
    .from('platform_sent_emails')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { items: (data ?? []) as SentEmail[], total: count ?? 0 };
}

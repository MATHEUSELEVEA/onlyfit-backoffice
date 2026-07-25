import { supabase } from './supabase';

export type AsaasEnvironment = 'sandbox' | 'production';

export type AsaasEnvironmentStatus = {
  environment: AsaasEnvironment;
  api_key_configured: boolean;
  api_key_last4: string | null;
  webhook_token_configured: boolean;
  asaas_api_key_configured: boolean;
  asaas_api_key_last4: string | null;
  asaas_webhook_token_configured: boolean;
  stripe_publishable_key_configured: boolean;
  stripe_publishable_key_last4: string | null;
  stripe_secret_key_configured: boolean;
  stripe_secret_key_last4: string | null;
  stripe_webhook_secret_configured: boolean;
  stripe_webhook_secret_last4: string | null;
  pending_transactions: number;
  expired_pix_transactions: number;
  failed_transactions: number;
  updated_at: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function parseStatus(value: unknown): AsaasEnvironmentStatus {
  const row = asRecord(value);
  const environment: AsaasEnvironment = row.environment === 'production' ? 'production' : 'sandbox';
  const asaasApiConfigured = row.asaas_api_key_configured === true || row.api_key_configured === true;
  const asaasWebhookConfigured = row.asaas_webhook_token_configured === true || row.webhook_token_configured === true;
  const asaasLast4 = stringOrNull(row.asaas_api_key_last4) ?? stringOrNull(row.api_key_last4);
  return {
    environment,
    api_key_configured: asaasApiConfigured,
    api_key_last4: asaasLast4,
    webhook_token_configured: asaasWebhookConfigured,
    asaas_api_key_configured: asaasApiConfigured,
    asaas_api_key_last4: asaasLast4,
    asaas_webhook_token_configured: asaasWebhookConfigured,
    stripe_publishable_key_configured: row.stripe_publishable_key_configured === true,
    stripe_publishable_key_last4: stringOrNull(row.stripe_publishable_key_last4),
    stripe_secret_key_configured: row.stripe_secret_key_configured === true,
    stripe_secret_key_last4: stringOrNull(row.stripe_secret_key_last4),
    stripe_webhook_secret_configured: row.stripe_webhook_secret_configured === true,
    stripe_webhook_secret_last4: stringOrNull(row.stripe_webhook_secret_last4),
    pending_transactions: numberFrom(row.pending_transactions),
    expired_pix_transactions: numberFrom(row.expired_pix_transactions),
    failed_transactions: numberFrom(row.failed_transactions),
    updated_at: stringOrNull(row.updated_at),
  };
}

export async function getAsaasIntegrationStatus(): Promise<AsaasEnvironmentStatus[]> {
  const { data, error } = await supabase.rpc('control_get_asaas_integration_status');
  if (error) throw error;
  const environments = asRecord(data).environments;
  return Array.isArray(environments) ? environments.map(parseStatus) : [];
}

export async function setAsaasCredentials(input: {
  environment: AsaasEnvironment;
  apiKey?: string | null;
  webhookToken?: string | null;
  stripePublishableKey?: string | null;
  stripeSecretKey?: string | null;
  stripeWebhookSecret?: string | null;
}): Promise<AsaasEnvironmentStatus> {
  const { data, error } = await supabase.rpc('control_set_payment_provider_credentials', {
    p_environment: input.environment,
    p_asaas_api_key: input.apiKey ?? null,
    p_asaas_webhook_token: input.webhookToken ?? null,
    p_stripe_publishable_key: input.stripePublishableKey ?? null,
    p_stripe_secret_key: input.stripeSecretKey ?? null,
    p_stripe_webhook_secret: input.stripeWebhookSecret ?? null,
  });
  if (error) throw error;
  return parseStatus(data);
}

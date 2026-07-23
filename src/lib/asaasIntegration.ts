import { supabase } from './supabase';

export type AsaasEnvironment = 'sandbox' | 'production';

export type AsaasEnvironmentStatus = {
  environment: AsaasEnvironment;
  api_key_configured: boolean;
  api_key_last4: string | null;
  webhook_token_configured: boolean;
  updated_at: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseStatus(value: unknown): AsaasEnvironmentStatus {
  const row = asRecord(value);
  const environment: AsaasEnvironment = row.environment === 'production' ? 'production' : 'sandbox';
  return {
    environment,
    api_key_configured: row.api_key_configured === true,
    api_key_last4: stringOrNull(row.api_key_last4),
    webhook_token_configured: row.webhook_token_configured === true,
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
}): Promise<AsaasEnvironmentStatus> {
  const { data, error } = await supabase.rpc('control_set_asaas_credentials', {
    p_environment: input.environment,
    p_api_key: input.apiKey ?? null,
    p_webhook_token: input.webhookToken ?? null,
  });
  if (error) throw error;
  return parseStatus(data);
}

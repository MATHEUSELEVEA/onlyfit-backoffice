import { supabase } from './supabase';

export type OverviewStats = {
  profiles_total: number;
  profiles_created_today: number;
  workout_sessions_completed_today: number;
  pending_content_reports: number;
};

export type PaymentsSnapshot = {
  charges_paid_today_count: number;
  charges_paid_today_value: number;
  charges_paid_month_count: number;
  charges_paid_month_value: number;
};

export type OutboxHealth = Record<string, number>;

export type WeeklyActivity = {
  date: string;
  completed_sessions: number;
};

export type DashboardSnapshot = {
  overview: OverviewStats;
  payments: PaymentsSnapshot;
  outbox: OutboxHealth;
  weeklyActivity: WeeklyActivity[];
  generatedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function parseOverview(value: unknown): OverviewStats {
  const row = asRecord(value);
  return {
    profiles_total: numberFrom(row.profiles_total),
    profiles_created_today: numberFrom(row.profiles_created_today),
    workout_sessions_completed_today: numberFrom(row.workout_sessions_completed_today),
    pending_content_reports: numberFrom(row.pending_content_reports),
  };
}

function parsePayments(value: unknown): PaymentsSnapshot {
  const row = asRecord(value);
  return {
    charges_paid_today_count: numberFrom(row.charges_paid_today_count),
    charges_paid_today_value: numberFrom(row.charges_paid_today_value),
    charges_paid_month_count: numberFrom(row.charges_paid_month_count),
    charges_paid_month_value: numberFrom(row.charges_paid_month_value),
  };
}

function parseOutbox(value: unknown): OutboxHealth {
  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, raw]) => [key, numberFrom(raw)]),
  );
}

function parseWeeklyActivity(value: unknown): WeeklyActivity[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const row = asRecord(raw);
    return {
      date: typeof row.date === 'string' ? row.date : '',
      completed_sessions: numberFrom(row.completed_sessions),
    };
  }).filter((row) => row.date.length > 0);
}

export async function isPlatformStaff(): Promise<boolean> {
  const { data, error } = await supabase.rpc('platform_is_staff');
  if (error) throw error;
  return Boolean(data);
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const { data, error } = await supabase.rpc('control_dashboard_snapshot');
  if (error) throw error;

  const snapshot = asRecord(data);
  const generatedAt = typeof snapshot.generated_at === 'string'
    ? snapshot.generated_at
    : null;
  if (!generatedAt) throw new Error('O banco retornou um snapshot inválido.');

  return {
    overview: parseOverview(snapshot.overview),
    payments: parsePayments(snapshot.payments),
    outbox: parseOutbox(snapshot.outbox),
    weeklyActivity: parseWeeklyActivity(snapshot.weekly_activity),
    generatedAt,
  };
}

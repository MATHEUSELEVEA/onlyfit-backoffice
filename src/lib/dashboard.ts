import { supabase } from './supabase';

export type OverviewStats = {
  profiles_total: number;
  profiles_created_today: number;
  workout_sessions_completed_today: number;
  pending_content_reports: number;
};

export type AppActivityStats = {
  posts_total: number;
  posts_published_today: number;
  post_likes_total: number;
  post_comments_total: number;
  feed_saves_total: number;
  workout_sessions_total: number;
  active_creators_total: number;
};

export type FinanceSnapshot = {
  transactions_total: number;
  transactions_paid_today_count: number;
  transactions_paid_today_value: number;
  transactions_paid_month_count: number;
  transactions_paid_month_value: number;
  gross_revenue_total: number;
  net_revenue_total: number;
  platform_commission_total: number;
  pending_settlement_value: number;
  active_subscriptions_total: number;
};

export type OutboxHealth = Record<string, number>;

export type WeeklyActivity = {
  date: string;
  completed_sessions: number;
  posts_created: number;
  saves_created: number;
  comments_created: number;
};

export type WeeklyFinance = {
  date: string;
  gross_value: number;
  platform_commission: number;
};

export type DashboardSnapshot = {
  overview: OverviewStats;
  appActivity: AppActivityStats;
  finance: FinanceSnapshot;
  outbox: OutboxHealth;
  weeklyActivity: WeeklyActivity[];
  weeklyFinance: WeeklyFinance[];
  notes: string[];
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

function parseAppActivity(value: unknown): AppActivityStats {
  const row = asRecord(value);
  return {
    posts_total: numberFrom(row.posts_total),
    posts_published_today: numberFrom(row.posts_published_today),
    post_likes_total: numberFrom(row.post_likes_total),
    post_comments_total: numberFrom(row.post_comments_total),
    feed_saves_total: numberFrom(row.feed_saves_total),
    workout_sessions_total: numberFrom(row.workout_sessions_total),
    active_creators_total: numberFrom(row.active_creators_total),
  };
}

function parseFinance(value: unknown): FinanceSnapshot {
  const row = asRecord(value);
  return {
    transactions_total: numberFrom(row.transactions_total),
    transactions_paid_today_count: numberFrom(row.transactions_paid_today_count),
    transactions_paid_today_value: numberFrom(row.transactions_paid_today_value),
    transactions_paid_month_count: numberFrom(row.transactions_paid_month_count),
    transactions_paid_month_value: numberFrom(row.transactions_paid_month_value),
    gross_revenue_total: numberFrom(row.gross_revenue_total),
    net_revenue_total: numberFrom(row.net_revenue_total),
    platform_commission_total: numberFrom(row.platform_commission_total),
    pending_settlement_value: numberFrom(row.pending_settlement_value),
    active_subscriptions_total: numberFrom(row.active_subscriptions_total),
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
      posts_created: numberFrom(row.posts_created),
      saves_created: numberFrom(row.saves_created),
      comments_created: numberFrom(row.comments_created),
    };
  }).filter((row) => row.date.length > 0);
}

function parseWeeklyFinance(value: unknown): WeeklyFinance[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const row = asRecord(raw);
    return {
      date: typeof row.date === 'string' ? row.date : '',
      gross_value: numberFrom(row.gross_value),
      platform_commission: numberFrom(row.platform_commission),
    };
  }).filter((row) => row.date.length > 0);
}

function parseNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
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
    appActivity: parseAppActivity(snapshot.app_activity),
    finance: parseFinance(snapshot.finance ?? snapshot.payments),
    outbox: parseOutbox(snapshot.outbox),
    weeklyActivity: parseWeeklyActivity(snapshot.weekly_activity),
    weeklyFinance: parseWeeklyFinance(snapshot.weekly_finance),
    notes: parseNotes(snapshot.notes),
    generatedAt,
  };
}

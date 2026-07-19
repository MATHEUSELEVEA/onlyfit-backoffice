import { supabase } from './supabase';

export type StaffRole = 'super_admin' | 'admin' | 'moderator' | 'support';

export type PlatformStaffMember = {
  user_id: string;
  role: StaffRole;
  created_at: string;
  created_by: string | null;
  email: string | null;
  full_name: string | null;
  username: string | null;
};

export type CreatePlatformStaffInput = {
  email: string;
  fullName: string;
  password: string;
  role: StaffRole;
};

export type CreatePlatformStaffResult = {
  accountStatus: 'existing' | 'created';
  staffStatus: 'created' | 'already_staff';
  staff: PlatformStaffMember;
};

export type UpdatePlatformStaffInput = {
  userId: string;
  email: string;
  fullName: string;
  password: string;
  role: StaffRole;
};

export type UpdatePlatformStaffResult = {
  staff: PlatformStaffMember;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseStaffMember(value: unknown): PlatformStaffMember {
  const row = asRecord(value);
  return {
    user_id: String(row.user_id ?? row.id ?? ''),
    role: String(row.role ?? 'support') as StaffRole,
    created_at: String(row.created_at ?? ''),
    created_by: typeof row.created_by === 'string' ? row.created_by : null,
    email: typeof row.email === 'string' ? row.email : null,
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    username: typeof row.username === 'string' ? row.username : null,
  };
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: Response }).context;
  if (context) {
    try {
      const body = asRecord(await context.json());
      if (body.error) throw new Error(String(body.error));
    } catch (contextError) {
      if (contextError instanceof Error && contextError.message !== 'Unexpected end of JSON input') {
        throw contextError;
      }
    }
  }
  throw error;
}

export async function fetchCurrentStaffRole(): Promise<StaffRole | null> {
  const { data, error } = await supabase.rpc('platform_current_staff_role');
  if (error) throw error;
  return typeof data === 'string' ? data as StaffRole : null;
}

export async function fetchPlatformStaff(): Promise<PlatformStaffMember[]> {
  const { data, error } = await supabase.rpc('control_list_platform_staff');
  if (error) throw error;
  return Array.isArray(data) ? data.map(parseStaffMember) : [];
}

export async function createPlatformStaff(input: CreatePlatformStaffInput): Promise<CreatePlatformStaffResult> {
  const { data, error } = await supabase.functions.invoke('control-platform-staff', {
    body: {
      email: input.email.trim().toLowerCase(),
      full_name: input.fullName.trim(),
      password: input.password,
      role: input.role,
    },
  });
  if (error) return throwFunctionError(error);

  const result = asRecord(data);
  if (result.error) throw new Error(String(result.error));
  return {
    accountStatus: result.account_status === 'created' ? 'created' : 'existing',
    staffStatus: result.staff_status === 'already_staff' ? 'already_staff' : 'created',
    staff: parseStaffMember(result.staff),
  };
}

export async function updatePlatformStaff(input: UpdatePlatformStaffInput): Promise<UpdatePlatformStaffResult> {
  const { data, error } = await supabase.functions.invoke('control-platform-staff', {
    method: 'PATCH',
    body: {
      user_id: input.userId,
      email: input.email.trim().toLowerCase(),
      full_name: input.fullName.trim(),
      password: input.password,
      role: input.role,
    },
  });
  if (error) return throwFunctionError(error);

  const result = asRecord(data);
  if (result.error) throw new Error(String(result.error));
  return { staff: parseStaffMember(result.staff) };
}

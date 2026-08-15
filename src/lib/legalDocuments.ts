import { supabase } from './supabase';

export type LegalDocumentKind = 'acceptance' | 'notice' | 'declaration';

export type LegalDocumentVersion = {
  key: string;
  version: string;
  kind: LegalDocumentKind;
  title: string;
  description: string;
  pdfUrl: string;
  acceptanceText: string;
  actionLabel: string;
  isRequired: boolean;
  sortOrder: number;
  publishedAt: string;
  isCurrent: boolean;
  isActive: boolean;
  acceptedCount: number;
  eligibleCount: number;
  pendingCount: number;
};

export type PublishLegalDocumentInput = {
  key: string;
  version: string;
  kind: LegalDocumentKind;
  title: string;
  description: string;
  acceptanceText: string;
  actionLabel: string;
  isRequired: boolean;
  sortOrder: number;
  activate: boolean;
  file: File;
};

const text = (value: unknown) => value?.toString() ?? '';
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export async function listLegalDocuments(): Promise<LegalDocumentVersion[]> {
  const { data, error } = await supabase.rpc('control_list_legal_documents');
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      key: text(row.key), version: text(row.version), kind: text(row.kind) as LegalDocumentKind,
      title: text(row.title), description: text(row.description), pdfUrl: text(row.pdf_url),
      acceptanceText: text(row.acceptance_text), actionLabel: text(row.action_label),
      isRequired: row.is_required === true, sortOrder: number(row.sort_order),
      publishedAt: text(row.published_at), isCurrent: row.is_current === true,
      isActive: row.is_active === true, acceptedCount: number(row.accepted_count),
      eligibleCount: number(row.eligible_count), pendingCount: number(row.pending_count),
    };
  });
}

export async function publishLegalDocument(input: PublishLegalDocumentInput): Promise<void> {
  if (input.file.type !== 'application/pdf') throw new Error('pdf_required');
  const key = input.key.trim().toLowerCase();
  const version = input.version.trim();
  const safeName = input.file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
  const path = `${version}/${key}-${Date.now()}-${safeName}`;
  const upload = await supabase.storage.from('legal-documents').upload(path, input.file, {
    contentType: 'application/pdf', upsert: false,
  });
  if (upload.error) throw upload.error;
  const { data: publicUrl } = supabase.storage.from('legal-documents').getPublicUrl(path);
  const { error } = await supabase.rpc('control_publish_legal_document', {
    p_key: key,
    p_version: version,
    p_kind: input.kind,
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_pdf_url: publicUrl.publicUrl,
    p_acceptance_text: input.acceptanceText.trim(),
    p_action_label: input.actionLabel.trim(),
    p_is_required: input.isRequired,
    p_sort_order: input.sortOrder,
    p_activate: input.activate,
  });
  if (error) throw error;
}

export async function setLegalDocumentActive(key: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('control_set_legal_document_active', {
    p_key: key,
    p_active: active,
  });
  if (error) throw error;
}

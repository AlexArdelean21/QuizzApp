import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LegalSlug } from "@/lib/legal/documents";

export interface CurrentLegalDocument {
  type: LegalSlug;
  version: string;
}

/**
 * Returnează versiunea curentă pentru fiecare tip de document legal.
 */
export async function getCurrentLegalDocuments(): Promise<CurrentLegalDocument[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("type, version")
    .eq("is_current", true);

  if (error || !data) return [];
  return data as CurrentLegalDocument[];
}

/**
 * Verifică dacă userul a acceptat versiunea curentă a unui document specific.
 */
export async function hasAcceptedCurrentVersion(
  userId: string,
  documentType: LegalSlug
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data: current } = await supabase
    .from("legal_documents")
    .select("version")
    .eq("type", documentType)
    .eq("is_current", true)
    .single();

  if (!current) return false;

  const { data: consent } = await supabase
    .from("user_consents")
    .select("id")
    .eq("user_id", userId)
    .eq("document_type", documentType)
    .eq("document_version", current.version)
    .maybeSingle();

  return consent !== null;
}

/**
 * Înregistrează consimțământul unui user pentru versiunea curentă a unui document.
 * Idempotent: dacă există deja, nu eroează (unique constraint + ignoreDuplicates).
 */
export async function recordConsent(
  userId: string,
  documentType: LegalSlug,
  documentVersion: string,
  metadata: { ipAddress?: string; userAgent?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("user_consents").upsert(
    {
      user_id: userId,
      document_type: documentType,
      document_version: documentVersion,
      ip_address: metadata.ipAddress ?? null,
      user_agent: metadata.userAgent ?? null,
    },
    { onConflict: "user_id,document_type,document_version", ignoreDuplicates: true }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

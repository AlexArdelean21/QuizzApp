import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LegalSlug } from "@/lib/legal/documents";

export interface PendingConsent {
  type: LegalSlug;
  version: string;
}

/**
 * Returnează lista documentelor (termeni/confidentialitate) pentru care
 * userul NU are consimțământ înregistrat la versiunea curentă.
 * Cookies este exclus intenționat — gestionat separat, prin banner.
 */
export async function getPendingConsents(userId: string): Promise<PendingConsent[]> {
  const supabase = await createSupabaseServerClient();

  const { data: currentDocs, error: docsError } = await supabase
    .from("legal_documents")
    .select("type, version")
    .eq("is_current", true)
    .in("type", ["termeni", "confidentialitate"]);

  if (docsError || !currentDocs) return [];

  const { data: userConsents, error: consentsError } = await supabase
    .from("user_consents")
    .select("document_type, document_version")
    .eq("user_id", userId);

  if (consentsError) return [];

  const acceptedSet = new Set(
    (userConsents ?? []).map((c) => `${c.document_type}:${c.document_version}`)
  );

  return (currentDocs as PendingConsent[]).filter(
    (doc) => !acceptedSet.has(`${doc.type}:${doc.version}`)
  );
}

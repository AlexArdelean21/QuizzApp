import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface RequestBody {
  userId: string;
  userAgent?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maximum age of a user account that qualifies for this route (15 minutes). */
const MAX_AGE_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, userAgent } = body;

  if (!userId || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY not configured — skip silently so signup isn't blocked
    console.warn("[record-signup-consent] SUPABASE_SERVICE_ROLE_KEY not set; skipping consent write.");
    return NextResponse.json({ success: true, skipped: true });
  }

  // Verify user exists and was created recently (prevents recording consent for arbitrary users)
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const createdAt = userData.user.created_at
    ? new Date(userData.user.created_at).getTime()
    : 0;
  const ageMs = Date.now() - createdAt;

  if (ageMs > MAX_AGE_MS) {
    return NextResponse.json(
      { error: "User account too old for this route" },
      { status: 403 }
    );
  }

  // Fetch current versions for termeni + confidentialitate
  const { data: docs, error: docsError } = await admin
    .from("legal_documents")
    .select("type, version")
    .in("type", ["termeni", "confidentialitate"])
    .eq("is_current", true);

  if (docsError || !docs?.length) {
    console.error("[record-signup-consent] Could not fetch legal_documents:", docsError);
    return NextResponse.json({ error: "Could not fetch document versions" }, { status: 500 });
  }

  // Upsert consent rows (idempotent)
  const rows = docs.map((doc) => ({
    user_id: userId,
    document_type: doc.type,
    document_version: doc.version,
    user_agent: userAgent ?? null,
  }));

  const { error: insertError } = await admin
    .from("user_consents")
    .upsert(rows, {
      onConflict: "user_id,document_type,document_version",
      ignoreDuplicates: true,
    });

  if (insertError) {
    console.error("[record-signup-consent] Insert failed:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

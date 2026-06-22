import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordConsent } from "@/lib/legal/consent";
import type { LegalSlug } from "@/lib/legal/documents";

interface AcceptPendingBody {
  documents: { type: LegalSlug; version: string }[];
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as AcceptPendingBody;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  const results = await Promise.all(
    body.documents.map((doc) =>
      recordConsent(user.id, doc.type, doc.version, { userAgent })
    )
  );

  const allSucceeded = results.every((r) => r.success);
  return NextResponse.json(
    { success: allSucceeded },
    { status: allSucceeded ? 200 : 207 }
  );
}

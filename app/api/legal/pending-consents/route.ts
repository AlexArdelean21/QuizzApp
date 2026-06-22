import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPendingConsents } from "@/lib/legal/check-pending-consents";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ pending: [] }, { status: 200 });
  }

  const pending = await getPendingConsents(user.id);
  return NextResponse.json({ pending, userId: user.id }, { status: 200 });
}

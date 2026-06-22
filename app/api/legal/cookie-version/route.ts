import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("version")
    .eq("type", "cookies")
    .eq("is_current", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ version: "1.0" }, { status: 200 });
  }

  return NextResponse.json({ version: data.version }, { status: 200 });
}

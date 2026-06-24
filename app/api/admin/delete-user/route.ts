import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, adminId } = body;

  if (!userId || !adminId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Vérifier que l'admin est bien admin
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminId)
    .single();

  if (!adminProfile || (adminProfile.role !== "admin" && adminProfile.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Supprimer avec le service_role (droits admin)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Supprimer le profil
  await supabaseAdmin.from("profiles").delete().eq("id", userId);

  // 2. Supprimer les sessions
  await supabaseAdmin.from("investigation_sessions").delete().eq("user_id", userId);

  // 3. Supprimer l'utilisateur auth
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // ✅ FIX SÉCURITÉ LUK-004: Ne JAMAIS faire confiance à adminId du body
  // On récupère l'utilisateur depuis le cookie de session
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Vérifier que l'appelant EST admin (pas adminId fourni)
  const supabaseCheck = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: callerProfile } = await supabaseCheck
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || (callerProfile.role !== "admin" && callerProfile.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  // ✅ Empêcher suppression de soi-même ou d'un superadmin par un admin simple
  if (userId === user.id) return NextResponse.json({ error: "Impossible" }, { status: 400 });

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
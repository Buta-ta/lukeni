import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

// ✅ Whitelist stricte
const ALLOWED_FOLDERS = ["avatars", "articles", "books", "investigations", "press", "library"];
const ALLOWED_PARAMS = ["timestamp", "folder", "public_id", "eager", "upload_preset"];

export async function POST(request: Request) {
  try {
    // ✅ FIX LUK-005: Auth + rôle admin/contributeur
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    if (!supabaseAdmin) return NextResponse.json({ error: "Config manquante" }, { status: 500 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    // Autoriser admin/superadmin + user authentifié pour avatar uniquement
    const isPrivileged = profile && ["admin", "superadmin"].includes(profile.role);

    const body = await request.json();
    const { paramsToSign } = body;

    if (!paramsToSign || typeof paramsToSign !== "object") {
      return NextResponse.json({ error: "paramsToSign manquant" }, { status: 400 });
    }

    // ✅ Validation timestamp (doit être récent, ±5min)
    const ts = Number(paramsToSign.timestamp);
    if (!ts || Math.abs(Date.now()/1000 - ts) > 300) {
      return NextResponse.json({ error: "Timestamp invalide ou expiré" }, { status: 400 });
    }

    // ✅ Filtrer params non autorisés
    for (const key of Object.keys(paramsToSign)) {
      if (!ALLOWED_PARAMS.includes(key)) {
        return NextResponse.json({ error: `Paramètre non autorisé: ${key}` }, { status: 400 });
      }
    }

    // ✅ Folder whitelist
    if (paramsToSign.folder) {
      if (!ALLOWED_FOLDERS.includes(paramsToSign.folder)) {
        return NextResponse.json({ error: `Dossier non autorisé: ${paramsToSign.folder}` }, { status: 400 });
      }
      // Utilisateur simple ne peut uploader que dans avatars
      if (!isPrivileged && paramsToSign.folder !== "avatars") {
        return NextResponse.json({ error: "Droits insuffisants pour ce dossier" }, { status: 403 });
      }
    } else {
      // Par défaut, forcer un dossier selon le rôle
      paramsToSign.folder = isPrivileged ? "articles" : "avatars";
    }

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) throw new Error("Clé secrète Cloudinary manquante");

    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join("&");

    const stringToSign = sortedParams + apiSecret;
    const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

    console.log(`[CLOUDINARY] sign by ${user.id} (${profile?.role}) folder=${paramsToSign.folder}`);

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("Erreur de signature:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
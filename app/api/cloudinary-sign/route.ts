import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Dossiers généraux autorisés.
 * Ces valeurs doivent correspondre exactement
 * aux valeurs envoyées par les widgets Cloudinary.
 */
const ALLOWED_FOLDERS = new Set([
  "avatars",
  "articles",
  "books",
  "investigations",
  "press",
  "library",
]);

/**
 * Dossiers audio des dialogues bilingues.
 *
 * On accepte les deux formats afin d'éviter les erreurs
 * si le frontend utilise ou non le préfixe "lukeni/".
 */
const ALLOWED_DIALOGUE_FOLDERS = new Set([
  "dialogue-audio",
  "dialogue-audio/fr",
  "dialogue-audio/en",
  "lukeni/dialogue-audio",
  "lukeni/dialogue-audio/fr",
  "lukeni/dialogue-audio/en",
]);

const ALLOWED_PARAMS = new Set([
  "timestamp",
  "folder",
  "public_id",
  "eager",
  "upload_preset",
]);

function isAllowedFolder(folder: unknown): folder is string {
  if (typeof folder !== "string") {
    return false;
  }

  return (
    ALLOWED_FOLDERS.has(folder) ||
    ALLOWED_DIALOGUE_FOLDERS.has(folder)
  );
}

export async function POST(request: Request) {
  try {
    /*
     * 1. Vérifier la session Supabase
     */
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    /*
     * 2. Vérifier la configuration Supabase serveur
     */
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Configuration Supabase serveur manquante" },
        { status: 500 }
      );
    }

    /*
     * 3. Vérifier le rôle du compte
     */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil utilisateur introuvable" },
        { status: 403 }
      );
    }

    const isPrivileged =
      profile.role === "admin" ||
      profile.role === "superadmin";

    /*
     * 4. Lire les paramètres Cloudinary
     */
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide" },
        { status: 400 }
      );
    }

    const paramsToSign =
      typeof body === "object" &&
      body !== null &&
      "paramsToSign" in body
        ? (body as { paramsToSign?: unknown }).paramsToSign
        : undefined;

    if (
      !paramsToSign ||
      typeof paramsToSign !== "object" ||
      Array.isArray(paramsToSign)
    ) {
      return NextResponse.json(
        { error: "paramsToSign manquant ou invalide" },
        { status: 400 }
      );
    }

    /*
     * Copie locale pour éviter de modifier directement
     * l'objet reçu dans la requête.
     */
    const params = {
      ...(paramsToSign as Record<string, unknown>),
    };

    /*
     * 5. Vérifier le timestamp Cloudinary
     */
    const timestamp = Number(params.timestamp);
    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (
      !Number.isInteger(timestamp) ||
      Math.abs(nowInSeconds - timestamp) > 300
    ) {
      return NextResponse.json(
        { error: "Timestamp invalide ou expiré" },
        { status: 400 }
      );
    }

    /*
     * 6. Vérifier les paramètres autorisés
     */
    for (const key of Object.keys(params)) {
      if (!ALLOWED_PARAMS.has(key)) {
        return NextResponse.json(
          {
            error: `Paramètre Cloudinary non autorisé: ${key}`,
          },
          { status: 400 }
        );
      }
    }

    /*
     * 7. Vérifier le dossier Cloudinary
     */
    let folder = params.folder;

    if (!folder) {
      folder = isPrivileged ? "articles" : "avatars";
      params.folder = folder;
    }

    if (!isAllowedFolder(folder)) {
      return NextResponse.json(
        {
          error: `Dossier Cloudinary non autorisé: ${String(folder)}`,
        },
        { status: 400 }
      );
    }

    /*
     * 8. Les comptes non privilégiés ne peuvent utiliser
     * que le dossier avatars.
     *
     * Les dialogues audio sont réservés aux admins
     * et superadmins.
     */
    if (!isPrivileged && folder !== "avatars") {
      return NextResponse.json(
        {
          error:
            "Droits insuffisants pour ce dossier Cloudinary",
        },
        { status: 403 }
      );
    }

    /*
     * 9. Récupérer la clé secrète Cloudinary
     */
    const apiSecret =
      process.env.CLOUDINARY_API_SECRET?.trim();

    if (!apiSecret) {
      console.error(
        "CLOUDINARY_API_SECRET est absente"
      );

      return NextResponse.json(
        {
          error:
            "Clé secrète Cloudinary manquante côté serveur",
        },
        { status: 500 }
      );
    }

    /*
     * 10. Construire la signature Cloudinary
     */
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const stringToSign = `${sortedParams}${apiSecret}`;

    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex");

    console.log(
      `[CLOUDINARY] Signature générée pour ${user.id} ` +
      `(role=${profile.role}, folder=${folder})`
    );

    return NextResponse.json({ signature });
  } catch (error) {
    console.error(
      "Erreur interne de signature Cloudinary:",
      error
    );

    return NextResponse.json(
      { error: "Erreur interne de signature Cloudinary" },
      { status: 500 }
    );
  }
}
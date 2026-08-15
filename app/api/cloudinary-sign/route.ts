import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Tous les dossiers Cloudinary utilisés par l'application.
 *
 * Attention :
 * cette whitelist ne protège que les uploads qui passent
 * par /api/cloudinary-sign avec uploadSignature.
 *
 * Les uploads utilisant uploadPreset en mode unsigned
 * contournent cette route.
 */
const ALLOWED_FOLDERS = new Set([
  // Dossiers généraux
  "avatars",
  "articles",
  "books",
  "press",
  "library",

  // Articles et contenus audio
  "articles/audio",

  // Investigations
  "lukeni/investigation_board",
  "lukeni/investigations",
  "lukeni/investigations/intro",
  "lukeni/investigations/minigames",
  "lukeni/investigations/minigames/documents",

  // Personnages et dialogues
  "lukeni/characters",
  "lukeni/dialogue-speakers",
  "lukeni/dialogue-audio",
  "lukeni/dialogue-audio/fr",
  "lukeni/dialogue-audio/en",

  // Format recommandé pour les nouveaux audios bilingues
  "dialogue-audio",
  "dialogue-audio/fr",
  "dialogue-audio/en",

  // Tableau d'enquête
  "lukeni/board-nodes",

  // Bibliothèque
  "lukeni/library",
  "lukeni/library/collage",
  "lukeni/library/teaser",
  "lukeni/library/submissions",

  // Panoramas et scènes
  "lukeni/hotspot-icons",
  "lukeni/scene-media",
  "lukeni/scenes",
  "lukeni/intros",
  "lukeni/judgments",
  "lukeni/hotspot-audio",

  // Rangs
  "lukeni/ranks",
]);

/**
 * Paramètres que Cloudinary a le droit de faire signer.
 */
const ALLOWED_PARAMS = new Set([
  "timestamp",
  "folder",
  "public_id",
  "eager",
  "upload_preset",
  "source",
]);

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
        {
          error: "Non authentifié",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * 2. Vérifier le client Supabase serveur
     */
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: "Configuration Supabase serveur manquante",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * 3. Vérifier le profil et le rôle
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "Profil utilisateur introuvable",
        },
        {
          status: 403,
        }
      );
    }

    const isPrivileged =
      profile.role === "admin" ||
      profile.role === "superadmin";

    /*
     * 4. Lire le corps JSON
     */
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Corps de requête JSON invalide",
        },
        {
          status: 400,
        }
      );
    }

    const paramsToSign =
      typeof body === "object" &&
      body !== null &&
      "paramsToSign" in body
        ? (body as {
            paramsToSign?: unknown;
          }).paramsToSign
        : undefined;

    if (
      !paramsToSign ||
      typeof paramsToSign !== "object" ||
      Array.isArray(paramsToSign)
    ) {
      return NextResponse.json(
        {
          error: "paramsToSign manquant ou invalide",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Copie locale des paramètres.
     * On ne modifie pas directement l'objet reçu.
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
        {
          error: "Timestamp invalide ou expiré",
        },
        {
          status: 400,
        }
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
          {
            status: 400,
          }
        );
      }
    }

    /*
     * 7. Vérifier le dossier Cloudinary
     */
    let folder = params.folder;

    /*
     * Si aucun dossier n'est fourni,
     * on applique un dossier par défaut.
     */
    if (!folder) {
      folder = isPrivileged ? "articles" : "avatars";
      params.folder = folder;
    }

    if (
      typeof folder !== "string" ||
      !ALLOWED_FOLDERS.has(folder)
    ) {
      return NextResponse.json(
        {
          error: `Dossier Cloudinary non autorisé: ${String(folder)}`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 8. Les utilisateurs non privilégiés
     * peuvent uniquement uploader dans avatars.
     *
     * Les dialogues audio, les articles,
     * les investigations et les médias admin
     * sont réservés aux admins et superadmins.
     */
    if (!isPrivileged && folder !== "avatars") {
      return NextResponse.json(
        {
          error:
            "Droits insuffisants pour ce dossier Cloudinary",
        },
        {
          status: 403,
        }
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
        {
          status: 500,
        }
      );
    }

    /*
     * 10. Construire la chaîne à signer
     */
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const stringToSign =
      `${sortedParams}${apiSecret}`;

    /*
     * 11. Générer la signature Cloudinary
     */
    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex");

    console.log(
      `[CLOUDINARY] Signature générée - ` +
      `user=${user.id} ` +
      `role=${profile.role} ` +
      `folder=${folder}`
    );

    return NextResponse.json({
      signature,
    });
  } catch (error) {
    console.error(
      "Erreur interne de signature Cloudinary:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erreur interne de signature Cloudinary",
      },
      {
        status: 500,
      }
    );
  }
}

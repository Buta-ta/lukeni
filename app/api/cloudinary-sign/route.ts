import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paramsToSign } = body;

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      throw new Error("Clé secrète Cloudinary manquante dans le fichier .env.local");
    }

    // 1. Trier les paramètres alphabétiquement (exigence de Cloudinary)
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join("&");

    // 2. Concaténer avec le secret API
    const stringToSign = sortedParams + apiSecret;

    // 3. Créer la signature SHA-1
    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex");

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("Erreur de signature:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
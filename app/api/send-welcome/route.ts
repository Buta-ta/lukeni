// app/api/send-welcome/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// ── Installer nodemailer : npm install nodemailer @types/nodemailer ──

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function buildWelcomeEmail(fullName: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bienvenue sur Lukeni</title>
</head>
<body style="margin:0;padding:0;background-color:#020111;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#020111;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td align="center" style="padding:40px 40px 20px;">
              <!-- Cauris ASCII -->
              <div style="font-size:48px;color:#D4AF37;letter-spacing:4px;">◉</div>
              <h1 style="color:#D4AF37;font-size:28px;letter-spacing:8px;margin:12px 0 4px;font-weight:normal;">
                LUKENI
              </h1>
              <p style="color:#ffffff40;font-size:11px;letter-spacing:4px;margin:0;text-transform:uppercase;">
                Mémoire • Musique • Genèse
              </p>
            </td>
          </tr>

          <!-- ── CORPS ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a,#0f0f1a);border:1px solid #D4AF3730;border-radius:16px;padding:40px;">

              <!-- Salutation -->
              <p style="color:#D4AF37;font-size:22px;margin:0 0 16px;">
                Bienvenue, ${fullName || 'Explorateur'} 👋
              </p>

              <p style="color:#cccccc;font-size:15px;line-height:1.8;margin:0 0 24px;">
                Tu fais maintenant partie de <strong style="color:#D4AF37;">Lukeni</strong> — 
                une constellation vivante dédiée à la mémoire, la musique et la genèse 
                des peuples d'Afrique et de sa diaspora.
              </p>

              <!-- Séparateur -->
              <div style="height:1px;background:linear-gradient(to right,transparent,#D4AF3760,transparent);margin:24px 0;"></div>

              <!-- Ce qui t'attend -->
              <p style="color:#ffffff80;font-size:13px;text-transform:uppercase;letter-spacing:3px;margin:0 0 16px;">
                Ce qui t'attend
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#D4AF37;font-size:16px;">📖</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      Une encyclopédie vivante de l'histoire africaine
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#D4AF37;font-size:16px;">🎵</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      Un voyage musical à travers les ères et les continents
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#D4AF37;font-size:16px;">⭐</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      Des personnalités qui ont forgé l'histoire
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#D4AF37;font-size:16px;">🌍</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      Une constellation d'événements à explorer
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Séparateur -->
              <div style="height:1px;background:linear-gradient(to right,transparent,#D4AF3760,transparent);margin:32px 0;"></div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/explore"
                      style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E5C158);color:#000000;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:15px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
                      Entrer dans la Constellation ✦
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td align="center" style="padding:24px 40px;">
              <p style="color:#ffffff20;font-size:11px;margin:0;line-height:1.8;">
                Tu reçois cet email car tu t'es inscrit sur Lukeni.<br/>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color:#D4AF3760;text-decoration:none;">
                  lukeni.app
                </a>
                &nbsp;•&nbsp;
                <a href="mailto:lukeni.team@gmail.com" style="color:#D4AF3760;text-decoration:none;">
                  lukeni.team@gmail.com
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const { email, fullName } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"Lukeni ✦" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✦ Bienvenue dans la Constellation Lukeni',
      html: buildWelcomeEmail(fullName, email),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
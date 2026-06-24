// app/api/send-welcome/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ✅ EMAIL EN FRANÇAIS
function buildWelcomeEmailFR(fullName: string, email: string): string {
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

          <!-- ── HEADER AVEC CAURIS ── -->
          <tr>
            <td align="center" style="padding:40px 40px 20px;">
              <svg viewBox="0 0 100 100" width="48" height="48" style="fill:#D4AF37;margin-bottom:12px;">
                <defs>
                  <linearGradient id="caurisGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="1" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <path fill="url(#caurisGlow)" d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
                <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" fill="#D4AF37" />
                <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h1 style="color:#D4AF37;font-size:28px;letter-spacing:8px;margin:12px 0 4px;font-weight:normal;">
                LUKENI
              </h1>
              <p style="color:#ffffff40;font-size:11px;letter-spacing:4px;margin:0;text-transform:uppercase;">
                Peuple • Mémoire • Mission
              </p>
            </td>
          </tr>

          <!-- ── CORPS ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a,#0f0f1a);border:1px solid #D4AF3730;border-radius:16px;padding:40px;">

              <!-- Accroche -->
              <p style="color:#D4AF37;font-size:20px;margin:0 0 20px;font-style:italic;">
                L'histoire a besoin de témoins. Tu en es désormais un.
              </p>

              <!-- Salutation + intro -->
              <p style="color:#cccccc;font-size:15px;line-height:1.8;margin:0 0 24px;">
                Bienvenue, <strong style="color:#D4AF37;">${fullName || 'Explorateur'}</strong> 👋
              </p>

              <p style="color:#cccccc;font-size:15px;line-height:1.8;margin:0 0 32px;">
                Tu fais maintenant partie de <strong style="color:#D4AF37;">Lukeni</strong> — 
                une constellation vivante dédiée à la mémoire des peuples d'Afrique et de sa diaspora.
              </p>

              <!-- Citation Cheikh Anta Diop -->
              <div style="background:#D4AF3715;border-left:4px solid #D4AF37;padding:24px;margin:32px 0;border-radius:8px;">
                <p style="color:#D4AF37;font-size:15px;line-height:1.8;margin:0 0 16px;font-style:italic;">
                  "Formez-vous, armez-vous de sciences jusqu'aux dents (…) et arrachez votre patrimoine culturel."
                </p>
                <p style="color:#D4AF37;font-size:13px;margin:0;font-weight:bold;letter-spacing:2px;">
                  — CHEIKH ANTA DIOP
                </p>
              </div>

              <!-- Phrase après citation -->
              <p style="color:#cccccc;font-size:15px;line-height:1.8;margin:0 0 32px;">
                C'est pourquoi Lukeni existe. Pour que ta mémoire te parle dans ta propre voix.
              </p>

              <!-- Séparateur -->
              <div style="height:1px;background:linear-gradient(to right,transparent,#D4AF3760,transparent);margin:32px 0;"></div>

              <!-- Ce qui t'attend -->
              <p style="color:#ffffff80;font-size:13px;text-transform:uppercase;letter-spacing:3px;margin:0 0 20px;">
                Ce qui t'attend
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#D4AF37;font-size:16px;">📖</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      Une encyclopédie vivante de l'histoire africaine
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#D4AF37;font-size:16px;">🎵</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      Un voyage musical à travers les ères et les continents
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#D4AF37;font-size:16px;">⭐</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      Des personnalités qui ont forgé l'histoire
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
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

// ✅ EMAIL EN ANGLAIS
function buildWelcomeEmailEN(fullName: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Lukeni</title>
</head>
<body style="margin:0;padding:0;background-color:#020111;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#020111;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- ── HEADER WITH CAURIS ── -->
          <tr>
            <td align="center" style="padding:40px 40px 20px;">
              <svg viewBox="0 0 100 100" width="48" height="48" style="fill:#D4AF37;margin-bottom:12px;">
                <defs>
                  <linearGradient id="caurisGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="1" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <path fill="url(#caurisGlow)" d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" />
                <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" fill="#D4AF37" />
                <path d="M35 40L42 42M35 50L42 50M35 60L42 58M65 40L58 42M65 50L58 50M65 60L58 58" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h1 style="color:#D4AF37;font-size:28px;letter-spacing:8px;margin:12px 0 4px;font-weight:normal;">
                LUKENI
              </h1>
              <p style="color:#ffffff40;font-size:11px;letter-spacing:4px;margin:0;text-transform:uppercase;">
                Memory • Music • Genesis
              </p>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a,#0f0f1a);border:1px solid #D4AF3730;border-radius:16px;padding:40px;">

              <!-- Hook -->
              <p style="color:#D4AF37;font-size:20px;margin:0 0 20px;font-style:italic;">
                History needs witnesses. You are now one.
              </p>

              <!-- Greeting + intro -->
              <p style="color:#cccccc;font-size:15px;line-height:1.8;margin:0 0 24px;">
                Welcome, <strong style="color:#D4AF37;">${fullName || 'Explorer'}</strong> 👋
              </p>

              <p style="color:#cccccc;font-size:15px;line-height:1.8;margin:0 0 32px;">
                You are now part of <strong style="color:#D4AF37;">Lukeni</strong> — 
                a living constellation dedicated to the memory of African peoples and their diaspora.
              </p>

              <!-- Citation Cheikh Anta Diop -->
              <div style="background:#D4AF3715;border-left:4px solid #D4AF37;padding:24px;margin:32px 0;border-radius:8px;">
                <p style="color:#D4AF37;font-size:15px;line-height:1.8;margin:0 0 16px;font-style:italic;">
                  "Educate yourselves, arm yourselves with science to the teeth (…) and reclaim your cultural heritage."
                </p>
                <p style="color:#D4AF37;font-size:13px;margin:0;font-weight:bold;letter-spacing:2px;">
                  — CHEIKH ANTA DIOP
                </p>
              </div>

              <!-- Phrase after citation -->
              <p style="color:#cccccc;font-size:15px;line-height:1.8;margin:0 0 32px;">
                That is why Lukeni exists. So that your memory speaks to you in your own voice.
              </p>

              <!-- Separator -->
              <div style="height:1px;background:linear-gradient(to right,transparent,#D4AF3760,transparent);margin:32px 0;"></div>

              <!-- What awaits you -->
              <p style="color:#ffffff80;font-size:13px;text-transform:uppercase;letter-spacing:3px;margin:0 0 20px;">
                What Awaits You
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#D4AF37;font-size:16px;">📖</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      A living encyclopedia of African history
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#D4AF37;font-size:16px;">🎵</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      A musical journey through eras and continents
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#D4AF37;font-size:16px;">⭐</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      Personalities who shaped history
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#D4AF37;font-size:16px;">🌍</span>
                    <span style="color:#cccccc;font-size:14px;margin-left:12px;">
                      A constellation of events to explore
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Separator -->
              <div style="height:1px;background:linear-gradient(to right,transparent,#D4AF3760,transparent);margin:32px 0;"></div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/explore"
                      style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E5C158);color:#000000;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:15px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
                      Enter the Constellation ✦
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
                You received this email because you signed up on Lukeni.<br/>
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
    const { email, fullName, lang = 'fr' } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // ✅ Déterminer la langue et construire le bon template
    const isFrench = lang === 'fr';
    const htmlContent = isFrench 
      ? buildWelcomeEmailFR(fullName, email)
      : buildWelcomeEmailEN(fullName, email);

    const subject = isFrench
      ? '✦ Bienvenue dans la Constellation Lukeni'
      : '✦ Welcome to the Lukeni Constellation';

    // ✅ Envoyer un seul email (dans la langue de l'utilisateur)
    await transporter.sendMail({
      from: `"Lukeni ✦" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: subject,
      html: htmlContent,
    });

    console.log(`✅ Email de bienvenue envoyé à ${email} (${lang})`);

    return NextResponse.json({ 
      success: true,
      message: `Welcome email sent to ${email}`,
      language: lang
    });

  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
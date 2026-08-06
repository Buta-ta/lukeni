import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

export async function POST(req: NextRequest) {
  // ✅ FIX: Protéger par CRON_SECRET
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) return NextResponse.json({ error: 'Missing' }, { status: 400 });
    await transporter.sendMail({ from: `"Lukeni Team" <${process.env.GMAIL_USER}>`, to, subject, html });
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
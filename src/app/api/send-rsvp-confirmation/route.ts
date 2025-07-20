import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { kv } from '@vercel/kv';

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("📨 Received RSVP confirmation request:", body);

  const { name, email, eventName, creatorName, id } = body;

  if (!name || !email || !eventName || !creatorName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // Load creatorEmail from KV
  let creatorEmail: string | undefined;
  try {
    const metaRaw = await kv.get(`meta:${id}`);
    if (metaRaw) {
      const meta = metaRaw as { creatorEmail?: string };
      creatorEmail = meta.creatorEmail;
    }
  } catch {
    console.warn('⚠️ Could not load metadata from KV');
  }

  // ⛔ Skip sending if user is the creator
  if (creatorEmail && creatorEmail === email) {
    console.log(`⛔ Skipping RSVP confirmation email for creator: ${email}`);
    return NextResponse.json({ success: true, skippedCreator: true });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `Prikkr <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your availability has been received!',
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
          <img src="https://prikkr.com/images/prikkr_logo_transparent.png" alt="Prikkr logo" style="height: 50px; margin-bottom: 10px;" />
          <p>Hi ${name},</p>
          <p>You have filled in your availability for <strong>${eventName}</strong>!</p>
          <p>Please wait for <strong>${creatorName}</strong> to Prikkr the final date.</p>
          <br />
          <p>Thank you for using 📌Prikkr!<br />— The Prikkr team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📨 RSVP confirmation sent to ${email}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to send RSVP confirmation email:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

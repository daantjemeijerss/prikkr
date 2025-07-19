import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("📨 Received RSVP confirmation request:", body);
  const { name, email, eventName, creatorName, id } = body;

  if (!name || !email || !eventName || !creatorName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Load meta.json to find creatorEmail
  const metaPath = path.resolve(process.cwd(), 'meta.json');
  let meta: Record<string, any> = {};
  try {
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    meta = JSON.parse(metaContent);
  } catch {
    console.warn('⚠️ No meta.json found or failed to load');
  }

  // ⛔ Skip sending email if participant is the creator
  if (meta[id]?.creatorEmail && meta[id].creatorEmail === email) {
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

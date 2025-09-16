// src/app/api/save-meta/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import nodemailer from 'nodemailer';

async function sendResultsEmail(to: string, name: string, eventName: string, id: string) {
  const shareLink = `https://prikkr.com/rsvp/${id}/login`;
  const resultsLink = `https://prikkr.com/results/${id}`;
  const validUntil = new Date(); validUntil.setFullYear(validUntil.getFullYear() + 1);
  const validDate = validUntil.toISOString().split('T')[0];

  const transporter = nodemailer.createTransport({
    service: 'gmail',           // or host: 'smtp.gmail.com', port: 465, secure: true
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // use a Gmail App Password (see step 2)
    },
  });

  await transporter.sendMail({
    from: `Prikkr <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your Prikkr: ${eventName}`,
    html: `
      <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">
        <p>Hi ${name || 'there'},</p>
        <p>You created <strong>${eventName}</strong>.</p>
        <p>Invite others: <a href="${shareLink}">${shareLink}</a></p>
        <p>View results: <a href="${resultsLink}">${resultsLink}</a></p>
        <p>Valid until <strong>${validDate}</strong></p>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, range, extendedHours, slotDuration, creatorEmail, creatorName, eventName } = body;

    if (!id || !range || typeof extendedHours !== 'boolean' || !creatorEmail || !eventName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      range,
      extendedHours,
      slotDuration,
      creatorEmail,
      creatorName,
      eventName,
      createdAt: Date.now(),
    };

    // Save to KV first (object, no stringify needed)
    await kv.set(`meta:${id}`, payload);

    // Try email, but don’t let failure break creation
    let emailOk = true;
    try {
      await sendResultsEmail(creatorEmail, creatorName, eventName, id);
    } catch (e: any) {
      emailOk = false;
      console.error('sendResultsEmail failed:', e?.message || e);
    }

    return NextResponse.json({ ok: true, emailOk });
  } catch (err: any) {
    console.error('save-meta error:', err?.message || err);
    return NextResponse.json({ error: 'Failed to save metadata' }, { status: 500 });
  }
}

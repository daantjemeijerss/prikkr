import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const filePath = path.resolve(process.cwd(), 'meta.json');

async function sendResultsEmail(to: string, name: string, eventName: string, id: string) {
  const shareLink = `https://prikkr.onrender.com/rsvp/${id}/login`;
  const resultsLink = `https://prikkr.onrender.com/results/${id}`;
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const validDate = validUntil.toISOString().split('T')[0];

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const mailOptions = {
  from: `Prikkr <${process.env.EMAIL_USER}>`,
  to,
  subject: `Your Prikkr: ${eventName}`,
  html: `
    <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5;">
      <img src="https://prikkr.vercel.app/images/prikkr_logo_transparent.png" alt="Prikkr logo" style="height: 60px; margin-bottom: 20px;" />
      <p>Hi ${name || 'there'},</p>
      <p>You just created a new <strong>Prikkr</strong> event: <strong>${eventName}</strong></p>

      <p>🧑‍🤝‍🧑 <strong>Invite other people</strong> with this link:<br/>
      <a href="${shareLink}" style="color: #2563eb;">${shareLink}</a></p>

      <p>📊 <strong>View availability responses</strong> here:<br/>
      <a href="${resultsLink}" style="color: #2563eb;">${resultsLink}</a></p>

      <p>🗓️ This link will be valid until: <strong>${validDate}</strong></p>

      <br />
      <p>Thank you for using 📌Prikkr!<br/>— The Prikkr Team</p>
    </div>
  `,
};


  await transporter.sendMail(mailOptions);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, range, extendedHours, creatorEmail, creatorName, eventName } = body;

    if (!id || !range || typeof extendedHours !== 'boolean' || !creatorEmail || !eventName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let existing = {};
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(content);
    } catch {
      console.log('No existing meta.json file found, creating new one.');
    }

    const updated = {
      ...existing,
      [id]: { range, extendedHours, creatorEmail, creatorName, eventName },
    };

    console.log('📝 Saving to meta.json:', { id, range, extendedHours, creatorEmail, creatorName, eventName });

    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    await sendResultsEmail(creatorEmail, creatorName, eventName, id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save metadata' }, { status: 500 });
  }
}

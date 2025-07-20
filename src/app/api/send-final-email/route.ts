import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { kv } from '@vercel/kv';

function formatEmailDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export async function POST(req: NextRequest) {
  console.log('📨 [send-final-email] Route triggered');

  try {
    const { id, date, time } = await req.json();
    console.log('📨 Sending for:', { id, date, time });

    if (!id || !date || !time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load metadata
    const metaRaw = await kv.get(`meta:${id}`);
    if (!metaRaw) {
      return NextResponse.json({ error: 'Event ID not found in metadata' }, { status: 404 });
    }

    const eventMeta = metaRaw as {
      creatorEmail: string;
      creatorName: string;
      eventName: string;
    };
    const { creatorEmail, creatorName, eventName } = eventMeta;

    // Load responses
    const responsesRaw = await kv.get(`responses:${id}`);
    const responses = Array.isArray(responsesRaw) ? responsesRaw : [];

    const participantEmails = responses
      .map((r: any) => r.email)
      .filter((e: string) => e && e !== creatorEmail);

    const participantNames: Record<string, string> = {};
    responses.forEach((r: any) => {
      if (r.email) participantNames[r.email] = r.name;
    });

    const formattedDate = formatEmailDate(date);
    const formattedDateTime = `<strong>📅 ${formattedDate}<br>🕒 ${time}</strong>`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send to participants
    for (const email of participantEmails) {
      const name = participantNames[email] || 'there';

      console.log(`📧 Sending email to participant: ${email} (${name})`);

      const mailOptions = {
        from: `Prikkr <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your confirmed Prikkr date!',
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
            <img src="https://prikkr.com/images/prikkr_logo_transparent.png" alt="Prikkr logo" style="height: 50px; margin-bottom: 10px;" />
            <p>Hi ${name},</p>
            <p>Are you ready for your meeting or event?</p>
            <p><strong>${creatorName}</strong> has <strong>Prikkred</strong> the date!</p>
            <p>${eventName} will take place on:<br>${formattedDateTime}</p>
            <br />
            <p>Thank you for using 📌Prikkr!<br/>— The Prikkr Team</p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${email}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${email}:`, error);
      }
    }

    // Send to creator
    const creatorMailOptions = {
      from: `Prikkr <${process.env.EMAIL_USER}>`,
      to: creatorEmail,
      subject: 'You confirmed your Prikkr date!',
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
          <img src="https://prikkr.com/images/prikkr_logo_transparent.png" alt="Prikkr logo" style="height: 50px; margin-bottom: 10px;" />
          <p>Hi ${creatorName},</p>
          <p>You have <strong>Prikkred</strong> the date for your meeting or event!</p>
          <p>${eventName} will take place on:<br>${formattedDateTime}</p>
          <br />
          <p>Thank you for using 📌Prikkr!<br/>— The Prikkr Team</p>
        </div>
      `,
    };

    await transporter.sendMail(creatorMailOptions);
    console.log('✅ [send-final-email] All emails sent');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to send emails:', err);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}

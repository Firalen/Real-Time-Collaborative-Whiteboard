/**
 * Email service — uses nodemailer when SMTP is configured, logs to console in dev.
 */
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    return null;
  }

  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const transport = await getTransporter();
  const from = process.env.SMTP_FROM || 'whiteboard@localhost';

  if (!transport) {
    console.log(`[email] To: ${to} | Subject: ${subject}`);
    console.log(`[email] ${text}`);
    return { messageId: 'dev-mode' };
  }

  return transport.sendMail({ from, to, subject, text, html });
}

async function sendInvitationEmail({ to, workspaceName, inviteUrl, inviterName }) {
  return sendEmail({
    to,
    subject: `You're invited to join ${workspaceName}`,
    text: `${inviterName} invited you to collaborate on ${workspaceName}.\n\nAccept: ${inviteUrl}`,
    html: `<p><strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong>.</p>
           <p><a href="${inviteUrl}">Accept invitation</a></p>`,
  });
}

module.exports = { sendEmail, sendInvitationEmail };

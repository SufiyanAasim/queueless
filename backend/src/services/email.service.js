const config = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.email.host) return null;

  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
  return transporter;
}

async function sendTokenEmail({ to, token, trackingUrl }) {
  const t = getTransporter();
  if (!t) return;

  const serviceLabel = {
    general: 'General Inquiry',
    consultation: 'Consultation',
    transaction: 'Transaction',
  }[token.service] || token.service;

  const tokenNum = String(token.number).padStart(2, '0');
  const issuedAt = new Date(token.issuedAt).toLocaleString();

  await t.sendMail({
    from: `"QueueLess" <${config.email.from}>`,
    to,
    subject: `Your token is #${tokenNum} — ${serviceLabel}`,
    text: [
      `Your QueueLess Token`,
      ``,
      `Token Number : #${tokenNum}`,
      `Service      : ${serviceLabel}`,
      `Issued At    : ${issuedAt}`,
      ``,
      `Track your position live:`,
      trackingUrl,
      ``,
      `Stay nearby — we'll call your number soon.`,
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F7F3EC;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FDFAF5;border:1px solid #E0D9CE;max-width:560px;width:100%;">

        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #E0D9CE;">
            <span style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#8A8278;">QueueLess</span>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 40px 16px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8A8278;">${serviceLabel}</p>
            <p style="margin:0;font-size:96px;font-weight:700;line-height:1;letter-spacing:-0.04em;color:#1A1714;">#${tokenNum}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#6B6560;">Issued ${issuedAt}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 40px;text-align:center;border-top:1px solid #E0D9CE;padding-top:32px;">
            <p style="margin:0 0 20px;font-size:14px;color:#3D3A36;">Track your position live — no refresh needed.</p>
            <a href="${trackingUrl}"
               style="display:inline-block;background:#1A1714;color:#F7F3EC;text-decoration:none;padding:14px 32px;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">
              View My Token →
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 40px;border-top:1px solid #E0D9CE;">
            <p style="margin:0;font-size:11px;color:#A09890;text-align:center;">
              Stay nearby — your number will be called soon.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

module.exports = { sendTokenEmail };

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
  ignoreTLS: true,
});

// Never lets an email failure break the operation that triggered it (e.g. posting a
// comment shouldn't 500 just because the mail server is unreachable) — logged, not thrown.
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "HelpDesk Pro <noreply@helpdeskpro.local>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send email:", err.message);
  }
}

module.exports = { sendEmail };

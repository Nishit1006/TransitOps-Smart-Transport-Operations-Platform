import transporter from "../config/mailer.js";

const FROM_NAME = process.env.SMTP_FROM_NAME || "TransitOps";

/**
 * sendMail — generic SMTP send helper.
 * @param {{ to: string, subject: string, text?: string, html?: string }} options
 */
export const sendMail = async ({ to, subject, text, html }) => {
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    text,
    html,
  });
};

/**
 * sendOtpEmail — sends a one-time password to the given address.
 * @param {string} to
 * @param {string} otp
 * @param {number} validityMinutes
 */
export const sendOtpEmail = async (to, otp, validityMinutes) => {
  await sendMail({
    to,
    subject: "Your TransitOps verification code",
    text: `Your OTP code is ${otp}. It is valid for ${validityMinutes} minutes.`,
    html: `<p>Your OTP code is <strong>${otp}</strong>. It is valid for ${validityMinutes} minutes.</p>`,
  });
};

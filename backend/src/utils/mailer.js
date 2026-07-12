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

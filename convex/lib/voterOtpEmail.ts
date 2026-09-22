import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

/**
 * The `voter-otp` provider's `sendVerificationRequest`: looks up who the code
 * is for (see `prepareVoterOtpEmail`) and emails it through Brevo.
 *
 * Environment: BREVO_API_KEY, and EMAIL_FROM as "Name <address>" or a bare
 * address (a sender verified in Brevo).
 *
 * Convex Auth passes the action context as a second argument; the Auth.js
 * type doesn't declare it, hence the optional parameter.
 */
export const sendVoterOtpEmail = async (
  params: { identifier: string; token: string },
  ctx?: ActionCtx,
) => {
  if (!ctx) throw new Error("sendVoterOtpEmail needs the Convex action context.");

  const { to, fullName } = await ctx.runQuery(internal.voterOtp.prepareEmail, {
    matricKey: params.identifier,
  });

  const apiKey = process.env.BREVO_API_KEY;
  const from = parseSender(process.env.EMAIL_FROM);
  if (!apiKey || !from) {
    console.error("[voter-otp] BREVO_API_KEY or EMAIL_FROM is not set.");
    throw new ConvexError("Sign-in emails aren't set up yet. Please contact your association admin.");
  }

  const message = voterOtpMessage({ fullName, code: params.token });
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: from,
      to: [{ email: to, name: fullName }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
    }),
  });

  if (!response.ok) {
    console.error(`[voter-otp] Brevo returned ${response.status}: ${await response.text()}`);
    throw new ConvexError("We couldn't send the email just now. Please try again in a minute.");
  }
};

/** The GDG Babcock logo; email clients need an absolute URL. */
export const LOGO_URL = "https://www.babcockvotes.com/gdg-logo.png";

/** "Babcock Votes <votes@example.com>" -> { name, email }; a bare address works too. */
export const parseSender = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (!match) return { email: trimmed };
  const name = match[1].trim().replace(/^"|"$/g, "");
  return name ? { name, email: match[2].trim() } : { email: match[2].trim() };
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const voterOtpMessage = ({
  fullName,
  code,
  logoUrl = LOGO_URL,
}: {
  fullName: string;
  code: string;
  logoUrl?: string;
}) => {
  const subject = `Your Babcock Votes code: ${code}`;

  const text = [
    `Hello ${fullName},`,
    "",
    `Your Babcock Votes sign-in code is ${code}`,
    "",
    "Enter it on the login page. It works once and expires in 1 hour; requesting a new code cancels this one. If you didn't ask for it, you can ignore this email.",
    "",
    "Warm regards,",
    "The GDG Babcock Team",
  ].join("\n");

  const name = escapeHtml(fullName);
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e1d8;border-radius:4px;">
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 24px;font-size:24px;">Babcock Votes</h1>
          <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">Hello ${name},</p>
          <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">Your sign-in code is:</p>
          <p style="margin:0 0 24px;font-family:'Courier New',monospace;font-size:32px;font-weight:bold;letter-spacing:8px;">${escapeHtml(code)}</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5c584f;">Enter it on the login page. It works once and expires in 1 hour; requesting a new code cancels this one. If you didn't ask for it, you can ignore this email.</p>
          <p style="margin:24px 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">Warm regards,<br />The GDG Babcock Team</p>
          <img src="${escapeHtml(logoUrl)}" width="180" height="37" alt="Google Developer Group Babcock University" style="display:block;width:180px;max-width:100%;height:auto;margin:16px 0 0;border:0;" />
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

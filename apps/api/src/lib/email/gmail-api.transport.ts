import nodemailer from "nodemailer";
import type { EmailConfig } from "./email.config";
import { formatFromAddress } from "./email.config";
import type { MailTransport } from "./email.types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

interface OAuthTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Gmail REST API transport (HTTPS, port 443). Unlike SMTP it never touches the
 * blocked smtp.gmail.com TCP ports, so it works on hosts whose egress to those
 * ports is firewalled (e.g. free Render instances with Gmail blocking datacenter
 * SMTP). Auth is OAuth2 with a refresh token; the message is built with
 * nodemailer's jsonTransport (RFC822 MIME) and submitted as a base64url body.
 */
export function createGmailApiTransport(
  config: EmailConfig,
  logger: Pick<Console, "warn" | "error">,
): MailTransport {
  const { clientId, clientSecret, refreshToken } = config.oauth;
  let cached: CachedToken | null = null;

  async function getAccessToken(): Promise<string> {
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      throw new Error(`Gmail OAuth token request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as OAuthTokenResponse;
    if (!data.access_token) {
      throw new Error("Gmail OAuth token request returned no access_token");
    }

    cached = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return cached.accessToken;
  }

  return {
    async sendMail(payload) {
      // Build the RFC822 message with nodemailer (reuses templates + headers).
      const mailer = nodemailer.createTransport({ jsonTransport: true });
      const built = await mailer.sendMail({
        from: payload.from || formatFromAddress(config),
        to: payload.to,
        replyTo: payload.replyTo,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        headers: {
          "X-Auto-Response-Suppress": "OOF, AutoReply",
          "X-Mailer": "LifeOS",
        },
      });

      const raw = built.message;
      const base64 = Buffer.from(raw).toString("base64url");

      const accessToken = await getAccessToken();
      const res = await fetch(GMAIL_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: base64 }),
      });

      if (!res.ok) {
        logger.error(`[email] Gmail API send failed: ${res.status} ${await res.text()}`);
        throw new Error(`Gmail API send failed: ${res.status}`);
      }

      return res.json();
    },
  };
}

import { createTransport } from "nodemailer";
import { promises as dnsPromises } from "node:dns";
import { isIP } from "node:net";
import { createGmailApiTransport } from "../lib/email/gmail-api.transport";
import { loadEmailConfig, formatFromAddress } from "../lib/email/email.config";

/**
 * Email connectivity diagnostic.
 *
 * Run locally (or in an environment where you can reach the SMTP server):
 *   pnpm --filter @lifeos/api email:diagnose
 *
 * It uses the current EMAIL_* env vars. For `EMAIL_PROVIDER=smtp` it attempts a
 * raw SMTP connection + auth and reports the real error. For `gmail-api` it
 * exchanges the refresh token and verifies the Gmail REST endpoint.
 */
async function resolveIpv4(host: string): Promise<string> {
  if (isIP(host) === 4) return host;
  try {
    const addresses = await dnsPromises.resolve4(host);
    if (addresses.length > 0) return addresses[0]!;
  } catch {
    // fall through to the hostname
  }
  return host;
}

async function main() {
  const config = loadEmailConfig();
  const env = process.env;
  const hostname = config.host;
  const user = config.user;
  const from = config.fromAddress;

  console.log("=== Email diagnostic ===");
  console.log("EMAIL_ENABLED      :", env.EMAIL_ENABLED);
  console.log("EMAIL_PROVIDER     :", config.provider);
  if (config.provider === "gmail-api") {
    console.log("GOOGLE_OAUTH_USER  :", config.oauth.user);
    console.log("GOOGLE_OAUTH_CLIENT_ID:", config.oauth.clientId ? "<set>" : "<MISSING>");
    console.log("GOOGLE_OAUTH_CLIENT_SECRET:", config.oauth.clientSecret ? "<set>" : "<MISSING>");
    console.log("GOOGLE_OAUTH_REFRESH_TOKEN:", config.oauth.refreshToken ? "<set>" : "<MISSING>");
    console.log("WEB_URL            :", env.WEB_URL ?? "<unset -> localhost links!>");
    console.log();

    const transport = createGmailApiTransport(config, { warn: console.warn, error: console.error });
    try {
      await transport.sendMail({
        from: formatFromAddress(config),
        to: config.oauth.user,
        replyTo: config.replyTo,
        subject: "LifeOS email diagnostic",
        html: "<p>If you received this, the Gmail API transport works.</p>",
        text: "If you received this, the Gmail API transport works.",
      });
      console.log("\nGmail API send: OK ✅ — a test email was sent.");
      process.exit(0);
    } catch (error) {
      console.log("\nGmail API send: FAILED ❌");
      console.log(error);
      console.log(
        "\nInterpretation:",
        "\n  - 'Gmail OAuth token request failed: 400/401'  -> client id/secret/refresh token invalid.",
        "\n  - 'Gmail API send failed: 403'                 -> the OAuth scope is missing",
        "\n    (must include https://mail.google.com/).",
        "\n  - ENOTFOUND / network errors                    -> egress to api.gmail.com is blocked.",
      );
      process.exit(1);
    }
  }

  const host = await resolveIpv4(hostname);
  const port = config.port;
  const secure = config.secure;
  const pass = config.pass ? "<set>" : "<MISSING>";

  console.log("EMAIL_HOST         :", hostname);
  console.log("resolved IPv4      :", host === hostname ? "(same)" : host);
  console.log("EMAIL_PORT         :", port);
  console.log("EMAIL_SECURE       :", secure);
  console.log("EMAIL_USER         :", user);
  console.log("EMAIL_PASS         :", pass);
  console.log("EMAIL_FROM_ADDRESS :", from);
  console.log("WEB_URL            :", env.WEB_URL ?? "<unset -> localhost links!>");
  console.log();

  const transporter = createTransport({
    host,
    port,
    secure,
    servername: host === hostname ? undefined : hostname,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  } as Parameters<typeof createTransport>[0] & { servername?: string });

  try {
    const ok = await transporter.verify();
    console.log("\nSMTP verify: OK ✅ — server reachable and credentials accepted.");
    if (ok) process.exit(0);
  } catch (error) {
    console.log("\nSMTP verify: FAILED ❌");
    console.log(error);
    console.log(
      "\nInterpretation:",
      "\n  - ENETUNREACH / ETIMEDOUT / ECONNREFUSED at CONN  -> network/firewall between",
      "\n    this host and the SMTP server (datacenter IP blocked, no IPv6 route,",
      "\n    outbound port blocked). Consider EMAIL_PROVIDER=gmail-api (HTTPS).",
      "\n  - '535' / '534' / 'Invalid login'                   -> the app password is wrong",
      "\n    (create a new one at myaccount.google.com > Security > App passwords).",
      "\n  - 'self-signed' / 'certificate'                     -> TLS trust issue.",
      "\n  - 'greeting' / '220' never received                  -> server unreachable (timeout).",
    );
    process.exit(1);
  }
}

main();

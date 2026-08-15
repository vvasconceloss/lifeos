import { createTransport } from "nodemailer";
import { promises as dnsPromises } from "node:dns";
import { isIP } from "node:net";

/**
 * Email connectivity diagnostic.
 *
 * Run locally (or in an environment where you can reach the SMTP server):
 *   pnpm --filter @lifeos/api email:diagnose
 *
 * It prints the resolved host/IPs, attempts a raw SMTP connection + auth using
 * the current EMAIL_* env vars, and reports the real error — distinguishing a
 * network/firewall timeout (ENETUNREACH / ETIMEDOUT) from a credentials error
 * (535/534) or a TLS problem. Like the runtime transport, it resolves the host
 * to an IPv4 literal and passes it as `host` (nodemailer skips its own DNS,
 * which otherwise tries IPv6 first and fails on hosts without an IPv6 route).
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
  const env = process.env;
  const hostname = env.EMAIL_HOST ?? "smtp.gmail.com";
  const host = await resolveIpv4(hostname);
  const port = Number(env.EMAIL_PORT ?? 465);
  const secure = (env.EMAIL_SECURE ?? "true").toLowerCase() !== "false";
  const user = env.EMAIL_USER ?? "";
  const pass = env.EMAIL_PASS ? "<set>" : "<MISSING>";
  const from = env.EMAIL_FROM_ADDRESS ?? env.EMAIL_USER ?? "";

  console.log("=== Email diagnostic ===");
  console.log("EMAIL_ENABLED      :", env.EMAIL_ENABLED);
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
      "\n    outbound port blocked). The runtime already forces IPv4 and falls back to",
      "\n    port 587; if this still fails the egress to Gmail is blocked entirely.",
      "\n  - '535' / '534' / 'Invalid login'                   -> the app password is wrong",
      "\n    (create a new one at myaccount.google.com > Security > App passwords).",
      "\n  - 'self-signed' / 'certificate'                     -> TLS trust issue.",
      "\n  - 'greeting' / '220' never received                  -> server unreachable (timeout).",
    );
    process.exit(1);
  }
}

main();

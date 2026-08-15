import { createTransport } from "nodemailer";
import { lookup as dnsLookup } from "node:dns";
import type { LookupFunction } from "net";

const ipv4Lookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...(typeof options === "object" ? options : {}), family: 4 }, callback);
};

/**
 * Email connectivity diagnostic.
 *
 * Run inside the Render shell (or locally) to see exactly why a send fails:
 *   pnpm tsx apps/api/src/scripts/email-diagnose.ts
 *
 * It prints the resolved host/IPs, attempts a raw SMTP connection + auth using
 * the current EMAIL_* env vars, and reports the real error — distinguishing a
 * network/firewall timeout (ENETUNREACH / ETIMEDOUT) from a credentials error
 * (535/534) or a TLS problem.
 */
async function main() {
  const env = process.env;
  const host = env.EMAIL_HOST ?? "smtp.gmail.com";
  const port = Number(env.EMAIL_PORT ?? 465);
  const secure = (env.EMAIL_SECURE ?? "true").toLowerCase() !== "false";
  const user = env.EMAIL_USER ?? "";
  const pass = env.EMAIL_PASS ? "<set>" : "<MISSING>";
  const from = env.EMAIL_FROM_ADDRESS ?? env.EMAIL_USER ?? "";

  console.log("=== Email diagnostic ===");
  console.log("EMAIL_ENABLED      :", env.EMAIL_ENABLED);
  console.log("EMAIL_HOST         :", host);
  console.log("EMAIL_PORT         :", port);
  console.log("EMAIL_SECURE       :", secure);
  console.log("EMAIL_USER         :", user);
  console.log("EMAIL_PASS         :", pass);
  console.log("EMAIL_FROM_ADDRESS :", from);
  console.log("WEB_URL            :", env.WEB_URL ?? "<unset -> localhost links!>");
  console.log();

  const dns = await import("node:dns");
  await new Promise<void>((resolve) => {
    dns.resolve4(host, (err, addrs) => {
      console.log(`DNS A records for ${host}:`, err ? err.message : addrs);
      resolve();
    });
  });

  const transporter = createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    lookup: ipv4Lookup,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  } as Parameters<typeof createTransport>[0] & { lookup: LookupFunction });

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
      "\n    this host and smtp.gmail.com (datacenter IP blocked, IPv6 route missing,",
      "\n    outbound port 465/587 blocked). Try port 587 (EMAIL_PORT=587, EMAIL_SECURE=false).",
      "\n  - '535' / '534' / 'Invalid login'                   -> the app password is wrong",
      "\n    (create a new one at myaccount.google.com > Security > App passwords).",
      "\n  - 'self-signed' / 'certificate'                     -> TLS trust issue.",
      "\n  - 'greeting' / '220' never received                  -> server unreachable (timeout).",
    );
    process.exit(1);
  }
}

main();

import { describe, expect, it, vi } from "vitest";
import { loadEmailConfig, formatFromAddress } from "./email.config";
import { createEmailService } from "./email.service";
import { renderEmail } from "./email.templates";
import type { EmailConfig } from "./email.config";
import type { MailTransport } from "./email.types";

function makeConfig(overrides: Partial<EmailConfig> = {}): EmailConfig {
  return {
    enabled: false,
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    user: "noreplylifeos.focus@gmail.com",
    pass: "app-password",
    fromName: "LifeOS",
    fromAddress: "noreplylifeos.focus@gmail.com",
    replyTo: "noreplylifeos.focus+support@gmail.com",
    ...overrides,
  };
}

type SendMailFn = MailTransport["sendMail"];

function makeTransport() {
  const sendMail = vi.fn<SendMailFn>().mockResolvedValue({ messageId: "test-id" });
  const transport: MailTransport = { sendMail };
  return { sendMail, transport };
}

describe("loadEmailConfig", () => {
  it("defaults to dry-run (disabled) with Gmail SMTP defaults", () => {
    const config = loadEmailConfig({});
    expect(config.enabled).toBe(false);
    expect(config.host).toBe("smtp.gmail.com");
    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
    expect(config.fromName).toBe("LifeOS");
  });

  it("reads the documented EMAIL_* variables", () => {
    const config = loadEmailConfig({
      EMAIL_ENABLED: "true",
      EMAIL_HOST: "smtp.example.com",
      EMAIL_PORT: "587",
      EMAIL_SECURE: "false",
      EMAIL_USER: "user@example.com",
      EMAIL_PASS: "secret",
      EMAIL_FROM_NAME: "LifeOS Test",
      EMAIL_FROM_ADDRESS: "noreply@example.com",
      EMAIL_REPLY_TO: "support@example.com",
    });
    expect(config).toMatchObject({
      enabled: true,
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "user@example.com",
      pass: "secret",
      fromName: "LifeOS Test",
      fromAddress: "noreply@example.com",
      replyTo: "support@example.com",
    });
  });

  it("formats the From header with the display name", () => {
    const config = makeConfig();
    expect(formatFromAddress(config)).toBe(
      'LifeOS <noreplylifeos.focus@gmail.com>',
    );
  });
});

describe("renderEmail", () => {
  it("renders every supported template with subject, html and plain text", () => {
    const data = {
      verificationUrl: "https://lifeos.app/verify?token=abc",
      resetUrl: "https://lifeos.app/reset?token=abc",
      confirmUrl: "https://lifeos.app/confirm?token=abc",
      cancelUrl: "https://lifeos.app/cancel?token=abc",
      recoveryUrl: "https://lifeos.app/recover?token=abc",
      deletionDate: "2026-08-30",
    };
    const templates = [
      "verify-email",
      "password-reset",
      "password-changed",
      "email-change-request",
      "email-change-alert",
      "account-deletion-requested",
      "account-deletion-reminder",
      "account-deleted",
    ] as const;

    for (const template of templates) {
      const rendered = renderEmail(template, data);
      expect(rendered.subject.length).toBeGreaterThan(0);
      expect(rendered.html).toContain("LifeOS");
      expect(rendered.html).toContain("<!DOCTYPE html>");
      expect(rendered.text.length).toBeGreaterThan(0);
    }
  });

  it("uses the brand design: title, blue CTA, clean footer and a breakable fallback link", () => {
    const rendered = renderEmail("verify-email", {
      verificationUrl: "https://lifeos.app/verify?token=abc",
    });
    // The header shows the brand name as text (no image) — safe in every client.
    expect(rendered.html).toContain(">LifeOS</span>");
    expect(rendered.html).not.toContain("<img");
    expect(rendered.html).not.toContain('background-color:#111827');
    // Neutral light-grey page background.
    expect(rendered.html).toContain('background-color:#f8f9fa');
    // Blue brand CTA with white text and rounded corners.
    expect(rendered.html).toContain('background-color:#6366f1;color:#ffffff');
    expect(rendered.html).toContain('border-radius:6px');
    // The long link is wrapped to not break the layout.
    expect(rendered.html).toContain("word-break:break-all");
    // Natural, human title without the "— LifeOS" suffix.
    expect(rendered.html).toContain("Confirm your email address");
    expect(rendered.html).not.toContain("Confirm your email address — LifeOS");
    // Clean footer: privacy + support links, no repeated project URL.
    expect(rendered.html).toContain("Privacy Policy");
    expect(rendered.html).toContain("Support");
    expect(rendered.html).not.toContain("LifeOS · <a");
  });

  it("escapes HTML in interpolated values", () => {
    const rendered = renderEmail("verify-email", {
      verificationUrl: 'https://lifeos.app/verify?token=<script>',
    });
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
  });

  it("renders in the requested locale (pt/uk) with the correct lang attribute", () => {
    const pt = renderEmail("account-deletion-requested", {
      recoveryUrl: "https://lifeos.app/recover?token=abc",
      deletionDate: "2026-08-30",
    }, "pt");
    expect(pt.subject).toBe("A sua conta será eliminada");
    expect(pt.html).toContain('lang="pt"');
    expect(pt.html).toContain("eliminação permanente em 2026-08-30");
    expect(pt.html).toContain("Manter a minha conta");

    const uk = renderEmail("account-recovered", {}, "uk");
    expect(uk.subject).toBe("Ваш акаунт відновлено");
    expect(uk.html).toContain('lang="uk"');
    expect(uk.text).toContain("ласкаво просимо назад");

    // Unknown/unsupported locales fall back to English.
    const fallback = renderEmail("verify-email", {
      verificationUrl: "https://lifeos.app/verify?token=abc",
    }, "fr-FR");
    expect(fallback.subject).toBe("Confirm your email address");
    expect(fallback.html).toContain('lang="en"');
  });

  it("passes the locale through the service to the rendered email", async () => {
    const { sendMail, transport } = makeTransport();
    const service = createEmailService({
      config: makeConfig({ enabled: true }),
      transport,
      logger: { warn: vi.fn(), error: vi.fn() },
    });

    await service.send({
      to: "user@example.com",
      template: "password-reset",
      data: { resetUrl: "https://lifeos.app/reset?token=abc" },
      locale: "pt",
    });

    const payload = sendMail.mock.calls[0]![0];
    expect(payload.subject).toBe("Repor a sua palavra-passe");
    expect(payload.html).toContain('lang="pt"');
  });
});

describe("EmailService.send", () => {
  it("does not contact the transport when disabled (dry-run)", async () => {
    const { sendMail, transport } = makeTransport();
    const service = createEmailService({
      config: makeConfig({ enabled: false }),
      transport,
      logger: { warn: vi.fn(), error: vi.fn() },
    });

    await service.send({
      to: "user@example.com",
      template: "verify-email",
      data: { verificationUrl: "https://lifeos.app/verify?token=abc" },
    });

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends with the configured from/reply-to when enabled", async () => {
    const { sendMail, transport } = makeTransport();
    const service = createEmailService({
      config: makeConfig({ enabled: true }),
      transport,
      logger: { warn: vi.fn(), error: vi.fn() },
    });

    await service.send({
      to: "user@example.com",
      template: "password-reset",
      data: { resetUrl: "https://lifeos.app/reset?token=abc" },
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const payload = sendMail.mock.calls[0]![0];
    expect(payload.from).toBe("LifeOS <noreplylifeos.focus@gmail.com>");
    expect(payload.to).toBe("user@example.com");
    expect(payload.replyTo).toBe("noreplylifeos.focus+support@gmail.com");
    expect(payload.subject).toContain("Reset your password");
    expect(payload.html).toContain("LifeOS");
  });

  it("retries once on a transient failure and succeeds", async () => {
    const { sendMail, transport } = makeTransport();
    sendMail
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValueOnce({ messageId: "test-id" });
    const logger = { warn: vi.fn(), error: vi.fn() };
    const service = createEmailService({
      config: makeConfig({ enabled: true }),
      transport,
      logger,
      maxAttempts: 2,
      retryDelayMs: 1,
    });

    await service.send({
      to: "user@example.com",
      template: "password-changed",
      data: {},
    });

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("gives up after the retry limit and rethrows without logging the payload", async () => {
    const { sendMail, transport } = makeTransport();
    sendMail.mockRejectedValue(new Error("smtp down"));
    const logger = { warn: vi.fn(), error: vi.fn() };
    const service = createEmailService({
      config: makeConfig({ enabled: true }),
      transport,
      logger,
      maxAttempts: 2,
      retryDelayMs: 1,
    });

    await expect(
      service.send({
        to: "user@example.com",
        template: "email-change-request",
        data: { confirmUrl: "https://lifeos.app/confirm?token=SUPER_SECRET" },
      }),
    ).rejects.toThrow("smtp down");

    expect(sendMail).toHaveBeenCalledTimes(2);
    const allLogs = [...logger.warn.mock.calls, ...logger.error.mock.calls]
      .map((args) => args.join(" "))
      .join(" ");
    expect(allLogs).not.toContain("SUPER_SECRET");
    expect(allLogs).not.toContain("confirm?token");
  });

  it("throws when enabled but no sender address is configured", async () => {
    const { sendMail, transport } = makeTransport();
    const service = createEmailService({
      config: makeConfig({ enabled: true, fromAddress: "" }),
      transport,
    });

    await expect(
      service.send({ to: "user@example.com", template: "verify-email", data: {} }),
    ).rejects.toThrow("EMAIL_FROM_ADDRESS");
    expect(sendMail).not.toHaveBeenCalled();
  });
});

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

  it("escapes HTML in interpolated values", () => {
    const rendered = renderEmail("verify-email", {
      verificationUrl: 'https://lifeos.app/verify?token=<script>',
    });
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
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

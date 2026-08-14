// Tests must never send real emails. Force the email service into dry-run mode
// regardless of any local .env settings (EMAIL_ENABLED=true).
process.env.EMAIL_ENABLED = "false";

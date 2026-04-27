// Email sending stub.
//
// PHASE 3 NOTE: This is a stub. When the Porkbun-managed sender domain is
// verified, replace the body of `sendMail` with a call to
// `send-transactional-email` using the registered template names below.
//
// Template registry (planned):
//   - "event-verification"  → params: { siteUrl, verifyUrl, eventTitle }
//   - "event-published"     → params: { siteUrl, manageUrl, eventTitle }
//   - "event-renewal"       → params: { siteUrl, renewUrl, eventTitle, expiresAt }
//   - "event-removed"       → params: { siteUrl, eventTitle, reason }

export type StubEmail = {
  to: string;
  template: string;
  data: Record<string, unknown>;
};

export async function sendMail(email: StubEmail): Promise<void> {
  // SECURITY: Do NOT log the full email payload — `data` contains
  // verification and manage URLs that embed secret tokens. Anyone with
  // access to edge function logs would otherwise be able to publish or
  // edit events. Log only non-sensitive metadata.
  console.log("[email-stub] queued", { to: email.to, template: email.template });
}

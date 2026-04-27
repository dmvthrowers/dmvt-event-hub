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
  // For now, log so admins/devs can copy verification URLs from edge logs.
  console.log("[email-stub] →", JSON.stringify(email, null, 2));
}

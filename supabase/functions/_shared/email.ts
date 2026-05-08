// Transactional email via Resend (https://resend.com).
//
// Set the RESEND_API_KEY secret on your Supabase edge functions.
// Set the RESEND_FROM env var to override the sender (default: events@dmvthrowers.club).
//
// Template registry:
//   "event-verification"         → { siteUrl, verifyUrl, eventTitle }
//   "event-published"            → { siteUrl, manageUrl, eventTitle }
//   "event-renewal"              → { siteUrl, renewUrl, eventTitle, expiresAt }
//   "event-removed"              → { siteUrl, eventTitle, reason }
//   "feed-subscription-created"  → { ics_url, manage_url }
//   "feed-manage-link"           → { manage_url }

const RESEND_URL = "https://api.resend.com/emails";

export type MailPayload = {
  to: string;
  template: string;
  data: Record<string, unknown>;
};

type Template = {
  subject: string;
  html: (data: Record<string, unknown>) => string;
};

const TEMPLATES: Record<string, Template> = {
  "event-verification": {
    subject: "Verify your DMV Yoyo event",
    html: (d) => `
      <p>Thanks for submitting <strong>${d.eventTitle}</strong>!</p>
      <p>Click below to verify your email and publish your event:</p>
      <p><a href="${d.verifyUrl}" style="background:#1a3a5c;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;border-radius:4px;">Verify &amp; Publish Event</a></p>
      <p>This link expires in 24 hours.</p>
      <p style="color:#666;font-size:12px;">If you didn't submit an event, you can ignore this email.</p>
      <p style="color:#666;font-size:12px;"><a href="${d.siteUrl}">${d.siteUrl}</a></p>
    `,
  },
  "event-published": {
    subject: "Your event is live on DMV Yoyo Events",
    html: (d) => `
      <p><strong>${d.eventTitle}</strong> is now published!</p>
      <p>Use the link below to manage, edit, or cancel your event at any time:</p>
      <p><a href="${d.manageUrl}" style="background:#1a3a5c;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;border-radius:4px;">Manage Your Event</a></p>
      <p style="color:#666;font-size:12px;">Save this link — it's your key to editing the event later.</p>
      <p style="color:#666;font-size:12px;"><a href="${d.siteUrl}">${d.siteUrl}</a></p>
    `,
  },
  "event-renewal": {
    subject: "Your DMV Yoyo event is expiring soon",
    html: (d) => `
      <p><strong>${d.eventTitle}</strong> expires on ${d.expiresAt}.</p>
      <p>Click below to renew it for another year — one click, no login required:</p>
      <p><a href="${d.renewUrl}" style="background:#1a3a5c;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;border-radius:4px;">Renew Event</a></p>
      <p style="color:#666;font-size:12px;">If you no longer want your event listed, simply ignore this email and it will be hidden automatically after expiry.</p>
      <p style="color:#666;font-size:12px;"><a href="${d.siteUrl}">${d.siteUrl}</a></p>
    `,
  },
  "event-removed": {
    subject: "Your DMV Yoyo event has been removed",
    html: (d) => `
      <p><strong>${d.eventTitle}</strong> has been removed from DMV Yoyo Events.</p>
      ${d.reason ? `<p>Reason: ${d.reason}</p>` : ""}
      <p>If you have questions, reply to this email.</p>
      <p style="color:#666;font-size:12px;"><a href="${d.siteUrl}">${d.siteUrl}</a></p>
    `,
  },
  "feed-subscription-created": {
    subject: "Your DMV Yoyo Events feed is ready",
    html: (d) => `
      <p>Your calendar feed subscription is set up!</p>
      <p>Add it to your calendar app using this link:</p>
      <p><a href="${d.ics_url}">${d.ics_url}</a></p>
      <p>Manage or cancel your subscription:</p>
      <p><a href="${d.manage_url}">${d.manage_url}</a></p>
    `,
  },
  "feed-manage-link": {
    subject: "Manage your DMV Yoyo Events feed subscriptions",
    html: (d) => `
      <p>Here's your link to manage your feed subscriptions:</p>
      <p><a href="${d.manage_url}" style="background:#1a3a5c;color:#fff;padding:12px 24px;text-decoration:none;display:inline-block;border-radius:4px;">Manage Subscriptions</a></p>
      <p style="color:#666;font-size:12px;">This link expires in 1 hour.</p>
    `,
  },
};

export async function sendMail(payload: MailPayload): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    // In dev/staging without a key, fall back to logging only.
    console.warn("[email] RESEND_API_KEY not set — skipping send", {
      to: payload.to,
      template: payload.template,
    });
    return;
  }

  const tpl = TEMPLATES[payload.template];
  if (!tpl) {
    console.error("[email] unknown template", payload.template);
    return;
  }

  const from =
    Deno.env.get("RESEND_FROM") ?? "DMV Yoyo Events <events@dmvthrowers.club>";

  // SECURITY: Do NOT log payload.data — it may contain secret tokens.
  console.log("[email] sending", { to: payload.to, template: payload.template });

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: tpl.subject,
      html: tpl.html(payload.data),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}
